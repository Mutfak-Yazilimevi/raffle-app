import {
  Trash2, CheckCircle, Info, Play, Share2, ArrowLeft, Puzzle, ExternalLink, ListOrdered, UserCheck, Download,
} from 'lucide-react';
import OpenInstagramLink from './OpenInstagramLink';

function exportParticipantsCSV(participantStats, activeCriteriaColumns) {
  const headers = ['Sıra', 'Kullanıcı', ...activeCriteriaColumns.map((c) => c.label), 'Bilet', 'Durum'];
  const rows = participantStats.map((person, i) => [
    i + 1,
    `@${person.username}`,
    ...activeCriteriaColumns.map((col) => person.criteria?.cells?.[col.id]?.value ?? ''),
    person.ticketCount,
    person.ticketCount > 0 ? 'Geçerli' : 'Filtrelendi',
  ]);

  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'katilimcilar.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function RaffleCommentsStep({
  form,
  importedCount,
  onBack,
  onStart,
  onOpenExtension,
}) {
  const {
    comments, clearData,
    ticketsPool, uniqueParticipantsCount, participantStats, filteredOutCount,
    activeCriteriaColumns,
    configMessage, generatingStartingStory, handleGenerateStartingStory,
    followRuleActive, followAccountList, effectiveMinRequiredFollows,
    followVerifyMessage, followVerifyPending, handlePrepareFollowVerification,
  } = form;

  const postUrl = form.brand?.postUrl;
  const uniqueCommentUsers = new Set(comments.map((c) => c.username.toLowerCase())).size;

  const criterionStatusStyles = {
    passed: { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
    failed: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.25)' },
    pending: { bg: 'rgba(251, 173, 80, 0.12)', color: 'var(--insta-orange)', border: 'rgba(251, 173, 80, 0.3)' },
    na: { bg: 'var(--bg-inset)', color: 'var(--text-muted)', border: 'var(--glass-border)' },
  };

  function renderCriterionCell(cell) {
    if (!cell) return '—';
    const style = criterionStatusStyles[cell.status] || criterionStatusStyles.na;
    return (
      <span
        title={cell.value}
        style={{
          display: 'inline-block',
          maxWidth: '160px',
          padding: '4px 8px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: 600,
          lineHeight: 1.35,
          background: style.bg,
          color: style.color,
          border: `1px solid ${style.border}`,
          whiteSpace: 'normal',
          textAlign: 'center',
        }}
      >
        {cell.value}
      </span>
    );
  }

  return (
    <div className="step-page">
      {importedCount > 0 && (
        <div className="glass-container step-card-full" style={{ padding: '16px 20px', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px' }}>
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
        <div className="glass-container step-card-full" style={{ padding: '20px 24px', background: 'rgba(64, 93, 230, 0.08)', borderColor: 'rgba(64, 93, 230, 0.25)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--insta-gradient)', padding: '10px', borderRadius: '12px', flexShrink: 0 }}>
              <Puzzle size={22} color="white" />
            </div>
            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: 'var(--insta-blue)' }}>
                Yorumları Chrome eklentisi ile aktarın
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Instagram yorumlarını otomatik çekmek için Chrome eklentisini kurun ve çekiliş gönderisinden
                yorumları bu adıma aktarın. Katılımcı özeti aşağıda listelenir.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={onOpenExtension}>
              <ExternalLink size={16} /> Chrome Eklentisi Sayfasına Git
            </button>
            <OpenInstagramLink postUrl={postUrl} />
          </div>
        </div>
      )}

      {followRuleActive && comments.length > 0 && (
        <div className="glass-container step-card-full" style={{ padding: '20px 24px', background: 'rgba(64, 93, 230, 0.06)', borderColor: 'rgba(64, 93, 230, 0.2)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: 'var(--insta-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={18} /> Takip Şartı Doğrulama
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {followAccountList.map((a) => `@${a}`).join(', ')} listesinden en az <strong>{effectiveMinRequiredFollows}</strong> hesabın takip edilmesi gerekiyor.
                Chrome eklentisi katılımcı profillerini gezerek takip listesini kontrol eder.
              </p>
              {followVerifyMessage && (
                <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--insta-orange)' }}>{followVerifyMessage}</p>
              )}
            </div>
            <button type="button" className="btn btn-primary" style={{ flexShrink: 0 }} onClick={handlePrepareFollowVerification}>
              <UserCheck size={16} /> Eklenti ile Doğrula
            </button>
          </div>
          {followVerifyPending && (
            <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Eklenti simgesine tıklayın → <strong>Takip Şartlarını Doğrula</strong>. Instagram&apos;a giriş yapmış olmanız gerekir; gizli profillerde liste görünmeyebilir.
            </p>
          )}
        </div>
      )}

      <div className="step-cards-grid">
        <div className="glass-container step-card-full" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <ListOrdered className="gradient-text" size={20} /> Katılımcı Özeti
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {comments.length > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {comments.length} yorum · {participantStats.length} kişi
                  {filteredOutCount > 0 && ` · ${filteredOutCount} kişi kurallara takıldı`}
                </span>
              )}
              <OpenInstagramLink postUrl={postUrl} size="compact" showIcon />
              {comments.length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => exportParticipantsCSV(participantStats, activeCriteriaColumns)}
                  >
                    <Download size={14} /> CSV İndir
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={clearData}>
                    <Trash2 size={14} /> Temizle
                  </button>
                </>
              )}
            </div>
          </div>

          {comments.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.7, border: '1px dashed var(--glass-border)', borderRadius: '12px', background: 'var(--bg-muted)' }}>
              Chrome eklentisi ile yorum aktardığınızda katılımcılar, yorum sayıları ve çekiliş hakları burada listelenir.
            </div>
          ) : (
            <>
              <div style={{ overflow: 'auto', flex: 1, maxHeight: '420px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ background: 'var(--bg-table-head)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, width: '48px' }}>#</th>
                      <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Kullanıcı</th>
                      {activeCriteriaColumns.map((col) => (
                        <th
                          key={col.id}
                          style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center', minWidth: '96px' }}
                        >
                          {col.label}
                        </th>
                      ))}
                      <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantStats.map((person, index) => {
                      const eligible = person.ticketCount > 0;
                      return (
                        <tr
                          key={person.username.toLowerCase()}
                          style={{
                            borderTop: '1px solid var(--glass-border)',
                            background: index % 2 === 0 ? 'var(--bg-row-alt)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>{index + 1}</td>
                          <td style={{ padding: '11px 14px', fontWeight: 600 }}>@{person.username}</td>
                          {activeCriteriaColumns.map((col) => (
                            <td key={col.id} style={{ padding: '11px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                              {renderCriterionCell(person.criteria?.cells?.[col.id])}
                            </td>
                          ))}
                          <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: '50px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: eligible ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                              color: eligible ? '#10b981' : '#ef4444',
                              border: `1px solid ${eligible ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.25)'}`,
                            }}
                            >
                              {eligible ? 'Geçerli' : 'Filtrelendi'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Aktif katılım şartları ve tespit edilen değerler gösterilir. Çekiliş hakkına göre azalan sırada listelenir.
              </p>
            </>
          )}
        </div>

        <div className="glass-container step-card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Çekiliş Özeti</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', width: '100%', textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ background: 'var(--bg-inset)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Yorum</span>
              <strong style={{ fontSize: '18px', fontFamily: 'var(--font-title)', fontWeight: 800 }}>{comments.length}</strong>
            </div>
            <div style={{ background: 'var(--bg-inset)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Kişi</span>
              <strong style={{ fontSize: '18px', fontFamily: 'var(--font-title)', fontWeight: 800 }}>{uniqueCommentUsers}</strong>
            </div>
            <div style={{ background: 'var(--bg-inset)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Geçerli</span>
              <strong style={{ fontSize: '18px', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--insta-orange)' }}>{uniqueParticipantsCount}</strong>
            </div>
            <div style={{ background: 'var(--bg-inset)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Bilet</span>
              <strong style={{ fontSize: '18px', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--insta-pink)' }}>{ticketsPool.length}</strong>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #fbad50, #e1306c)', width: '100%' }}
            onClick={handleGenerateStartingStory}
            disabled={generatingStartingStory || ticketsPool.length === 0}
          >
            <Share2 size={16} /> {generatingStartingStory ? 'Oluşturuluyor...' : 'Çekiliş Başlıyor Story'}
          </button>
          {configMessage && (
            <p style={{ marginTop: '14px', marginBottom: 0, fontSize: '13px', color: 'var(--insta-yellow)' }}>{configMessage}</p>
          )}
        </div>

        <div className="glass-container step-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Çekilişi Başlat</h3>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
              <Info size={16} color="var(--insta-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Çekilişe hazır <strong style={{ color: 'var(--insta-pink)' }}>{ticketsPool.length}</strong> bilet var. Hazırsanız canlı çekilişe geçin.</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary pulse-glow"
              style={{ padding: '14px 28px', fontSize: '16px', width: '100%' }}
              disabled={ticketsPool.length === 0}
              onClick={onStart}
            >
              <Play size={18} fill="white" /> Çekilişi Başlat
            </button>
            <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={onBack}>
              <ArrowLeft size={16} /> Kurallara Dön
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
