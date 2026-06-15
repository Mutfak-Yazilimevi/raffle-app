# MutfakRaffleStudio — Onboarding Raporu

> Salt okunur analiz · 2026-06-13

---

## 1. Proje Özeti

**MutfakRaffleStudio**, Instagram çekilişleri için tamamen tarayıcı tabanlı, sunucusuz bir araçtır.
Organizatör; kuralları tanımlar, yorumları içe aktarır (Chrome eklentisi / CSV / yapıştır), canlı slot
makinesi animasyonuyla kazananları belirler ve Instagram Story görselleri üretir.

Katılımcı verisi **sunucuya hiç gönderilmez**; tüm işlem organizatörün tarayıcısındaki
`localStorage` + `IndexedDB`'de gerçekleşir.

**Canlı:** <https://mutfak-yazilimevi.github.io/raffle-app/>

---

## 2. Stack

| Katman | Teknoloji |
|--------|-----------|
| UI | React 18, Vite 5 |
| Ikonlar | lucide-react 0.395 |
| Animasyon | canvas-confetti 1.9 |
| Ses | Web Audio API (sentezlenmiş) |
| Story görseli | Canvas API |
| Depolama | localStorage (config/registry) + IndexedDB (görseller) |
| Eklenti | Chrome Manifest V3 |
| CI/CD | GitHub Actions → GitHub Pages |
| Linting | ESLint 8 (react + hooks plugins) |

---

## 3. Mimari

```
App.jsx
 ├─ view: 'announcement' | 'studio' | 'extension'
 ├─ raffleStep: 'config' | 'comments' | 'draw'
 └─ drawStage: 'animation' | 'results'

hooks/
 └─ useRaffleForm.js  ← tüm form state + bilet havuzu (680 satır, god hook)

utils/
 ├─ setupStorage.js   ← registry + IndexedDB + legacy migration
 ├─ raffleSchedule.js ← tarih/saat alanları
 ├─ commentParsing.js ← CSV / raw text / normalizer
 ├─ followRules.js    ← takip kuralı hesaplama
 ├─ participationCriteria.js / participantCriteriaSummary.js
 ├─ storyCanvas.js    ← 1080×1920 canvas primitive'leri
 └─ generate*Story.js ← 4 story türü (setup, starting, winner, results)

chrome-extension/
 ├─ content.js        ← yorum scraper (MutationObserver + scroll)
 ├─ followVerify.js   ← profil gezme / bulk takipçi tarama
 ├─ popup.js          ← eklenti UI + uygulama ile localStorage köprüsü
 └─ background.js     ← service worker (mesajlaşma)
```

### Veri akışı (çekiliş)

```
Chrome eklentisi → localStorage['instagram_comments_import']
  → App.jsx StorageEvent listener → importedComments state
    → useRaffleForm ticketsPool (useMemo, kural filtresi)
      → RaffleAnimation (slot + random pick)
        → onDrawComplete → saveDrawResults → registry → RaffleResults
```

---

## 4. Yapılanlar (Done)

| # | Özellik | Kanıt |
|---|---------|-------|
| 1 | Çoklu çekiliş yönetimi (oluştur, listele, seç) | `setupStorage.js:180`, `App.jsx:153` |
| 2 | Kural config: marka, logo, ödüller | `useRaffleForm.js:35-65` |
| 3 | Katılım yöntemi: kişi başı 1 / yorum başı 1 / ağırlıklı etiket | `useRaffleForm.js:400-459` |
| 4 | Mention kuralları: min/max, per_comment/cumulative, unique, weighted | `useRaffleForm.js:415-443` |
| 5 | Anahtar kelime + kullanıcı kara listesi | `useRaffleForm.js:406-413` |
| 6 | Takip doğrulama (bireysel profil + bulk takipçi tarama) | `followRules.js`, `followVerify.js` |
| 7 | Yorum içe aktarma: Chrome eklentisi, CSV, raw text yapıştır | `commentParsing.js`, `RaffleCommentsStep.jsx` |
| 8 | Katılım kriterleri: beğeni, kaydet, story paylaşımı, yaş, hesap türü | `participationCriteria.js` |
| 9 | Slot makinesi animasyonu + Web Audio API ses + confetti | `RaffleAnimation.jsx:120-200` |
| 10 | Çoklu ödül + asil/yedek kazanan sistemi | `RaffleAnimation.jsx:267-296` |
| 11 | Diskalifiye et → yedekten kaydır | `RaffleResults.jsx:74-113` |
| 12 | Manuel doğrulama kontrol listesi | `RaffleResults.jsx:222-256` |
| 13 | CSV dışa aktarma | `RaffleResults.jsx:116-137` |
| 14 | 4 Story türü (duyuru, başlıyor, talihli, sonuçlar) | `generate*Story.js` |
| 15 | Çekiliş tarih/saat planlama alanları | `raffleSchedule.js` |
| 16 | Config dışa/içe aktarma (.txt) | `raffleConfigFile.js` |
| 17 | LocalStorage + IndexedDB depolama (görsel sıkıştırma) | `setupStorage.js:254-470` |
| 18 | Legacy storage migration | `setupStorage.js:122-157` |
| 19 | GitHub Actions → GitHub Pages CI/CD | `.github/workflows/deploy.yml` |
| 20 | Çoklu story arka plan teması | `storyBackgrounds.js` |

