# MutfakRaffleStudio — Backlog

> Öncelikli fikir listesi · 2026-06-13 onboarding analizinden oluşturuldu.
> Bu dosya yalnızca **fikirler ve fırsatlar** içerir; hiçbir değişiklik yapılmamıştır.

---

## Tamamlanan Tasarım Çalışmaları

### ✅ BL-17 · UI Yenileme — Night Market Light Tema (2026-06-14)
**Yapılan:**
- `src/index.css` — "Night Market Light" temasına geçiş:
  - Zemin: `#0e0b09` → `#faf7f2` (sıcak krem)
  - Kart: `#1c1410` → `#ffffff`
  - Oturak: `#261c16` → `#f5efe8`
  - Metin: `#f2ebe1` → `#1a1008` / muted `#a89988` → `#7a6456`
  - Border: `rgba(255,255,255,0.07)` → `rgba(26,16,8,0.10)`
- Turuncu aksanlar (`#ff6b35`) ve tipografi (Instrument Serif + Plus Jakarta Sans) değişmedi
- Hardcoded koyu değerler düzeltildi: placeholder, btn-secondary hover, scrollbar, card hover
- `index.html` — Yeni Google Fonts: Instrument Serif + Plus Jakarta Sans + Space Mono
- Production build (`dist/`) güncellendi

**Doğrulama:** `body { background-color: rgb(250,247,242); color: rgb(26,16,8) }` ✓

**Efor:** S · **Değer:** Daha erişilebilir, günlük kullanıma uygun aydınlık tema

---

## P0 — Kritik (hemen ele alınmalı)

### ✅ BL-01 · Eksik import düzeltmesi (2026-06-14)
**Yapılan:** `useRaffleForm.js` — `resizeUploadedImage` ve `recompressIfNeeded` import'ları eklendi.

### ✅ BL-02 · ESLint'i CI/CD'ye ekle (2026-06-14)
**Yapılan:** `.github/workflows/deploy.yml` — `npm run lint` adımı build öncesine eklendi.

---

## P1 — Yüksek Öncelik

### ✅ BL-03 · Çekiliş silme özelliği (2026-06-14)
**Yapılan:** `deleteRaffle` işlevi eklendi; kullanıcı çekilişi listeden kaldırabilir.

### ✅ BL-04 · God hook'u böl: `useRaffleForm` yeniden yapılandırma (2026-06-14)
**Yapılan:** `useBrandForm.js`, `useCommentImport.js`, `useFollowVerify.js`, `useParticipationRules.js`, `useTicketPool.js` — ayrı hook'lara bölündü.

### ✅ BL-05 · Birim testleri — çekirdek mantık (2026-06-14)
**Yapılan:** Vitest ile `followRules.test.js` ve `ticketPool.test.js` yazıldı; pure fonksiyon coverage eklendi.

---

## P2 — Orta Öncelik

### ✅ BL-06 · Katılımcı listesi / bilet havuzu CSV dışa aktarma (2026-06-14)
**Yapılan:** `RaffleCommentsStep` — CSV indirme butonu eklendi; katılımcı listesi dışa aktarılabilir.

### ✅ BL-07 · Error boundary ekle (2026-06-14)
**Yapılan:** React error boundary component'i eklendi; `main.jsx` içinde uygulamayı sarıyor.

### ✅ BL-08 · Duyuru sayfasına sayfalama (2026-06-14)
**Yapılan:** `RaffleAnnouncement.jsx` — sayfa başına N kayıt gösterecek şekilde pagination eklendi.

### ✅ BL-09 · Slot makinesi klavye erişilebilirliği (2026-06-14)
**Yapılan:** `RaffleAnimation.jsx` — ARIA role ve klavye (Enter/Space) desteği eklendi.

### ✅ BL-10 · Chrome eklentisinde `alert()` → inline mesaj (2026-06-14)
**Yapılan:** `popup.js` — `alert()` çağrıları kaldırıldı; inline durum mesajlarıyla değiştirildi.

---

## P3 — Düşük Öncelik / Gelecek

