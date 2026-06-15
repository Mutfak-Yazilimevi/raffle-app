# MutfakRaffleStudio — Ürün Fikir Beyin Fırtınası

> Sürekli keşif oturumu · 2026-06-13  
> Yöntem: Ürün Üçlüsü (PM · Tasarımcı · Mühendis) → Top 5 önceliklendirme  
> Referans: `docs/backlog.md`, `docs/onboarding-report.md`

---

## Bağlam

**Ürün:** MutfakRaffleStudio — Instagram çekilişleri için tarayıcı tabanlı, sunucusuz araç  
**Segment:** Türk marka/sosyal medya yöneticileri, ajanslar  
**Hedef çıktılar:** Yeni kullanıcı aktivasyonunu artır, çekiliş başına harcanan zamanı azalt, marka güvenini pekiştir

---

## Bakış Açısı 1 — Ürün Müdürü

*Odak: iş değeri, stratejik uyum, müşteri etkisi*

### PM-1 · Çekiliş Şablonları (Hızlı Başlat)
Yaygın çekiliş türleri için hazır kural setleri: "Takip Et + Etiketle", "Yorum Yap", "Story Paylaş + Takip Et". Organizatör şablonu seçer, özelleştirir, kaydeder; ajanslar şablonları tekrar tekrar kullanır.

**Neden:** Mevcut config formu 20+ alan içeriyor; her çekiliş için sıfırdan başlamak zorunlu. Şablonlar ilk aktivasyonu hızlandırır ve ajan müşteriler için iş tekrarını ortadan kaldırır.

### PM-2 · Şeffaflık Sertifikası (Adil Çekiliş Belgesi)
Çekiliş tamamlandığında indirilebilir bir PDF/HTML raporu: katılımcı sayısı, uygulanan kurallar, çekiliş zamanı, kullanılan yöntem. İsteğe bağlı olarak bir özet story kartı da üretilebilir.

**Neden:** Takipçiler büyük markaların çekilişlerinde "acaba sahte mi?" kaygısı taşıyor. Şeffaflık belgesi marka güvenini pekiştirir, paylaşılabilir bir içeriğe dönüşür ve rakiplerden ayrışma sağlar.

### PM-3 · Çoklu Hesap / Ajans Modu
Birden fazla marka profilini tek arayüzde yönetme: her markanın kendi şablonları, renk teması ve logosunu saklama. Ajanslar müşteri geçişini bir dropdown ile yapar.

**Neden:** Sosyal medya ajansları genellikle 5–20 marka yönetiyor; şu anda her müşteri için ayrı tarayıcı profili açmak ya da config dosyası taşımak gerekiyor.

### PM-4 · Kazanan Bildirimi Asistanı
Çekilişi tamamlar tamamlamaz: otomatik hazırlanan DM taslakları (kazanan için tebrik + teslimat bilgisi isteme), hashtag önerileri ve "kazananı duyur" story şablonu. Kopyala-yapıştır akışı.

**Neden:** Organizatörlerin çekiliş sonrası yönetim süreci — kazananı bulmak, DM yazmak, hikayeyi hazırlamak — genellikle çekiliş süreci kadar zaman alıyor.

### PM-5 · Performans Gösterge Paneli (Çekiliş İstatistikleri)
Saklanan çekilişlerden toplanan agregat veriler: ortalama katılımcı sayısı, kural tipine göre elenme oranları, en sık kullanılan ödül kategorileri. Yerel IndexedDB üzerinde çalışır, hiçbir şey sunucuya gitmez.

**Neden:** Marka yöneticileri "en çok ne kuralı katılımı düşürüyor?" veya "takip şartı koyduğumuzda kaç kişi eleniyor?" sorularına cevap arıyor ama şu anda bu veriye ulaşamıyor.

---

## Bakış Açısı 2 — Ürün Tasarımcısı

*Odak: kullanıcı deneyimi, kullanılabilirlik, keyif*

### D-1 · Rehberli Kurulum Sihirbazı (Guided Setup)
20+ alanlı config formunu, soru-cevap akışıyla ilerleyen adımlara böl: "Ne tür bir çekiliş yapıyorsunuz? / Ödül ne? / Hangi kurallar geçerli?" Cevaplara göre form otomatik doldurulur.

**Neden:** Mevcut form deneyimli kullanıcılar için bile kafa karıştırıcı; hangi alanın zorunlu olduğu belli değil. İlk kez kullanan marka yöneticisi için aktivasyon eşiği çok yüksek.

### D-2 · Katılımcı Arama ve Gelişmiş Filtreleme
Katılımcı tablosuna: isim arama, kriter durumuna göre filtreleme (sadece "başarılı", sadece "elendi"), bilet sayısına göre sıralama. Büyük çekilişlerde (1000+ yorum) tablo navigasyonu kolaylaşır.

**Neden:** Mevcut tabloda sıralama var (bu oturumda eklendi) ama 500+ katılımcı listesinde belirli bir kişiyi bulmak hâlâ zor; kaydırma gerekiyor.

