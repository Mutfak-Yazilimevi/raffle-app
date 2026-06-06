export const COMMENT_BASELINE =
  'Katılımcı listesi Chrome eklentisi ile içe aktarılır. Gönderi etkileşimlerinden hangilerinin zorunlu sayılacağını aşağıdan seçin.';

export const COMMENT_RULES_INTRO =
  'Yorum zorunluysa metinden otomatik uygulanır. Şartı sağlamayan yorumlar çekiliş havuzuna alınmaz.';

export const FILTER_INTRO = COMMENT_RULES_INTRO;

export const ENTRY_METHOD_HELP =
  'Yorumlar içe aktarıldığında çekiliş havuzuna kaç bilet düşeceğini belirler.';

export const CRITERIA_COPY = {
  requireComment: {
    label: 'Yorum yapmak',
    description: 'Katılımcının çekiliş gönderisine yorum bırakması beklenir.',
    whenEnabled:
      'Duyuru ve story kurallarına eklenir. Yorum metni kuralları (kelime, etiket vb.) uygulanır; kazanan adayında «Yorum yaptı» maddesi çıkar.',
  },
  requireLike: {
    label: 'Gönderiyi beğenmek',
    description: 'Katılımcının çekiliş gönderisini beğenmesi beklenir.',
    whenEnabled:
      'Duyuru ve story kurallarına eklenir. Kazanan seçildikten sonra doğrulama listesinde «Gönderiyi beğendi» maddesi çıkar; siz manuel kontrol edersiniz. Yorum havuzundan otomatik eleme yapılmaz.',
  },
  requireSave: {
    label: 'Gönderiyi kaydetmek',
    description: 'Katılımcının gönderiyi kaydetmesi (bookmark) beklenir.',
    whenEnabled:
      'Kural metinlerinde ve kazanan doğrulama listesinde görünür. Kaydetme durumu otomatik okunmaz; kazananla iletişimde siz teyit edersiniz.',
  },
  requireFollowAccounts: {
    label: 'Hesap takibi',
    description: 'Belirttiğiniz Instagram hesaplarının takip edilmesi gerekir.',
    whenEnabled:
      'Listelediğiniz tüm hesaplar zorunlu olur. Chrome eklentisi ile takip durumu kontrol edilebilir; doğrulama sonrası takibi eksik olanların çekiliş hakkı havuzdan düşer.',
  },
  requireMentionRule: {
    label: 'Etiket kuralı',
    description: 'Yorumda @ ile arkadaş etiketleme zorunluluğu.',
    whenEnabled:
      'Yorumlardaki @etiketler sayılır; şartı sağlamayan yorumlar veya kullanıcılar çekiliş havuzuna alınmaz. Kurallar duyuruda ve story\'de listelenir.',
  },
  allowMultipleCommentsBonus: {
    label: 'Her ek yorum ek çekiliş hakkı kazandırır',
    description: 'Farklı yorumlarla ekstra bilet anlamına gelir.',
    whenEnabled:
      'Katılım tipi otomatik «Her Yorum Bir Hak» olur. Kurallara uyan her yorum ayrı bilet sayılır; aynı kişi 3 yorum yaptıysa 3 bilete girebilir.',
  },
  requireStoryShare: {
    label: 'Gönderiyi kendi hikâyesinde (story) paylaşmak',
    description: 'Çekiliş duyurusunu story\'de paylaşma şartı.',
    whenEnabled:
      'Kural ilan ve story metinlerinde yer alır. Kazanan adaylarında «Hikâyede paylaştı» maddesi eklenir; görsel veya story ekran görüntüsü ile siz doğrularsınız.',
  },
  requireStoryProofIfPrivate: {
    label: 'Gizli hesaplar görsel kanıt sunmalı',
    description: 'Hikâyesi herkese kapalı hesaplar için ek kanıt.',
    whenEnabled:
      'Gizli profiller story paylaşımını dışarıdan göstermez; kazanan adayından ekran görüntüsü veya benzeri kanıt istemeniz kural metnine eklenir. Hikâye paylaşımı kriteri açıkken anlamlıdır.',
  },
  requireMinAge: {
    label: 'Yaş şartı',
    description: 'Katılımcının belirli yaşın üzerinde olması gerekir.',
    whenEnabled:
      'Duyuruda «En az X yaş» ifadesi çıkar. Kazanan doğrulama listesine yaş maddesi eklenir; kimlik veya beyan ile siz kontrol edersiniz.',
  },
  requireRealActiveAccount: {
    label: 'Hesap gerçek ve aktif olmalı',
    description: 'Bot, sahte veya terk edilmiş hesaplar kural dışı.',
    whenEnabled:
      'Kural metinlerinde belirtilir. Kazanan seçiminden sonra profil incelemesi ve manuel doğrulama yapmanız beklenir; otomatik tespit yoktur.',
  },
  disallowBusinessAccounts: {
    label: 'Ticari / işletme hesapları kural dışı',
    description: 'Marka, mağaza veya kurumsal hesaplar katılamaz.',
    whenEnabled:
      'Duyuru metninde belirtilir. İşletme hesapları yorum havuzundan otomatik elenmez; kazanan adayında manuel kontrol maddesi olarak yer alır.',
  },
  weightedEntry: {
    label: 'Etiket katsayısına göre ağırlıklı hak',
    description: 'Daha çok arkadaş etiketleyen, daha fazla bilet alır.',
  },
  uniqueMentions: {
    label: 'Benzersiz etiketler',
    description: 'Aynı kişiyi tekrar @etiketlemek ek puan sayılmaz.',
  },
  showPrizeProductsInResultsStory: {
    label: 'Sonuç story\'sinde kazanılan ürünleri göster',
    description: 'Sonuç görselinde kazananların yanında ödül bilgisi gösterilsin mi?',
    whenEnabled:
      'Çekiliş sonuç story görselinde her kazananın yanında ödül adı ve varsa ürün görseli yer alır. Kapalıyken yalnızca kazanan kullanıcı adları listelenir.',
  },
};

