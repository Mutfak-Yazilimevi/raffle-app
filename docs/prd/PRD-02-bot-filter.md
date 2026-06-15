# PRD-02 — Bot / Şüpheli Hesap Tespit Filtresi

> Durum: Taslak · 2026-06-13  
> Öncelik: P1 (Top 5 #2)

---

## Problem

Instagram çekilişleri bot saldırısına açık: otomatik hesaplar aynı metni düzinelerce kopyalar, saniyeler içinde yüzlerce yorum yapar. Mevcut uygulama yalnızca `userBlacklist` ile manuel engelleme destekliyor. "Bu kişi gerçek mi?" sorusuna araç cevap veremiyor; büyük markalarda organizatör her kazananı elle kontrol etmek zorunda kalıyor.

---

## Hedef Kullanıcı

- **Birincil:** 500+ yorum alan çekilişi yöneten marka yöneticisi  
- **İkincil:** Bot riski olan çekilişleri denetleyen ajans yöneticisi

---

## Kullanıcı Hikayeleri

| ID | Hikaye | Kabul Kriteri |
|----|--------|---------------|
| US-1 | Katılımcı tablosunda hangi hesapların şüpheli olduğunu görmek istiyorum | Her şüpheli satır sarı/turuncu arka planla işaretlenir, tooltip ile gerekçe gösterilir |
| US-2 | Şüpheli hesapları tek tıkla kara listeye eklemek istiyorum | "Şüphelileri engelle" butonu seçilen hesapları `userBlacklist`'e ekler |
| US-3 | Şüphelilik eşiğini kendim ayarlamak istiyorum | Eşik slider'ı (düşük / orta / yüksek hassasiyet) veya yalnızca "yüksek risk" filtresi |
| US-4 | Şüpheli olarak işaretlenen ama aslında gerçek olan hesabı temizlemek istiyorum | Satır üzerinde "Şüpheyi kaldır" aksiyonu; bu kullanıcı o oturum için temiz sayılır |

---

## Fonksiyonel Gereksinimler

### F-1 · Şüphelilik Sinyal Seti

Aşağıdaki sinyaller `scoreSuspiciousness(userData, allComments)` fonksiyonuyla hesaplanır. Her sinyal 0–1 arası ağırlıklı puan üretir; toplam puan eşiği aşarsa hesap şüpheli sayılır.

| Sinyal | Veri kaynağı | Ağırlık |
|--------|-------------|---------|
| **Kopya yorum** — aynı text birden fazla kullanıcıda (≥3 kişi aynı metni kullandıysa) | `allComments` grubu, metin normalize edilerek karşılaştırılır | 0.40 |
| **Kendi kendini tekrar** — kullanıcının yorumları %80+ benzer | `userData.comments` içinde Levenshtein benzeri basit normalize fark | 0.25 |
| **Aşırı yorum hızı** — tek kullanıcıdan 60 saniye içinde 5+ yorum | `comment.timestamp` (eğer varsa) veya import sırası yakınlığı | 0.20 |
| **Sadece etiket yorumu** — yorum yalnızca @mention içeriyor, başka içerik yok | `userData.comments` — hepsinde `text.replace(/@\S+/g,'').trim() === ''` | 0.15 |

> **Timestamp uyarısı:** Yorum timestamp'i yalnızca eklenti network request yakalama modunda mevcut; embed/raw metin içe aktarmasında olmayabilir. Sinyal eksik veri ile atlanır, skor düşürülmez.

### F-2 · Eşik Seviyeleri

```
Düşük hassasiyet  (threshold ≥ 0.70): Yalnızca kesin bot örüntüleri
Orta hassasiyet   (threshold ≥ 0.45): Varsayılan — çoğu spam yakalar, yanlış pozitif az
Yüksek hassasiyet (threshold ≥ 0.25): Tüm şüphelileri işaretle
```

Kullanıcı eşiği "Katılımcı Özeti" bölümüne eklenen bir dropdown/segment kontrolden seçer.

### F-3 · UI Entegrasyonu

**Katılımcı tablosunda:**
- Şüpheli satırlar sarı sol border veya arka plan tonu alır
- Yeni sütun `Şüphe` eklenmez; bunun yerine mevcut `username` hücresine küçük uyarı ikonu eklenir
- Hover/tooltip ile sinyaller listelenir: "Kopya yorum · Sadece etiket"
- Tablo başlığına filtre butonu: "Yalnızca şüphelileri göster"

**Toplu aksiyon:**
- Tablo altına "Şüpheli hesapları engelle (N kişi)" butonu → `userBlacklist`'e append eder
- Bilet havuzu yeniden hesaplanır (`ticketsPool` useMemo zaten `userBlacklist`'e bağlı)

### F-4 · Beyaz Liste (Override)

Kullanıcı bir satırdaki şüpheyi elle kaldırabilir. Bu override session state'inde tutulur (localStorage'a yazılmaz); sayfa yenilenince temizlenir.

### F-5 · Yeni Util Fonksiyonu

```js
// src/utils/botDetection.js
export function scoreSuspiciousness(userData, allUserData, threshold = 0.45) { ... }
export function flagSuspiciousParticipants(allUserData, threshold) { ... }
```

`flagSuspiciousParticipants` `participantStats` useMemo'nun sonrasında çağrılır; mevcut hesaplama değişmez.

---

## Kapsam Dışı

- Hesap profil verisi çekme (takipçi sayısı, hesap yaşı) — Instagram API kısıtlamaları
- ML modeli — basit kural tabanlı skor yeterli
- Şüphelilik geçmişini çekiliş kayıtlarına yazma

---

## Teknik Notlar

| Bileşen | Dosya | Not |
|---------|-------|-----|
| Katılımcı verisi | `src/hooks/useRaffleForm.js:400–459` | `participantStats` useMemo — bu çıktıya `suspiciousScore` eklenir |
| Kara liste entegrasyonu | `src/utils/participantCriteriaSummary.js:240–242` | `isUserBlacklisted()` zaten var; "engelle" aksiyonu `setUserBlacklist` çağırır |
| Tablo | `src/components/RaffleCommentsStep.jsx` | Şüphe ikonu ve filtresi buraya eklenir |
| Yorum metin erişimi | `userData.comments[]` (`aggregateParticipantsFromComments` çıktısı) | Tüm ham yorum metinleri mevcut |

---

## Başarı Metrikleri

- Büyük çekilişlerde (500+ yorum) şüpheli hesap tespit oranı (kullanıcı röportajı ile doğrulama)
- Toplu engelleme kullanım oranı (kaç organizatör "Şüphelileri engelle" kullandı)
- Yanlış pozitif şikâyeti yok (manuel override kullanım oranı)

---

## Açık Sorular

1. Kopya yorum eşiği kaç kullanıcı olmalı? (3 kullanıcı aynı metni kullandıysa mı, 5 mi?)
2. Eşik kontrolü "Katılımcı Özeti" sayfasında mı, yoksa kural ayarlarında mı?
3. Bot riski olan hesapları otomatik elemeli mi yoksa sadece işaretlemeli mi? (Öneri: yalnızca işaretlemeli — organizatör kararı)