### D-3 · Story Kartı Görsel Editörü
"Arka plan seç" adımına basit bir editör ekle: marka rengi, yazı boyutu/rengi, logo konumu, kart önizlemesi. Kullanıcı kaydetmeden önce story'nin tam haline bakabilir.

**Neden:** Story üretimi mevcut en değerli özelliklerden biri; ancak organizatörler markaları için özel renk/yazı tipi kullanmak istiyor ve şu an bunu yapamıyor.

### D-4 · Boş Durum ve Hata Rehberliği
"Hiç yorum yüklenmediyse ne yapmalıyım?", "Eklenti neden çalışmıyor?" gibi durumlara özel, adım adım yönlendirmeli boş durum ekranları. Her hata mesajı bir aksiyon linki içerir.

**Neden:** Yeni kullanıcılar ilk kez chrome eklentisi kurduğunda veya yorum gelmediyse ne yapacaklarını bilmiyor; destek yükü artıyor.

### D-5 · Karanlık / Açık Tema Geçişi
Sistem temasını otomatik algıla (prefers-color-scheme), manuel geçişe de izin ver. Özellikle gece çekiliş yapan ajanslar için göz yorgunluğunu azaltır.

**Neden:** Tüm UI şu an açık temada, CSS değişkenleri zaten kullanılıyor (`--bg-header`, `--text-main`, vb.) — karanlık tema eklenmesi görece düşük efor.

---

## Bakış Açısı 3 — Yazılım Mühendisi

*Odak: teknik olanaklar, veri kaldıraçlama, ölçeklenebilir çözümler*

### E-1 · Bot / Şüpheli Hesap Tespit Filtresi
Yorum örüntülerine bakarak şüpheli hesapları işaretle: aynı yorumu kopya-yapıştır yapanlar, saniyeler içinde yorum yapanlar, sıfır takipçi / minimal profil (takip oranı analizine gerek yok — sadece yorum metni ve zaman bilgisi). Katılımcı tablosunda "şüpheli" etiketi.

**Neden:** Instagram çekilişleri bot saldırısına açık; büyük markalar "bu kişi gerçek mi?" sorusunu sorduğunda mevcut araç cevap veremiyor. Veri zaten mevcut (yorum metni + timestamp), sadece analiz katmanı eksik.

### E-2 · Deterministik Çekiliş Tekrarlanabilirliği (Audit Seed)
Her çekilişte `crypto.getRandomValues()` ile bir seed üret, bunu çekiliş kaydına ekle. Seed + katılımcı listesi ile aynı sonuç her zaman yeniden üretilebilir. Şeffaflık raporuna (PM-2) eklenebilir.

**Neden:** `Math.random()` deterministik değil ve denetlenemez. Seed kayıt edilirse organizatör "algoritmaya dokunmadım" diyebilir ve seed + liste paylaşarak herkes sonucu doğrulayabilir.

### E-3 · Eklenti Scraper Sağlık Kontrolü
Chrome extension service worker'ı, bilinen bir Instagram DOM yapısına karşı düzenli sağlık kontrolü yapar. Yapı değiştiğinde (Instagram güncelleme yapınca) organizatöre popup uyarısı ve yeni versiyon linki gösterilir.

**Neden:** Instagram DOM değiştiğinde scraper sessizce bozulur (BL-16); organizatör boş yorum listesiyle çekiliş yapmaya çalışır. Erken uyarı sistemi bu senaryoyu önler.

### E-4 · Web Worker Tabanlı Bilet Havuzu Hesaplama
Büyük çekilişlerde (10.000+ yorum) `ticketsPool` useMemo'su UI thread'ini bloke ediyor. Hesaplamayı Web Worker'a taşı; ana thread serbest kalır, UI donmaz.

**Neden:** `useRaffleForm.js:400-459` — tüm yorum kümesi üzerinde senkron döngü çalışıyor. 10K yorum için bu belirgin gecikme yaratır.

### E-5 · Config + Yorum Yedek / Geri Yükleme (Export Bundle)
Tüm çekiliş verisini (config, yorum listesi, kazananlar, hikaye görselleri) tek bir .zip arşivine paket. Tarayıcı değiştirme, cihaz taşıma veya localStorage temizleme durumunda tam geri yükleme mümkün.

**Neden:** Şu anda config txt olarak, sonuçlar CSV olarak ayrı ayrı dışa aktarılabiliyor; ancak tek bir "taşı + kurtar" akışı yok. localStorage temizlenirse tüm geçmiş çekilişler kayboluyor.

---

## Top 5 Önceliklendirme

*Kriter: stratejik uyum × etki × yapılabilirlik × farklılaşma*

---

### #1 · Rehberli Kurulum Sihirbazı `[D-1]`

**Açıklama:** 20+ alanlı config formunu "ne yapmak istiyorsunuz?" sorusuyla başlayan adım-adım bir sihirbaza dönüştür.

