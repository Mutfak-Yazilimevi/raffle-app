# PRD-01 — Rehberli Kurulum Sihirbazı

> Durum: Tamamlandı · 2026-06-15  
> Öncelik: P1 (Top 5 #1)

---

## Problem

`RaffleConfigStep.jsx` içindeki config formu 20'den fazla alan barındırıyor: marka bilgileri, ödüller, katılım yöntemi, etiket kuralları, anahtar kelime, takip hesapları, beğeni/kaydetme/hikaye/yaş/hesap tipi kriterleri, story arka planı. Yeni kullanıcı için hangi alanların zorunlu olduğu belli değil; kural kombinasyonları birbirini etkiliyor (örn. `weightedEntry` yalnızca `requireMentionRule = true` iken anlamlı). Sonuç: yeni kullanıcı aktivasyonu yavaş, destek talebi yüksek.

---

## Hedef Kullanıcı

- **Birincil:** Instagram çekilişi yapan marka/sosyal medya yöneticisi, ilk kez kullanıyor  
- **İkincil:** Aynı kuralları her ay tekrarlayan deneyimli organizatör (hızlı geçiş ister)

---

## Kullanıcı Hikayeleri

| ID | Hikaye | Kabul Kriteri |
|----|--------|---------------|
| US-1 | Yeni organizatör olarak adım adım yönlendirilmek istiyorum, böylece hangi kuralı neden seçtiğimi anlıyorum | Her adımda sadece o adıma ait alanlar görünür; yardım metni bağlamsal |
| US-2 | Deneyimli kullanıcı olarak sihirbazı atlayıp doğrudan forma geçmek istiyorum | "Uzman modu" / "Tümünü göster" linki her adımda erişilebilir |
| US-3 | Adımlar arasında geri gidebilmek istiyorum, kaydedilen veriler korunur | Geri butonu önceki adıma döner, form verisi kaybolmaz |
| US-4 | Sihirbaz tamamlandığında çekilişim otomatik kaydedilmiş olsun | Son adımda "Kaydet ve Yorumlara Geç" butonu config'i `saveSetupState` ile kaydeder |

---

## Fonksiyonel Gereksinimler

### F-1 · Adım Yapısı (5 adım)

```
Adım 1 — Marka
  brand.name (zorunlu), brand.raffleName, brand.postUrl, brand.logo
  → "Sonraki: Ödüller"

Adım 2 — Ödüller
  prizes dizisi (min 1) — her ödül: isim, görsel, kazanan sayısı, yedek sayısı
  → "Sonraki: Katılım Kuralları"

Adım 3 — Katılım Kuralları (çok kullanılan kurallar)
  Seçim kartları (checkbox/toggle):
    ✓ "Yorum zorunlu" (requireComment — default true)
    ○ "En az N hesap etiketle" → N girişi açılır (requireMentionRule, minMentions)
    ○ "Anahtar kelime zorunlu" → kelime girişi açılır (keywordRequired)
    ○ "Hesabımı takip et" → hesap listesi açılır (requiredFollowAccounts)
    ○ "Gönderiyi beğen" (requireLike)
  Katılım yöntemi: kişi başı 1 hak / yorum başı 1 hak (entryMethod)
  → "Sonraki: Gelişmiş Kurallar"

Adım 4 — Gelişmiş Kurallar (isteğe bağlı, açılır-kapanır panel)
  "Bunları ayarlamazsanız çekiliş yine de çalışır" açıklaması ile:
    maxMentions, mentionMode, weightedEntry, uniqueMentions
    keywordBlacklist, userBlacklist
    requireSave, requireStoryShare, requireStoryProofIfPrivate
    requireMinAge → minAge, requireRealActiveAccount, disallowBusinessAccounts
    maxCommentsPerUser, allowMultipleCommentsBonus
  → "Sonraki: Görünüm"

Adım 5 — Görünüm & Özet
  storyBackgroundId seçici (mevcut `StoryBackgroundPicker` bileşeni)
  showPrizeProductsInResultsStory toggle
  Kural özeti (getRulesSummaryLines kullanılarak) — okunabilir Türkçe liste
  "Kaydet ve Yorumlara Geç" → saveSetupState + onNext()
```

### F-2 · İlerleme Göstergesi

Mevcut `StepProgress.jsx` çekiliş aşamalarını gösteriyor. Sihirbaz adımları için **aynı stilin** daha küçük bir varyantı sihirbaz başlığında gösterilir (Marka · Ödüller · Kurallar · Gelişmiş · Özet).

### F-3 · Uzman Modu

Her adımda "Tüm ayarları göster" linki mevcut tam forma geçer (`RaffleConfigStep` düz form görünümü). Sihirbaz ↔ düz form geçişi state kaybetmez.

### F-4 · Validasyon

Her "Sonraki" tıklamasında yalnızca o adımın zorunlu alanları kontrol edilir. Zorunlu olmayan adım 4, hata vermeden atlanabilir ("Atla" butonu).

### F-5 · State Yönetimi

Sihirbaz yeni bileşen (`RaffleSetupWizard.jsx`) olarak implemente edilir. Tüm state değişkenlerini `useRaffleForm`'dan alır; ekstra state gerekmez. `currentWizardStep` (`useState(0)`) yalnızca wizard'ın lokal state'i.

---

## Kapsam Dışı

- Şablon seçimi (→ PRD-03)
- AI ile otomatik doldurma (mevcut özellik — ayrı akış)
- Sihirbazda gerçek zamanlı katılımcı sayısı önizlemesi

---

## Teknik Notlar

| Bileşen | Dosya | Not |
|---------|-------|-----|
| Mevcut config formu | `src/components/RaffleConfigStep.jsx` | Sihirbaz bu formun yerini almaz — "uzman modu" olarak saklanır |
| Form state | `src/hooks/useRaffleForm.js:34–74` | 25+ state var; sihirbaz bunları olduğu gibi kullanır |
| Kural özeti üretme | `src/utils/raffleConfigFile.js:109–132` | `getRulesSummaryLines()` — Adım 5'te kullanılacak |
| Story arka plan seçici | `src/components/RaffleConfigStep.jsx` içinde | Adım 5'e taşınır / referans bırakılır |
| Kaydetme | `useRaffleForm.handleSaveConfig()` | Adım 5 "Kaydet" butonu bunu çağırır |

---

## Başarı Metrikleri

- Yeni kullanıcı config tamamlama oranı ↑ (ölçüm: LocalStorage'a kaydedilen çekiliş / açılan çekiliş)
- Ortalama config tamamlama süresi ↓ (ölçüm yok şu an — ilk release sonrası kullanıcı röportajı)
- "Bu alanlar ne anlama geliyor?" destek talebi ↓

---

## Açık Sorular

1. Sihirbaz yeni çekiliş oluşturmada **varsayılan** mı, yoksa "Basit Kurulum" seçeneği mi olmalı?
2. Adım 4 (Gelişmiş) tamamen atlanabilir mi yoksa "atlama" kullanıcıyı karıştırır mı?
3. Mobil görünüm öncelikli mi? (Şu an app masaüstü ağırlıklı görünüyor)