export const SECTION_COPY = {
  commentRules: {
    title: 'Yorum Kuralları',
    intro: COMMENT_RULES_INTRO,
    badge: 'auto',
  },
  postInteraction: {
    title: 'Gönderi Etkileşimi',
    intro: 'Beğeni, kaydetme ve yorum gönderi üzerinde yapılır. İstediğiniz etkileşimleri işaretleyin; işaretlenmeyenler duyuruda zorunlu şart olarak yer almaz.',
    badge: 'manual',
  },
  account: {
    title: 'Hesap Şartları',
    intro: 'Profil düzeyinde beklentiler. Takip şartı Chrome eklentisi ile doğrulanabilir.',
    badge: 'extension',
  },
  multiEntry: {
    title: 'Çoklu Katılım',
    intro: 'Aynı kişinin birden fazla yorum yapması durumunda hak dağılımını ayarlar.',
    badge: null,
  },
  story: {
    title: 'Hikâye Paylaşımı',
    intro: 'Katılımcının çekiliş gönderisini kendi Instagram hikâyesinde paylaşması beklentisi. Otomatik doğrulama yoktur.',
    badge: 'manual',
  },
  legal: {
    title: 'Yasal ve Hesap Kriterleri',
    intro: 'Bilgilendirme ve kazanan sonrası manuel teyit içindir; yorum içe aktarımında otomatik filtre uygulanmaz.',
    badge: 'manual',
  },
};

export const ENTRY_METHOD_OPTIONS = [
  {
    value: 'one_per_user',
    label: 'Her Kullanıcıya Tek Hak',
    summary: 'Her Kullanıcıya Tek Hak: Kişi başına en fazla bir bilet.',
    whenSelected:
      'Aynı kişi 10 yorum yapsa bile havuza yalnızca 1 bilet girer (etiket katsayısı veya «Her ek yorum ek hak» açıksa farklı kurallar geçerli olabilir).',
  },
  {
    value: 'one_per_comment',
    label: 'Her Yorum Bir Hak',
    summary: 'Her Yorum Bir Hak: Geçerli yorum başına bir bilet.',
    whenSelected:
      'Kurallara uyan her yorum ayrı bilet sayılır. Aynı kullanıcı birden fazla geçerli yorum yaptıysa kazanma şansı artar.',
  },
];

export const MENTION_MODE_OPTIONS = [
  {
    value: 'per_comment',
    label: 'Yorum başına',
    summary: 'Yorum başına: Tek tek yorum kontrolü.',
    whenSelected:
      'Her yorum ayrı değerlendirilir. Bir yorumda yeterli @etiket yoksa o yorum geçersiz sayılır; «Her Yorum Bir Hak» modunda yalnızca geçerli yorumlar bilet kazanır.',
  },
  {
    value: 'cumulative',
    label: 'Toplam kümülatif',
    summary: 'Toplam kümülatif: Birden fazla yorumdaki etiketler birleştirilir.',
    whenSelected:
      'Kullanıcının tüm yorumlarındaki benzersiz @etiketler toplanır. Toplam etiket sayısı minimumun altındaysa kullanıcı havuza hiç girmez.',
  },
];
