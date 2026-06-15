import { useState } from 'react';
import {
  Trash2, CheckCircle, Info, Play, Share2, ArrowLeft, Puzzle, ExternalLink, ListOrdered,
  UserCheck, Download, ChevronsUpDown, ChevronUp, ChevronDown, AlertTriangle, ShieldX,
} from 'lucide-react';
import OpenInstagramLink from './OpenInstagramLink';
import { BOT_THRESHOLDS } from '../utils/botDetection';

const STATUS_ORDER = { passed: 0, pending: 1, na: 2, failed: 3 };

function getCriterionSortValue(person, colId) {
  const cell = person.criteria?.cells?.[colId];
  if (!cell) return 99;
  return STATUS_ORDER[cell.status] ?? 2;
}

function applySort(rows, sortConfig) {
  if (!sortConfig) return rows;
  const { key, dir } = sortConfig;
  const sign = dir === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (key === 'username') {
      return sign * a.username.localeCompare(b.username, 'tr');
    }
    if (key === 'status') {
      const ea = a.ticketCount > 0 ? 0 : 1;
      const eb = b.ticketCount > 0 ? 0 : 1;
      return sign * (ea - eb) || b.ticketCount - a.ticketCount;
    }
    // criteria column by status priority
    const va = getCriterionSortValue(a, key);
    const vb = getCriterionSortValue(b, key);
    return sign * (va - vb) || b.ticketCount - a.ticketCount;
  });
}

