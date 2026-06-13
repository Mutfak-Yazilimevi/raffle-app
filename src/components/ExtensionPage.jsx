import { useEffect, useState } from 'react';
import { Puzzle, Download, ExternalLink, ArrowLeft } from 'lucide-react';
import { LINKS } from '../config';
import { downloadChromeExtension } from '../utils/downloadExtension';
import OpenInstagramLink from './OpenInstagramLink';
import { loadSetupState } from '../utils/setupStorage';

export default function ExtensionPage({ onBack, postUrl: postUrlProp }) {
  const [extensionDownloading, setExtensionDownloading] = useState(false);
  const [postUrl, setPostUrl] = useState(postUrlProp || '');

  useEffect(() => {
    if (postUrlProp) {
      setPostUrl(postUrlProp);
      return;
    }
    loadSetupState().then((saved) => {
      if (saved?.brand?.postUrl) setPostUrl(saved.brand.postUrl);
    });
  }, [postUrlProp]);

  const handleExtensionDownload = async () => {
    setExtensionDownloading(true);
    try {
      const result = await downloadChromeExtension();
      if (!result.ok) {
        alert('Eklenti dosyası indirilemedi. GitHub kurulum rehberini deneyin.');
        window.open(LINKS.extensionGuide, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setExtensionDownloading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <button type="button" className="btn btn-secondary" style={{ marginBottom: '20px' }} onClick={onBack}>
        <ArrowLeft size={16} /> Çekilişe Dön
      </button>

      <div className="glass-container" style={{ padding: '28px', background: 'rgba(64, 93, 230, 0.08)', borderColor: 'rgba(64, 93, 230, 0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--insta-gradient)', padding: '12px', borderRadius: '14px' }}>
            <Puzzle size={28} color="white" />
          </div>
          <div>
            <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--font-title)', fontSize: '22px', fontWeight: 800, color: 'var(--insta-blue)' }}>
              Chrome Eklentisi
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Instagram yorumlarını otomatik çekmek için eklentiyi kurun. Kurulumdan sonra çekiliş gönderinizi açın,
              yorumları çekin ve uygulamaya aktarın.
            </p>
          </div>
        </div>

        <ol style={{ margin: '0 0 24px', paddingLeft: '22px', fontSize: '14px', lineHeight: 1.9, color: 'var(--text-main)' }}>
          <li>
            <strong>Eklentiyi indirin ve kurun</strong> — ZIP dosyasını indirin, arşivi açın.
            Chrome&apos;da <code style={{ fontSize: '12px', background: 'var(--bg-inset)', padding: '2px 6px', borderRadius: '4px' }}>chrome://extensions</code> adresine gidin,
            Geliştirici modunu açın ve Paketlenmemiş öğe yükle ile klasörü seçin.
          </li>
          <li>
            <strong>Instagram&apos;da çekiliş gönderinizi açın</strong> — aşağıdaki buton veya kurulumda kaydettiğiniz link ile gidin.
          </li>
          <li>
            <strong>Eklenti ikonuna tıklayın</strong> — yorumları çekin ve Çekiliş Uygulamasına Aktar deyin.
          </li>
          <li>
            <strong>Çekiliş uygulamasına dönün</strong> — 2. adımda (Yorumlar) aktarılan veriler otomatik görünür.
          </li>
          <li>
            <strong>Takip şartı varsa doğrulayın</strong> — Kurallar adımında tanımladığınız hesaplar için Yorumlar sayfasında
            &quot;Eklenti ile Doğrula&quot; deyin; eklenti katılımcı profillerini gezerek takip listesini kontrol eder.
          </li>
        </ol>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExtensionDownload}
            disabled={extensionDownloading}
          >
            <Download size={16} /> {extensionDownloading ? 'İndiriliyor...' : 'Chrome Eklentisini İndir'}
          </button>
          <a
            href={LINKS.extensionGuide}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ExternalLink size={16} /> Kurulum Rehberi
          </a>
          <OpenInstagramLink postUrl={postUrl} />
        </div>
      </div>
    </div>
  );
}
