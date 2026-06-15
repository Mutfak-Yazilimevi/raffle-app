# PRD-03 — Çekiliş Şablonları

> Durum: Tamamlandı · 2026-06-15  
> Öncelik: P1 (Top 5 #3)

---

## Problem

Organizatörler her yeni çekiliş için kuralları sıfırdan giriyor. Ajans müşterileri aynı kural setini her ay kullanırken config dosyasını dışa/içe aktarma yapmak zorunda. Yeni kullanıcı "nereden başlayacağını" bilmiyor.

---

## Hedef Kullanıcı

- **Birincil:** Aynı kural tipini tekrarlayan ajans / sosyal medya yöneticisi  
- **İkincil:** Hızlı başlamak isteyen yeni kullanıcı (hazır preset ile)

---

## Kullanıcı Hikayeleri

| ID | Hikaye | Kabul Kriteri |
|----|--------|---------------|
| US-1 | "Takip Et + Etiketle" gibi hazır şablondan hızlıca başlamak istiyorum | Şablon seçince kurallar otomatik doluyor; marka/ödül alanları boş kalıyor |
| US-2 | Kendi özelleştirdiğim kural setini şablon olarak kaydetmek istiyorum | "Mevcut kuralları şablon olarak kaydet" → isim sor → localStorage'a yaz |
| US-3 | Kaydettiğim şablonu başka çekilişte uygulamak istiyorum | Şablon listesinde görünür; seçince mevcut form yüklenir |
| US-4 | Kullanmadığım şablonu silmek istiyorum | Şablon listesinde çöp kutusu ikonu → onay → localStorage'dan sil |
| US-5 | Hazır şablonları özel şablonlarımdan ayırt edebilmek istiyorum | Hazır şablonlar "Hazır Şablon" etiketi ile ayrı grupta gösterilir |

---

## Fonksiyonel Gereksinimler

### F-1 · Hazır (Built-in) Şablonlar

```js
// src/utils/builtinTemplates.js
export const BUILTIN_TEMPLATES = [
  {
    id: 'follow-tag',
    name: 'Takip Et + Etiketle',
    description: 'Hesabı takip et, 1 arkadaşını etiketle',
    rules: {
      entryMethod: 'one_per_user',
      requireComment: true,
      requireFollowAccounts: true,
      requireMentionRule: true,
      minMentions: 1,
      mentionMode: 'per_comment',
    },
  },
  {
    id: 'comment-only',
    name: 'Yalnızca Yorum',
    description: 'Yorum yapmak yeterli',
    rules: {
      entryMethod: 'one_per_user',
      requireComment: true,
    },
  },
  {
    id: 'follow-tag-like',
    name: 'Takip + Etiket + Beğeni',
    description: 'Standart 3\'lü katılım kuralı',
    rules: {
      entryMethod: 'one_per_user',
      requireComment: true,
      requireLike: true,
      requireFollowAccounts: true,
      requireMentionRule: true,
      minMentions: 1,
      mentionMode: 'per_comment',
    },
  },
  {
    id: 'multi-tag-weighted',
    name: 'Çoklu Etiket (Ağırlıklı)',
    description: 'Ne kadar çok etiket, o kadar çok hak',
    rules: {
      entryMethod: 'one_per_user',
      requireComment: true,
      requireMentionRule: true,
      minMentions: 1,
      mentionMode: 'cumulative',
      weightedEntry: true,
      uniqueMentions: true,
    },
  },
  {
    id: 'keyword-required',
    name: 'Anahtar Kelimeli Yorum',
    description: 'Yorumda belirli bir kelime/hashtag zorunlu',
    rules: {
      entryMethod: 'one_per_user',
      requireComment: true,
      keywordRequired: '',  // kullanıcı doldurur
    },
  },
];
```

Hazır şablonlar `brand`, `prizes`, `storyBackgroundId` içermez — bunlar her zaman boş/varsayılan kalır.

### F-2 · Kullanıcı Şablonları (Kayıt / Yükleme / Silme)

**Depolama:** `localStorage['raffle_templates']` — JSON dizi, her eleman:

```json
{
  "id": "uuid-veya-timestamp",
  "name": "Kullanıcının verdiği isim",
  "createdAt": "2026-06-13T10:00:00Z",
  "rules": { /* buildConfigSnapshot().rules */ }
}
```

Yalnızca `rules` bloğu saklanır (`brand` ve `prizes` şablona dahil **edilmez**).

**Kaydetme akışı:** "Mevcut kuralları şablon kaydet" → inline isim girişi → `saveTemplate()` → liste güncellenir.

**Limit:** Maksimum 20 kullanıcı şablonu. Limite ulaşılınca "En eski şablonu sil" uyarısı gösterilir.

### F-3 · UI Entegrasyonu

**Yer:** `RaffleConfigStep.jsx` üst kısmına (veya PRD-01 Sihirbazı'nın Adım 3 başına) "Şablondan Başla" kartı eklenir:

```
┌─────────────────────────────────────────────┐
│  Şablondan Başla                     [×]    │
│                                             │
│  Hazır Şablonlar                            │
│  [Takip+Etiket] [Yorum] [Çoklu Etiket] ... │
│                                             │
│  Kayıtlı Şablonlarım                        │
│  [Aylık Çekiliş] [Sezonluk]  + Kaydet      │
└─────────────────────────────────────────────│
```

Şablon uygulandığında **mevcut kural alanları** override edilir, `brand` ve `prizes` dokunulmaz. Uygulama sonrası kullanıcı kuralları düzenleyebilir.

### F-4 · Template Utils

```js
// src/utils/templateStorage.js
export function listTemplates()           { ... }  // builtin + user (built-in önce)
export function saveTemplate(name, rules) { ... }
export function deleteTemplate(id)        { ... }
export function applyTemplate(template, setters) { ... }  // useRaffleForm setter'larını çağırır
```

`applyTemplate` doğrudan `setEntryMethod`, `setRequireMentionRule`, `setMinMentions`, vb. setter'ları çağırır — mevcut `parseConfigFromTxt` deseni ile tutarlı (`useRaffleForm.js:289–350`).

---

## Kapsam Dışı

- Şablonları başka kullanıcılarla paylaşma / bulut senkronizasyonu
- `brand` veya `prizes` şablona dahil etme (ayrı istek olursa değerlendirilir)
- Şablon versiyonlama

---

## Teknik Notlar

| Bileşen | Dosya | Not |
|---------|-------|-----|
| Mevcut config snapshot | `src/utils/raffleConfigFile.js:9–42` | `buildConfigSnapshot().rules` şablon verisi olarak kullanılır |
| Config yükleme deseni | `src/hooks/useRaffleForm.js:289–350` | `handleConfigFileLoad` — şablon uygulama aynı deseni izler |
| Şablon depolama | yeni `src/utils/templateStorage.js` | localStorage anahtarı: `raffle_templates` |
| UI entegrasyon noktası | `src/components/RaffleConfigStep.jsx` | Kural bölümünün üstüne veya PRD-01 wizard Adım 3'e |

---

## Başarı Metrikleri

- Hazır şablon kullanım oranı (açılan config / şablondan başlanan config)
- Kullanıcı şablonu kayıt sayısı (oturum başına ≥1 şablon kaydeden kullanıcı oranı)
- Config tamamlama süresinde düşüş

---

## Açık Sorular

1. Şablon uygulandığında kullanıcıya "mevcut kuralların üzerine yazılacak" uyarısı gösterilmeli mi?
2. Hazır şablonlar için görsel/ikon eklenmeli mi? (Daha kolay seçim)
3. Şablonlar config dosyasına (`.txt`) dahil edilmeli mi? (Export bundle ile birlikte gelirse gereksiz olabilir)