---

## 5. Eksikler / Gaps

### 5.1 Kritik Buglar

| # | Sorun | Kanıt |
|---|-------|-------|
| B1 | `resizeUploadedImage` ve `recompressIfNeeded` `useRaffleForm.js`'de kullanılıyor ancak **import edilmemiş**. Yalnızca `resizeImageFromFile` import edilmiş. Çekiliş config içe aktarılırken ve sayfa yenilenmesinde görsel sıkıştırma try/catch tarafından sessizce atlanıyor. | `useRaffleForm.js:26` (import) vs. `useRaffleForm.js:144,155,265,267` (kullanım) |

### 5.2 Mimari Koku

| # | Sorun | Kanıt |
|---|-------|-------|
| A1 | **God hook**: `useRaffleForm.js` 680 satır, 25+ state değişkeni. Tek sorumluluk ilkesi ihlali. | `useRaffleForm.js:33-678` |
| A2 | **İnline stil baskını**: Neredeyse tüm UI inline style; tema değişikliği ve responsive çalışma zorlaşıyor. | `RaffleAnimation.jsx`, `RaffleResults.jsx`, `App.jsx` |

### 5.3 Eksik Özellikler

| # | Sorun | Kanıt |
|---|-------|-------|
| F1 | **Çekiliş silme** yok; registry büyüdükçe localStorage doluyor. Temizleme UI'ı yok. | `setupStorage.js`: `createRaffle` var, `deleteRaffle` yok |
| F2 | **Bilet havuzu dışa aktarma** yok; organizatör hangi katılımcıların geçerli olduğunu dışarı alamıyor. | `useRaffleForm.js:400-459` |
| F3 | **Duyuru sayfasında sayfalama** yok; çok çekiliş olunca liste büyür. | `RaffleAnnouncement.jsx:166` |
| F4 | **Kriptografik RNG** yok; README'de belgelenmiş, yüksek riskli kullanımlar için isteğe bağlı seçenek sunulabilir. | `RaffleAnimation.jsx:219` |

### 5.4 Kalite / Geliştirici Deneyimi

| # | Sorun | Kanıt |
|---|-------|-------|
| Q1 | **Sıfır test**; unit, integration, e2e test dosyası yok. | Proje kök dizini |
| Q2 | **ESLint CI'da çalışmıyor**; `npm run lint` workflow'da yok, bu yüzden B1 gibi `no-undef` hataları deployment'ı bloklamıyor. | `.github/workflows/deploy.yml` |
| Q3 | **Deprecated export** hâlâ mevcut (`getExtensionDownloadUrl`). | `config.js:43` |
| Q4 | **Error boundary** yok; bir component crash'i tüm uygulamayı çökertir. | `main.jsx`, `App.jsx` |
| Q5 | **A11y eksiklikleri**: Slot makinesinde keyboard nav yok, ARIA labelleri eksik. | `RaffleAnimation.jsx:400-520` |
| Q6 | **Chrome eklentisinde `alert()` kullanımı**: Popup'ta bloke eden alert çağrıları var. | `popup.js:180-211` |
| Q7 | **Eklenti ve uygulama versiyonları senkronize değil**: eklenti `1.4.8`, app `0.1.0`. | `manifest.json:4`, `package.json:3` |

---

## 6. Riskler

| Risk | Etki | Olasılık |
|------|------|----------|
| B1 importları eksik → config içe aktarmada görsel kaybolur | Orta — kullanıcı logosu/ödül görseli yüklenmez | Yüksek |
| localStorage dolması → ayarlar kaydedilemez | Orta — kullanıcı uyarı alır ama config kaybolabilir | Orta (çok çekiliş + büyük resimler) |
| Instagram DOM değişikliği → scraper bozulur | Yüksek — temel özellik çalışmaz | Orta (Instagram sık değiştirir) |
| God hook yeniden renderlar → büyük katılımcı listesinde performans | Düşük-Orta | Düşük |

---

## 7. Açık Sorular

1. Çekiliş **silme** isteniyor mu? Registry temizleme politikası nedir?
2. **Kriptografik RNG** (crypto.getRandomValues) isteğe bağlı seçenek olarak sunulacak mı?
3. **Çoklu dil desteği** planlanıyor mu? Tüm string'ler Türkçe sabit.
4. **Eklenti mağaza yayını** planı var mı? Manifest `1.4.8` ama indirilip manuel kurulum gerekiyor.
5. **PWA / offline destek** gereksinimi var mı?
6. Story görsellerinde **font yükleme garantisi** (font-display:block + document.fonts.ready bekleme) eklenecek mi?