**Neden seçildi:** Aktivasyon eşiği en büyük büyüme engelidir. İlk çekilişini yapan organizatör formda kaybolur ve araçtan vazgeçer. Sihirbaz bu engeli ortadan kaldırır, deneyimli kullanıcılar hızlı-atla seçeneğiyle bypass edebilir.

**Doğrulanması gereken varsayımlar:**
- Mevcut kullanıcıların kaçı config formunda terk ediyor? (Analytics yok — kullanıcı röportajı gerekli)
- Sihirbaz akışının tüm kural kombinasyonlarını kapsayan kaç adım gerektireceği

---

### #2 · Bot / Şüpheli Hesap Tespit Filtresi `[E-1]`

**Açıklama:** Yorum metni, zaman damgası ve tekrar örüntüsüne bakarak şüpheli katılımcıları otomatik etiketle; organizatör tek tıkla eleme yapabilsin.

**Neden seçildi:** Rakiplerin büyük çoğunluğu bu özelliği sunmuyor. Marka güvenliği açısından kritik — bot kazanan haberi hem marka hem de araç için PR felaketine dönüşür. Verinin tamamı zaten yerel; API gerektirmiyor.

**Doğrulanması gereken varsayımlar:**
- Organizatörlerin botlara karşı tolerans eşiği nedir? (Yanlış pozitifler gerçek katılımcıyı elerse tepki kötü olabilir)
- Sadece metin/zaman analizi mi yeterli, yoksa hesap yaşı/takipçi sayısı gibi profil verisine de bakılmalı mı?

---

### #3 · Çekiliş Şablonları `[PM-1]`

**Açıklama:** "Takip Et + Etiketle", "Yorum Yap", "Story Paylaş" gibi hazır kural setleri; organizatör seçer, özelleştirir, tekrar kaydeder.

**Neden seçildi:** Hem yeni hem tekrar eden kullanıcılar için değer üretir. Ajanslar aynı müşteri için her ay aynı kuralları tekrar giriyor — şablon bu sürtünmeyi sıfırlar. Config export/import altyapısı zaten mevcut; şablon mantığı üstüne eklenebilir.

**Doğrulanması gereken varsayımlar:**
- En yaygın 3–5 kural kombinasyonu neler? (Kullanıcı veri toplanmadan bilinmiyor)
- Şablonlar tarayıcı-yerel mi yoksa paylaşılabilir mi olmalı?

---

### #4 · Şeffaflık Sertifikası `[PM-2]`

**Açıklama:** Çekiliş tamamlandığında indirilebilir HTML/PDF rapor: zaman damgalı katılımcı sayısı, kural özeti, kazananlar, kullanılan yöntem. Opsiyonel olarak story kartı dahil.

**Neden seçildi:** Güçlü farklılaşma silahı — rakip araçların büyük çoğunluğunda yok. Marka hesapları bunu story'de paylaşır; bu organik büyüme kanalı haline gelir ("MutfakRaffleStudio ile adil çekiliş" watermark'ı). Audit seed (E-2) ile entegre edilirse matematiksel doğrulanabilirlik de eklenir.

**Doğrulanması gereken varsayımlar:**
- Türk markalar şeffaflık belgesi talep ediyor mu? Kimin için önemli: takipçi mi, marka mı, yasal uyum mu?
- PDF üretimi için client-side kütüphane (jsPDF vb.) vs. canvas → PNG yaklaşımı

---

### #5 · Config + Yorum Yedek / Geri Yükleme (Export Bundle) `[E-5]`

**Açıklama:** Tüm çekiliş verisini (config, yorumlar, kazananlar, görseller) tek .zip'te dışa aktar; sıfırdan geri yükle.

**Neden seçildi:** Mevcut CSV + txt export seti yetersiz; cihaz değişikliği veya localStorage temizleme geçmiş çekilişleri yok ediyor. Bu özellik "güvenle kullan" algısı yaratır ve tekrarlayan kullanıcı kaybını önler. Altyapının büyük kısmı (setupStorage, IndexedDB, config export) hazır.

**Doğrulanması gereken varsayımlar:**
- Kullanıcılar aktif olarak çekiliş arşivi/taşıma gereksinimi yaşıyor mu?
- .zip üretimi için client-side kütüphane gereksinimi (JSZip) bütçe içinde mi?

---

## Fırsat-Çözüm Haritası (Özet)

```
Fırsat: Yeni kullanıcı aktivasyonu düşük
  └─ Çözüm: Rehberli Kurulum Sihirbazı [#1]

Fırsat: Bot saldırılarına karşı savunmasızlık
  └─ Çözüm: Şüpheli Hesap Filtresi [#2]

Fırsat: Tekrar eden kurulum süreci / ajans verimsizliği
  └─ Çözüm: Çekiliş Şablonları [#3]

Fırsat: Marka güveni + viral büyüme kanalı
  └─ Çözüm: Şeffaflık Sertifikası [#4]

Fırsat: Veri kaybı / taşınabilirlik endişesi
  └─ Çözüm: Export Bundle [#5]
```