### ✅ BL-11 · Kriptografik RNG seçeneği (2026-06-14)
**Yapılan:** `src/utils/cryptoRandom.js` — modulo-bias önlemli `cryptoRandomInt(n)` oluşturuldu. `RaffleAnimation.jsx` winner draw'ı `Math.random()` → `cryptoRandomInt()` olarak güncellendi.  
**Efor:** S

### ✅ BL-12 · Story görseli font yükleme garantisi (2026-06-14)
**Yapılan:** `storyCanvas.js` — `document.fonts.ready` beklenerek canvas render'dan önce fontların yüklenmesi garanti edildi.

### ✅ BL-13 · Deprecated `getExtensionDownloadUrl` kaldırma (2026-06-14)
**Yapılan:** `config.js` — deprecated `getExtensionDownloadUrl` fonksiyonu kaldırıldı.

### ✅ BL-14 · Inline style → CSS class migrasyonu (kademeli) (2026-06-14)
**Yapılan:** `src/index.css`'e yardımcı sınıflar eklendi: `.btn--sm`, `.flex-row`, `.flex-row--between`, `.flex-row--end`, `.flex-col`, `.stat-cell`, `.stat-label`, `.stat-value`, `.card-heading`, `.panel-heading`, `.inset-box`, `.scroll-list`, `.td-cell`, `.th-cell`. `RaffleAnimation.jsx`, `RaffleCommentsStep.jsx`, `RaffleConfigStep.jsx` içindeki yüksek tekrarlı inline style'lar bu sınıflarla değiştirildi.  
**Kapsam notu:** Kalan dosyalar (RaffleResults, RaffleSetupWizard, App.jsx vb.) içindeki bağlamsal inline style'lar gerektiğinde kademeli olarak taşınabilir.

### ✅ BL-15 · Versiyon senkronizasyonu (uygulama ↔ eklenti) (2026-06-14)
**Yapılan:** `package.json` ve `manifest.json` arasında versiyon tutarsızlığı giderildi.

### ✅ BL-16 · Instagram scraper dayanıklılık izleme (2026-06-14)
**Yapılan:** `chrome-extension/content.js` başına maintenance notu eklendi — kullanılan temel selector'lar (`article`, `div[role="dialog"]`, `span[dir="auto"]`, `[aria-label]`, `a[href^="/"]`), son doğrulama tarihi ve Instagram DOM değişikliğini gösteren belirtiler belgelendi.  
**Not:** Script semantic/ARIA selector'lara dayandığı için obfuscated class adlarına kıyasla daha dayanıklı.

---

## Özet Tablo

| ID | Başlık | Öncelik | Efor |
|----|--------|---------|------|
| BL-01 | Eksik import düzeltmesi | ✅ Tamamlandı | XS |
| BL-02 | ESLint CI adımı | ✅ Tamamlandı | XS |
| BL-03 | Çekiliş silme | ✅ Tamamlandı | S |
| BL-04 | God hook bölünmesi | ✅ Tamamlandı | M |
| BL-05 | Birim testleri (çekirdek mantık) | ✅ Tamamlandı | M |
| BL-06 | Bilet havuzu CSV export | ✅ Tamamlandı | S |
| BL-07 | Error boundary | ✅ Tamamlandı | XS |
| BL-08 | Duyuru sayfalama | ✅ Tamamlandı | S |
| BL-09 | A11y (slot makinesi klavye) | ✅ Tamamlandı | S |
| BL-10 | alert() → inline mesaj (eklenti) | ✅ Tamamlandı | S |
| BL-11 | Kriptografik RNG seçeneği | ✅ Tamamlandı | S |
| BL-12 | Font yükleme garantisi | ✅ Tamamlandı | XS |
| BL-13 | Deprecated export kaldırma | ✅ Tamamlandı | XS |
| BL-14 | Inline style → CSS class | ✅ Tamamlandı | L |
| BL-15 | Versiyon senkronizasyonu | ✅ Tamamlandı | XS |
| BL-16 | Scraper dayanıklılık izleme | ✅ Tamamlandı | M |
| BL-17 | UI Yenileme — Night Market Light Tema | ✅ Tamamlandı | S |
