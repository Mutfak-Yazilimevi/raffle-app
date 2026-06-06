import React from 'react';
import {
  Megaphone, MessageCircle, Filter, Ticket, Shuffle, Trophy,
  Shield, Smartphone, Lock, Users, Sparkles,
} from 'lucide-react';
import { APP_DISPLAY_NAME } from '../utils/appBranding';

const userSteps = [
  {
    icon: Megaphone,
    title: '1. Duyuruyu okuyun',
    text: 'Ana sayfada ödülleri ve katılım kurallarını görün. Instagram gönderisine gidip yorum yapın.',
    color: 'var(--insta-pink)',
  },
  {
    icon: MessageCircle,
    title: '2. Kurallara uygun yorum',
    text: 'Beğeni, etiket, takip veya anahtar kelime gibi tanımlı şartları yerine getirin.',
    color: 'var(--insta-orange)',
  },
  {
    icon: Users,
    title: '3. Organizatör yorumları toplar',
    text: 'Chrome eklentisi ile yorumlar uygulamaya aktarılır; kurallara uymayanlar elenir.',
    color: 'var(--insta-blue)',
  },
  {
    icon: Sparkles,
    title: '4. Canlı çekiliş',
    text: 'Slot makinesi animasyonu ile kazananlar ve yedekler ödül ödül, adım adım belirlenir.',
    color: 'var(--insta-purple)',
  },
  {
    icon: Trophy,
    title: '5. Sonuçlar',
    text: 'Kazananlar bu sayfada ve story görsellerinde paylaşılabilir; organizatör doğrulama yapabilir.',
    color: '#059669',
  },
];

const algorithmSteps = [
  { icon: MessageCircle, label: 'Yorumlar', sub: 'Instagram\'dan içe aktarılır' },
  { icon: Filter, label: 'Filtreleme', sub: 'Kurallara göre eleme' },
  { icon: Ticket, label: 'Bilet havuzu', sub: 'Her hak = 1 bilet' },
  { icon: Shuffle, label: 'Rastgele seçim', sub: 'Eşit olasılık' },
  { icon: Trophy, label: 'Kazananlar', sub: 'Asil + yedek' },
];

function FlowArrow() {
  return (
    <div className="hiw-flow-arrow" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function AlgorithmDiagram() {
  return (
    <div className="hiw-algorithm">
      {algorithmSteps.map((step, index) => {
        const Icon = step.icon;
        return (
          <React.Fragment key={step.label}>
            <div className="hiw-algorithm-step">
              <div className="hiw-algorithm-icon">
                <Icon size={22} />
              </div>
              <strong>{step.label}</strong>
              <span>{step.sub}</span>
            </div>
            {index < algorithmSteps.length - 1 && <FlowArrow />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TicketPoolVisual() {
  const tickets = [
    { user: '@ayse', n: 1 },
    { user: '@mehmet', n: 3 },
    { user: '@zeynep', n: 1 },
    { user: '@can', n: 2 },
  ];

  return (
    <div className="hiw-ticket-visual">
      <div className="hiw-ticket-visual-title">
        <Ticket size={16} /> Örnek bilet havuzu
      </div>
      <div className="hiw-ticket-grid">
        {tickets.flatMap(({ user, n }) =>
          Array.from({ length: n }, (_, i) => (
            <div key={`${user}-${i}`} className="hiw-ticket-chip">
              {user}
            </div>
          ))
        )}
      </div>
      <p className="hiw-ticket-caption">
        @mehmet 3 yorum hakkı → 3 bilet; çekilişte seçilme şansı 3 kat artar.
      </p>
    </div>
  );
}

export default function HowItWorksSection({ compact = false }) {
  return (
    <section className={`hiw-section ${compact ? 'hiw-section--compact' : ''}`}>
      <div className="hiw-header">
        <h2>Nasıl çalışır?</h2>
        <p>
          {APP_DISPLAY_NAME} tamamen tarayıcınızda çalışır. Veriler sunucuya gönderilmez;
          çekiliş adil ve şeffaf bir bilet + rastgele seçim modeline dayanır.
        </p>
      </div>

      <div className="glass-container hiw-trust">
        <Shield size={20} color="var(--insta-blue)" />
        <div>
          <strong>Gizlilik</strong>
          <span>Yorumlar, ayarlar ve sonuçlar yalnızca cihazınızda (localStorage) saklanır.</span>
        </div>
        <Smartphone size={20} color="var(--insta-pink)" />
        <div>
          <strong>Sunucu yok</strong>
          <span>Backend veya veritabanı kullanılmaz; internet sadece sayfa ve eklenti için gerekir.</span>
        </div>
        <Lock size={20} color="#059669" />
        <div>
          <strong>Adillik</strong>
          <span>Her bilet eşit ağırlıktadır; kazanan <code>Math.random()</code> ile seçilir.</span>
        </div>
      </div>

      <h3 className="hiw-subtitle">Katılımcı için akış</h3>
      <div className="hiw-user-steps">
        {userSteps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="hiw-user-step glass-container">
              <div className="hiw-user-step-icon" style={{ background: `${step.color}18`, color: step.color }}>
                <Icon size={22} />
              </div>
              <div>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      <h3 className="hiw-subtitle">Çekiliş ve kazanan tespit algoritması</h3>
      <div className="glass-container hiw-algorithm-card">
        <AlgorithmDiagram />
        <div className="hiw-algorithm-details">
          <div>
            <h4>Adım 1 — Yorum havuzu</h4>
            <p>
              Instagram yorumları Chrome eklentisi ile alınır. Her kayıt bir kullanıcı adı
              ve yorum metni içerir.
            </p>
          </div>
          <div>
            <h4>Adım 2 — Kural filtresi</h4>
            <p>
              Organizatörün tanımladığı kurallar uygulanır: engelli kullanıcı, zorunlu kelime,
              etiket sayısı, yorum limiti, takip doğrulaması (eklenti ile) vb. Uymayan katılımcılar
              bilet alamaz.
            </p>
          </div>
          <div>
            <h4>Adım 3 — Bilet üretimi</h4>
            <p>
              Geçerli her katılımcı için bir veya daha fazla &quot;bilet&quot; oluşturulur.
              Tek hak modunda kişi başı 1 bilet; çoklu yorum modunda her geçerli yorum 1 bilet.
              Ağırlıklı etiket modunda etiket sayısına göre ek bilet verilebilir.
            </p>
            <TicketPoolVisual />
          </div>
          <div>
            <h4>Adım 4 — Rastgele çekiliş</h4>
            <p>
              Her ödül için sırayla asil ve yedek kazananlar belirlenir. Havuzdan rastgele bir bilet
              indeksi seçilir (<code>Math.floor(Math.random() × havuzUzunluğu)</code>).
              Kazananın tüm biletleri havuzdan çıkarılır; aynı kişi iki kez kazanamaz.
            </p>
          </div>
          <div>
            <h4>Adım 5 — Sonuç ve doğrulama</h4>
            <p>
              Kazananlar kaydedilir, story görselleri üretilebilir ve isteğe bağlı manuel doğrulama
              (beğeni, hikâye, yaş vb.) yapılır. Yedek kazananlar asil talihlinin diskalifiye
              edilmesi durumunda devreye girer.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
