# PRD-05 — Teknik Kalite & UX İyileştirmeleri

> Durum: Aktif · 2026-06-14  
> Öncelik: P0–P2 (backlog öğeleri BL-01…BL-15)  
> Kapsam: Bug fix, kalite kapısı, UX polish, erişilebilirlik

---

## Problem

Uygulama fonksiyonel olarak çalışıyor ancak bir dizi sessiz hata, eksik kalite kapısı ve UX sürtünmesi birikiyor. Bunlar ayrı özellik PRD'leri olarak yönetilmek yerine tek bir teknik sprint'te temizlenecek.

---

## Hedef Kullanıcı

- **Organizatör:** Çekiliş kurarken hata mesajı yerine beyaz ekran görmemeli; artık kullanılmayan çekilişleri silebilmeli.
- **Geliştirici:** CI'da lint hatası yakalayabilmeli; core mantığı test edebilmeli; hook mimarisini anlayabilmeli.

---

## Öğeler & Kabul Kriterleri

### Grup A — Kritik Düzeltmeler (P0)

#### BL-01 · Eksik import düzeltmesi
**Kaynak:** `useRaffleForm.js:26` — `resizeUploadedImage` ve `recompressIfNeeded` tanımsız çalışıyor.

| ID | Kabul Kriteri |
|----|---------------|
| AC-01a | `resizeUploadedImage` ve `recompressIfNeeded` `imageUtils.js`'den import edilmiş |
| AC-01b | Logo ve ödül görseli yükleme akışı sessiz hata fırlatmıyor |
| AC-01c | Mevcut `followRules.test.js` testleri yeşil |

#### BL-02 · ESLint CI adımı
**Kaynak:** `.github/workflows/deploy.yml` — lint adımı yok.

| ID | Kabul Kriteri |
|----|---------------|
| AC-02a | `deploy.yml`'e `npm run lint` adımı eklenmiş, build'den önce çalışıyor |
| AC-02b | `no-undef` gibi hatalar PR'da görünür hale geliyor |

---

### Grup B — Yüksek Öncelik UX (P1)

#### BL-03 · Çekiliş silme
**Kaynak:** `setupStorage.js` — `deleteRaffle` yok.

| ID | Kabul Kriteri |
|----|---------------|
| AC-03a | Duyuru listesinde her çekiliş satırında "Sil" butonu var |
| AC-03b | Silme onay dialogu çıkıyor (geri dönüşsüz işlem) |
| AC-03c | `setupStorage.js`'e `deleteRaffle(id)` eklendi, localStorage + IndexedDB'den temizliyor |
| AC-03d | Silinen çekiliş listeden anında kayboluyor |

#### BL-05 · Birim testleri — çekirdek mantık
**Kaynak:** Proje kökünde sıfır test dosyası.

| ID | Kabul Kriteri |
|----|---------------|
| AC-05a | Vitest + happy-dom kurulumu tamamlandı |
| AC-05b | `ticketPool` hesaplama (mention çarpanı, çoklu yorum bonusu) test edildi |
| AC-05c | `participationCriteria` filtreleme mantığı test edildi |
| AC-05d | `followRules.js` — mevcut 14 test + yeni edge case'ler çalışıyor |
| AC-05e | `npm test` CI'da geçiyor |

---

### Grup C — Orta Öncelik UX & Kalite (P2)

#### BL-06 · Bilet havuzu CSV export
**Kaynak:** `RaffleCommentsStep` — tablo var, dışa aktarma yok.

| ID | Kabul Kriteri |
|----|---------------|
| AC-06a | "CSV İndir" butonu geçerli katılımcı listesini (kullanıcı adı, bilet sayısı) indirir |
| AC-06b | Başlık satırı Türkçe: `Kullanıcı Adı,Bilet Sayısı,Yorum Sayısı` |

#### BL-07 · Error boundary
**Kaynak:** `main.jsx` ve `App.jsx` — error boundary yok.

