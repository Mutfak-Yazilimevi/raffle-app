# PRD-04 — Şeffaflık Sertifikası (Adil Çekiliş Belgesi)

> Durum: Taslak · 2026-06-13  
> Öncelik: P1 (Top 5 #4)

---

## Problem

Büyük çekilişlerin ardından takipçiler "kazanan gerçek mi, ada çekilişi sahte miydi?" sorusunu soruyor. Organizatörlerin elinde paylaşabilecekleri nesnel bir kanıt yok. Rakip araçların büyük çoğunluğunda da bu belge yok; bu alan farklılaşma için açık.

---

## Hedef Kullanıcı

- **Birincil:** Takipçilerinin güvenini kazanmak isteyen marka yöneticisi  
- **İkincil:** Çekilişin adil yapıldığını ispatlaması gereken (sektörel uyum, şikâyet durumu) organizatör

---

## Kullanıcı Hikayeleri

| ID | Hikaye | Kabul Kriteri |
|----|--------|---------------|
| US-1 | Çekiliş bittikten sonra bir "sertifika" indirmek istiyorum | "Sertifika İndir" butonu `RaffleResults.jsx`'te görünür; HTML dosya indirilir |
| US-2 | Sertifikayı Instagram story olarak da paylaşmak istiyorum | Story boyutunda (1080×1920) sertifika görsel versiyonu opsiyonel |
| US-3 | Sertifikada çekilişin tüm kurallarını görmek istiyorum | Uygulanan kural seti tam olarak listelenir (getRulesSummaryLines kullanılarak) |
| US-4 | Sertifikada kazananların @kullanıcı adlarını görmek istiyorum | Tüm kazananlar ve yedekleri listelenir |
| US-5 | Sertifika kendiliğinden güvenilir görünsün | Zaman damgası, toplam katılımcı sayısı ve çekiliş yöntemi dahil |

---

## Fonksiyonel Gereksinimler

### F-1 · Sertifika İçeriği

```
─────────────────────────────────────────────
  MutfakRaffleStudio
  Şeffaflık Sertifikası

  Çekiliş: [brand.raffleName]
  Marka / Organizatör: [brand.name]
  Gönderi: [brand.postUrl]
  Tarih: [drawResults.completedAt — kullanıcının saat dilimiyle formatlanmış]

  Katılım İstatistikleri
  ─────────────────────
  Toplam yorum sayısı    : [N]
  Geçerli katılımcı sayısı: [ticketsPool.length veya uniqueWinnerCount]
  Uygulanan kurallar     :
    • [getRulesSummaryLines() çıktısı, satır satır]

  Çekiliş Yöntemi
  ─────────────────────
  Rastgele seçim (tarayıcı tabanlı, sunucu dışı)
  [Eğer crypto seed kaydedilmişse: Seed: 0xABCDEF...]

  Kazananlar
  ─────────────────────
  Ödül 1 — [prize.name]
    1. Asil: @[winner.username]
    Yedek: @[sub1.username], @[sub2.username]

  Ödül 2 — [prize.name]
    ...

  ─────────────────────
  Bu belge MutfakRaffleStudio tarafından oluşturulmuştur.
  Tüm veriler organizatörün tarayıcısında yerel olarak işlenmiştir.
  mutfak-yazilimevi.github.io/raffle-app
─────────────────────────────────────────────
```

### F-2 · Çıktı Formatları

**HTML (birincil):**  
- Tarayıcıda `Blob` + `URL.createObjectURL` ile indirilir  
- `certificate_[raffleName]_[date].html` ismiyle kaydedilir  
- Tek dosya — harici CSS/font bağımlılığı yok (inline style)  
- Marka logosunu `base64` olarak gömer (IndexedDB'den çekilir)  
- Yazdırılabilir (print-friendly CSS — `@media print`)

**PNG / Story (opsiyonel — v2):**  
- Mevcut `storyCanvas.js` alt yapısı kullanılarak 1080×1920 canvas oluşturulur  
- Canvas API ile yukarıdaki içerik render edilir ve PNG olarak indirilir  

> v1 kapsamı yalnızca HTML. Story görsel exportu v2'ye ertelenir.

### F-3 · UI Entegrasyonu

**`RaffleResults.jsx`'e ekleme:**
```
[Sonuçları CSV İndir]  [Sertifika İndir]  [Anasayfa]
```
Sertifika butonu çekiliş tamamlandığında aktif olur; `drawResults` null ise disabled.

**`RaffleAnnouncement.jsx` (duyuru listesi):**  
Tamamlanan çekilişlerde "Sertifika" butonu opsiyonel olarak gösterilir — yalnızca drawResults mevcutsa.

### F-4 · Sertifika Üretim Fonksiyonu

```js
// src/utils/generateCertificate.js

export function generateCertificateHtml({
  brand,
  prizes,
  rules,
  drawResults,     // { winners, substitutes, completedAt }
  participantCount,
  commentCount,
}) { ... }

export function downloadCertificate(options) {
  const html = generateCertificateHtml(options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  // ... URL.createObjectURL download
}
```

`generateCertificateHtml` saf fonksiyon (pure) — DOM'a dokunmaz, test edilebilir.

### F-5 · Veri Kaynakları

| Veri | Kaynak |
|------|--------|
| brand, prizes, rules | `loadSetupState(activeRaffleId)` |
| drawResults (winners, completedAt) | `loadDrawResults(activeRaffleId)` → `setupStorage.js:221` |
| participantCount | `form.ticketsPool.length` veya `form.participantStats.length` |
| commentCount | `form.comments.length` |
| logoBase64 | IndexedDB'den `idbGet(imageLogoKey(raffleId))` |

### F-6 · Şeffaflık Güvencesi Metni

HTML'de sabit metin (Türkçe ve İngilizce):

> "Bu çekiliş MutfakRaffleStudio ile gerçekleştirilmiştir. Kazananlar organizatörün tarayıcısında rastgele seçilmiştir; hiçbir katılımcı verisi üçüncü taraf sunuculara iletilmemiştir."

---

## Kapsam Dışı

- Blockchain / değişmez kayıt (v2+ fikir)
- Sertifikayı Anthropic veya üçüncü taraf ile imzalatma
- QR kod ile doğrulama
- Çekiliş öncesi "taslak kural sertifikası" (yalnızca tamamlanan çekilişler)

---

## Teknik Notlar

| Bileşen | Dosya | Not |
|---------|-------|-----|
| Çekiliş sonuçları şeması | `src/utils/setupStorage.js:229–242` | `{ winners, substitutes, completedAt }` |
| Kural özeti | `src/utils/raffleConfigFile.js:109` | `getRulesSummaryLines()` — sertifikada doğrudan kullanılır |
| Logo yükleme | `src/utils/setupStorage.js:254+` | IndexedDB'den async — sertifika üretimi async olmalı |
| Mevcut CSV download deseni | `src/components/RaffleResults.jsx:116–137` | Aynı Blob + anchor download deseni |

---

## Başarı Metrikleri

- Sertifika indirme oranı (tamamlanan çekiliş / indirilen sertifika)
- "MutfakRaffleStudio" mention'ı içeren sosyal medya paylaşım sayısı (organik büyüme göstergesi)
- Destek talebi: "çekilişin adil olduğunu nasıl kanıtlarım?" sorusu sayısı

---

## Açık Sorular

1. Logo sertifikaya dahil edilmeli mi? (Bazı markalar kendi logolarının başka dosyada görünmesini istemeyebilir)
2. Sertifika üretimi async (IndexedDB logo fetch) — yükleme spinnerı gösterilmeli mi yoksa logo opsiyonel tutulmalı mı?
3. Kazanan listesi tam @username içermeli mi yoksa kısaltılmış (@u*** şeklinde gizleme opsiyonu) mı?
4. "Seed" kayıt özelliği (PRD-02'de E-2 olarak geçen deterministik seed) bu PRD'ye dahil edilmeli mi, yoksa ayrı bir iş kalemi mi?
