import React from 'react';
import {
  Users, Upload, Trash2, CheckCircle, Info, Play, Share2, ArrowLeft, Puzzle, ExternalLink,
} from 'lucide-react';

export default function RaffleCommentsStep({
  form,
  importedCount,
  onBack,
  onStart,
  onOpenExtension,
}) {
  const {
    rawText, comments, handleTextChange, handleCSVUpload, loadDemoData, clearData,
    prizes, ticketsPool, uniqueParticipantsCount,
    configMessage, generatingStartingStory, handleGenerateStartingStory,
  } = form;

  const uniqueCommentUsers = new Set(comments.map((c) => c.username.toLowerCase())).size;

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {importedCount > 0 && (
        <div className="glass-container" style={{ padding: '16px 20px', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle color="#10b981" size={24} />
            <div>
              <h4 style={{ margin: 0, color: '#10b981', fontWeight: 700 }}>Eklentiden Yorumlar Aktarıldı!</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{importedCount} yorum başarıyla yüklendi.</p>
            </div>
          </div>
          <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={clearData}>Temizle</button>
        </div>
      )}

      {comments.length === 0 && importedCount === 0 && (
        <div className="glass-container" style={{ padding: '20px 24px', background: 'rgba(64, 93, 230, 0.08)', borderColor: 'rgba(64, 93, 230, 0.25)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--insta-gradient)', padding: '10px', borderRadius: '12px', flexShrink: 0 }}>
              <Puzzle size={22} color="white" />
            </div>
            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: 'var(--insta-blue)' }}>
                Yorumları Chrome eklentisi ile aktarın
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Instagram yorumlarını otomatik çekmek için sağ üstteki Chrome Eklentisi sayfasından kurulum yapın,
                ardından yorumları buraya aktarın. İsterseniz aşağıdan manuel yapıştırma veya CSV de kullanabilirsiniz.
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={onOpenExtension}>
            <ExternalLink size={16} /> Chrome Eklentisi Sayfasına Git
          </button>
        </div>
      )}

      <div className="glass-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users className="gradient-text" /> Yorumları Yükle
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={loadDemoData}>Demo Yükle</button>
            {comments.length > 0 && (
              <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={clearData}>
                <Trash2 size={14} /> Temizle
              </button>
            )}
          </div>
        </div>

        <div className="form-group" style={{ flexGrow: 1 }}>
          <textarea
            className="form-textarea"
            style={{ flexGrow: 1, minHeight: '300px', fontSize: '13px', lineHeight: '1.6' }}
            placeholder={`Örnek Format 1 (Instagram kopyala-yapıştır):\nkullanici_adi\nHarika çekiliş! @arkadas1 @arkadas2\n\nÖrnek Format 2:\nkullanici_adi: Katılıyorum @arkadas`}
            value={rawText}
            onChange={handleTextChange}
          />
        </div>

        <div style={{ border: '2px dashed var(--glass-border)', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', position: 'relative', background: 'rgba(0,0,0,0.2)', marginTop: '16px' }}>
          <input type="file" accept=".csv,.txt" onChange={handleCSVUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          <Upload size={20} style={{ margin: '0 auto 8px', color: 'var(--insta-pink)' }} />
          <p style={{ fontSize: '13px', margin: 0, fontWeight: 500 }}>CSV veya TXT Dosyası Sürükleyin veya Seçin</p>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sütunlar: username, comment formatında olmalıdır</span>
        </div>
      </div>

      <div className="glass-container" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px', width: '100%', textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Toplam Yorum</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-title)', fontWeight: 800 }}>{comments.length}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Benzersiz Kişi</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-title)', fontWeight: 800 }}>{uniqueCommentUsers}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Geçerli Katılımcı</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--insta-orange)' }}>{uniqueParticipantsCount}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Toplam Bilet</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--insta-pink)' }}>{ticketsPool.length}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Asil / Yedek</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--insta-blue)' }}>
              {prizes.reduce((s, p) => s + parseInt(p.winnerCount || 0, 10), 0)} / {prizes.reduce((s, p) => s + parseInt(p.substituteCount || 0, 10), 0)}
            </strong>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #fbad50, #e1306c)' }}
            onClick={handleGenerateStartingStory}
            disabled={generatingStartingStory || ticketsPool.length === 0}
          >
            <Share2 size={16} /> {generatingStartingStory ? 'Oluşturuluyor...' : 'Çekiliş Başlıyor Story'}
          </button>
          {configMessage && (
            <p style={{ marginTop: '14px', marginBottom: 0, fontSize: '13px', color: 'var(--insta-yellow)' }}>{configMessage}</p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <Info size={16} color="var(--insta-blue)" />
            <span>Çekilişe hazır {ticketsPool.length} bilet var. Hazırsanız çekilişi başlatın.</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              <ArrowLeft size={16} /> Kurallara Dön
            </button>
            <button
              type="button"
              className="btn btn-primary pulse-glow"
              style={{ padding: '14px 28px', fontSize: '16px' }}
              disabled={ticketsPool.length === 0}
              onClick={onStart}
            >
              <Play size={18} fill="white" /> Çekilişi Başlat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