| ID | Kabul Kriteri |
|----|---------------|
| AC-07a | `<ErrorBoundary>` `App.jsx`'i sarmalıyor |
| AC-07b | Hata ekranı "Bir şeyler ters gitti" mesajı + "Yenile" butonunu gösteriyor |
| AC-07c | Konsola `console.error` ile stack trace yazılıyor |

#### BL-08 · Duyuru listesi sayfalama
**Kaynak:** `RaffleAnnouncement.jsx:166` — tüm kayıtlar tek listede.

| ID | Kabul Kriteri |
|----|---------------|
| AC-08a | 10'dan fazla çekiliş varsa sayfalama kontrolleri görünüyor |
| AC-08b | Sayfa başına 10 çekiliş gösteriliyor |

#### BL-09 · Slot makinesi klavye erişilebilirliği
**Kaynak:** `RaffleAnimation.jsx` — ARIA / keyboard nav yok.

| ID | Kabul Kriteri |
|----|---------------|
| AC-09a | Başlatma butonu `role="button"` ve `aria-label` ile işaretli |
| AC-09b | Space / Enter tuşuyla çekilişi başlatmak mümkün |

#### BL-10 · Chrome eklentisi `alert()` → inline mesaj
**Kaynak:** `popup.js:180,181` — `alert()` çağrıları.

| ID | Kabul Kriteri |
|----|---------------|
| AC-10a | `alert()` çağrıları kaldırıldı |
| AC-10b | Mesajlar popup içinde `<div class="status-message">` ile gösteriliyor |

---

### Grup D — Düşük Öncelik Temizlik (P3)

#### BL-12 · Story canvas font garantisi
**Kaynak:** `storyCanvas.js` — `document.fonts.ready` beklemiyor.

| ID | Kabul Kriteri |
|----|---------------|
| AC-12a | Canvas render başlamadan önce `await document.fonts.ready` çağrılıyor |

#### BL-13 · Deprecated export kaldırma
**Kaynak:** `config.js:43` — `@deprecated getExtensionDownloadUrl`.

| ID | Kabul Kriteri |
|----|---------------|
| AC-13a | `getExtensionDownloadUrl` (tekil) `config.js`'den kaldırıldı |
| AC-13b | `getExtensionDownloadUrls` (çoğul) çağrıları dokunulmadı |

#### BL-15 · Versiyon senkronizasyonu
**Kaynak:** `package.json:3` (0.1.0) vs `manifest.json:4` (1.4.8).

| ID | Kabul Kriteri |
|----|---------------|
| AC-15a | `package.json` versiyonu `manifest.json` ile eşleşiyor (tek kaynak) |
| AC-15b | `vite.config.js` veya build scripti bu değeri otomatik okuyor (opsiyonel) |

---

## Uygulama Sırası

```
Sprint 1 (XS — 1 gün)
  BL-01 · BL-02 · BL-07 · BL-12 · BL-13 · BL-15

Sprint 2 (S — 2-3 gün)
  BL-03 · BL-06 · BL-08 · BL-09 · BL-10

Sprint 3 (M — 3-5 gün)
  BL-05
```

---

## Kapsam Dışı

- BL-04 (God hook refactor) — bağımsız risk içeriyor, ayrı PRD'ye alınabilir
- BL-11 (Kriptografik RNG) — özellik, sonraki sprint
- BL-14 (Inline style → CSS) — kademeli, ayrı PR'larla
- BL-16 (Scraper izleme) — altyapı, sonraki iterasyon

---

## Bağımlılıklar

- BL-02, BL-05 birlikte yapılmalı (lint + test aynı CI adımında yakalanır)
- BL-01 düzeltilmeden BL-05 test coverage'ı yanıltıcı olabilir

---

## Başarı Metrikleri

| Metrik | Hedef |
|--------|-------|
| CI build başarısı | Lint + test her PR'da geçiyor |
| Test coverage (core) | ticketPool + participationCriteria + followRules ≥ %80 |
| Console hata | `useRaffleForm` akışında `TypeError: X is not a function` → 0 |
| Beyaz ekran oranı | Error boundary ile kullanıcıya bilgilendirici hata ekranı |