function SortIcon({ active, dir }) {
  if (!active) return <ChevronsUpDown size={12} style={{ opacity: 0.4, marginLeft: 4 }} />;
  return dir === 'asc'
    ? <ChevronUp size={12} style={{ marginLeft: 4, color: 'var(--insta-blue)' }} />
    : <ChevronDown size={12} style={{ marginLeft: 4, color: 'var(--insta-blue)' }} />;
}

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
    likers, likersCount,
    replyCount,
    postOwnerUsername,
    ticketsPool, uniqueParticipantsCount, participantStats, filteredOutCount,
    activeCriteriaColumns,
    configMessage, generatingStartingStory, handleGenerateStartingStory,
    followRuleActive, followAccountList, effectiveMinRequiredFollows,
    followVerifyMessage, followVerifyPending, handlePrepareFollowVerification,
    likerFollowVerifyMessage, likerFollowVerifyPending, handlePrepareLikerFollowVerification,
    suspiciousMap, botThreshold, setBotThreshold,
    userBlacklist, setUserBlacklist,
  } = form;

  const [sortConfig, setSortConfig] = useState(null);
  const [showOnlySuspicious, setShowOnlySuspicious] = useState(false);
  const [clearedSuspicious, setClearedSuspicious] = useState(new Set());

  const postUrl = form.brand?.postUrl;
  const uniqueCommentUsers = new Set(comments.map((c) => c.username.toLowerCase())).size;

  const effectiveSuspiciousMap = new Map(
    [...suspiciousMap].filter(([key]) => !clearedSuspicious.has(key))
  );

  const suspiciousParticipants = participantStats.filter(
    (p) => effectiveSuspiciousMap.has(p.username.toLowerCase())
  );

  const filteredParticipants = showOnlySuspicious
    ? participantStats.filter((p) => effectiveSuspiciousMap.has(p.username.toLowerCase()))
    : participantStats;

  const sortedParticipants = applySort(filteredParticipants, sortConfig);

  function handleBlockSuspicious() {
    const toBlock = suspiciousParticipants.map((p) => p.username.toLowerCase());
    if (toBlock.length === 0) return;
    const existing = userBlacklist.split(',').map((u) => u.trim().toLowerCase().replace('@', '')).filter(Boolean);
    const merged = Array.from(new Set([...existing, ...toBlock]));
    setUserBlacklist(merged.join(', '));
  }

  function handleClearSuspicion(username) {
    setClearedSuspicious((prev) => new Set([...prev, username.toLowerCase()]));
  }

  function handleSort(key) {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }

  function thProps(key) {
    return {
      onClick: () => handleSort(key),
      style: { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' },
    };
  }

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
          <button type="button" className="btn btn-secondary btn--sm" onClick={clearData}>Temizle</button>
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
            <h3 className="card-heading flex-row">
              <ListOrdered className="gradient-text" size={20} /> Katılımcı Özeti
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {comments.length > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {comments.length} yorum · {participantStats.length} kişi
                  {filteredOutCount > 0 && ` · ${filteredOutCount} kişi kurallara takıldı`}
                  {postOwnerUsername && (
                    <span style={{ color: 'var(--insta-blue)', marginLeft: 4 }}>
                      · @{postOwnerUsername} (post sahibi) hariç tutuldu
                    </span>
                  )}
                  {effectiveSuspiciousMap.size > 0 && (
                    <span style={{ color: 'var(--insta-orange)', marginLeft: 4 }}>
                      · {effectiveSuspiciousMap.size} şüpheli
                    </span>
                  )}
                </span>
              )}
              {comments.length > 0 && (
                <select
                  value={botThreshold}
                  onChange={(e) => { setBotThreshold(Number(e.target.value)); setShowOnlySuspicious(false); setClearedSuspicious(new Set()); }}
                  style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-inset)', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <option value={BOT_THRESHOLDS.low}>Bot: Düşük hassasiyet</option>
                  <option value={BOT_THRESHOLDS.medium}>Bot: Orta hassasiyet</option>
                  <option value={BOT_THRESHOLDS.high}>Bot: Yüksek hassasiyet</option>
                </select>
              )}
              {effectiveSuspiciousMap.size > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn--sm"
                  style={{ color: showOnlySuspicious ? 'var(--insta-orange)' : 'var(--text-muted)', borderColor: showOnlySuspicious ? 'rgba(251, 173, 80, 0.4)' : undefined }}
                  onClick={() => setShowOnlySuspicious((v) => !v)}
                >
                  <AlertTriangle size={13} /> {showOnlySuspicious ? 'Tümünü Göster' : `Şüpheliler (${effectiveSuspiciousMap.size})`}
                </button>
              )}
              <OpenInstagramLink postUrl={postUrl} size="compact" showIcon />
              {comments.length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn--sm"
                    onClick={() => exportParticipantsCSV(participantStats, activeCriteriaColumns)}
                  >
                    <Download size={14} /> CSV İndir
                  </button>
                  <button type="button" className="btn btn-secondary btn--sm" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={clearData}>
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
                      <th
                        {...thProps('username')}
                        style={{ ...thProps('username').style, padding: '12px 14px', color: sortConfig?.key === 'username' ? 'var(--insta-blue)' : 'var(--text-muted)', fontWeight: 600, display: 'table-cell' }}
                      >
                        Kullanıcı <SortIcon active={sortConfig?.key === 'username'} dir={sortConfig?.dir} />
                      </th>
                      {activeCriteriaColumns.map((col) => (
                        <th
                          key={col.id}
                          {...thProps(col.id)}
                          style={{ ...thProps(col.id).style, padding: '12px 14px', color: sortConfig?.key === col.id ? 'var(--insta-blue)' : 'var(--text-muted)', fontWeight: 600, textAlign: 'center', minWidth: '96px' }}
                        >
                          {col.label} <SortIcon active={sortConfig?.key === col.id} dir={sortConfig?.dir} />
                        </th>
                      ))}
                      <th
                        {...thProps('status')}
                        style={{ ...thProps('status').style, padding: '12px 14px', color: sortConfig?.key === 'status' ? 'var(--insta-blue)' : 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}
                      >
                        Durum <SortIcon active={sortConfig?.key === 'status'} dir={sortConfig?.dir} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedParticipants.map((person, index) => {
                      const eligible = person.ticketCount > 0;
                      const suspicion = effectiveSuspiciousMap.get(person.username.toLowerCase());
                      return (
                        <tr
                          key={person.username.toLowerCase()}
                          style={{
                            borderTop: '1px solid var(--glass-border)',
                            background: suspicion
                              ? 'rgba(251, 173, 80, 0.06)'
                              : index % 2 === 0 ? 'var(--bg-row-alt)' : 'transparent',
                            borderLeft: suspicion ? '3px solid rgba(251, 173, 80, 0.5)' : undefined,
                          }}
                        >
                          <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>{index + 1}</td>
                          <td style={{ padding: '11px 14px', fontWeight: 600 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              @{person.username}
                              {suspicion && (
                                <span
                                  title={`Şüpheli: ${suspicion.signals.join(' · ')} (skor: ${(suspicion.score * 100).toFixed(0)}%)`}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'help' }}
                                >
                                  <AlertTriangle size={13} color="var(--insta-orange)" />
                                  <button
                                    type="button"
                                    onClick={() => handleClearSuspicion(person.username)}
                                    title="Şüpheyi kaldır"
                                    style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '10px', lineHeight: 1 }}
                                  >
                                    ✕
                                  </button>
                                </span>
                              )}
                            </span>
                          </td>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  Sütun başlıklarına tıklayarak sıralayabilirsiniz. {sortConfig ? 'Tekrar tıklayın: ters sıra · üçüncü tıkta varsayılana dön.' : 'Varsayılan: çekiliş hakkı (azalan).'}
                </p>
                {suspiciousParticipants.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.25)', flexShrink: 0 }}
                    onClick={handleBlockSuspicious}
                  >
                    <ShieldX size={13} /> Şüpheli hesapları engelle ({suspiciousParticipants.length} kişi)
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="glass-container step-card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Çekiliş Özeti</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', width: '100%', textAlign: 'center', marginBottom: '20px' }}>
            <div className="stat-cell">
              <span className="stat-label">Yorum</span>
              <strong className="stat-value">{comments.length}</strong>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Kişi</span>
              <strong className="stat-value">{uniqueCommentUsers}</strong>
            </div>
            {likersCount > 0 && (
              <div className="stat-cell" style={{ background: 'rgba(251, 173, 80, 0.08)', border: '1px solid rgba(251, 173, 80, 0.3)' }}>
                <span className="stat-label">Beğeni</span>
                <strong className="stat-value" style={{ color: 'var(--insta-orange)' }}>{likersCount}</strong>
              </div>
            )}
            {replyCount > 0 && (
              <div className="stat-cell" style={{ background: 'rgba(64, 93, 230, 0.08)', border: '1px solid rgba(64, 93, 230, 0.25)' }}>
                <span className="stat-label">Alt Yorum</span>
                <strong className="stat-value" style={{ color: 'var(--insta-blue)' }}>{replyCount}</strong>
              </div>
            )}
            <div className="stat-cell">
              <span className="stat-label">Geçerli</span>
              <strong className="stat-value" style={{ color: 'var(--insta-orange)' }}>{uniqueParticipantsCount}</strong>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Bilet</span>
              <strong className="stat-value" style={{ color: 'var(--insta-pink)' }}>{ticketsPool.length}</strong>
            </div>
          </div>
          {likersCount > 0 && form.participationCriteria?.requireLike && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: '16px', fontSize: '13px', color: '#10b981' }}>
              <CheckCircle size={14} />
              <span>
                Beğeni filtresi aktif: <strong>{uniqueCommentUsers}</strong> yorumcu arasından <strong>{likersCount}</strong> beğenen tespit edildi → <strong>{uniqueParticipantsCount}</strong> katılımcı çekilişe alındı
              </span>
            </div>
          )}
          {likersCount === 0 && form.participationCriteria?.requireLike && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(251, 173, 80, 0.08)', border: '1px solid rgba(251, 173, 80, 0.35)', marginBottom: '16px', fontSize: '13px', color: 'var(--insta-orange)' }}>
              <AlertTriangle size={14} />
              <span>
                <strong>Beğeni şartı aktif</strong> ama beğeni listesi henüz aktarılmadı. Kazananlar doğrulanırken «Gönderiyi beğendi» maddesini manuel kontrol edin veya eklentiden beğeni listesini aktarın.
              </span>
            </div>
          )}
          {followRuleActive && likersCount > 0 && (
            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(64, 93, 230, 0.07)', border: '1px solid rgba(64, 93, 230, 0.2)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', flex: 1 }}>
                  <strong style={{ color: 'var(--insta-blue)' }}>{likersCount} beğeninin</strong> takip şartını karşılayıp karşılamadığını eklenti ile doğrulayın.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn--sm"
                  style={{ flexShrink: 0 }}
                  onClick={() => handlePrepareLikerFollowVerification(likers)}
                >
                  <UserCheck size={14} /> Beğenenlerin Takibini Doğrula
                </button>
              </div>
              {likerFollowVerifyMessage && (
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: likerFollowVerifyPending ? 'var(--insta-orange)' : '#10b981' }}>
                  {likerFollowVerifyMessage}
                </p>
              )}
            </div>
          )}
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
