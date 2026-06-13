import { useEffect, useMemo, useState } from 'react';
import {
  Award, Megaphone, Plus, Trophy, Clock, CheckCircle2, ChevronRight, Loader2, Trash2,
} from 'lucide-react';
import { loadRaffleDisplayBundle } from '../utils/setupStorage';
import RaffleAnnouncementDetail from './RaffleAnnouncementDetail';
import HowItWorksSection from './HowItWorksSection';

function formatRaffleDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getEntryPhase(entry) {
  if (entry.drawResults?.winners?.length > 0) return 'completed';
  const summary = entry.summary || {};
  if (summary.raffleName || summary.brandName || summary.prizeCount > 0) return 'configured';
  return 'empty';
}

function getEntryTitle(entry) {
  return entry.summary?.raffleName?.trim()
    || entry.summary?.brandName?.trim()
    || 'İsimsiz çekiliş';
}

export default function RaffleAnnouncement({
  raffleEntries,
  onCreateRaffle,
  onDeleteRaffle,
  onDefineConfig,
  onStartScheduled,
}) {
  const PAGE_SIZE = 8;
  const [activeTab, setActiveTab] = useState('ongoing');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [detailBundle, setDetailBundle] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const visibleEntries = useMemo(
    () => raffleEntries.filter((entry) => getEntryPhase(entry) !== 'empty'),
    [raffleEntries]
  );

  const ongoingEntries = useMemo(
    () => visibleEntries.filter((entry) => getEntryPhase(entry) !== 'completed'),
    [visibleEntries]
  );

  const completedEntries = useMemo(
    () => visibleEntries.filter((entry) => getEntryPhase(entry) === 'completed'),
    [visibleEntries]
  );

  const tabEntries = activeTab === 'completed' ? completedEntries : ongoingEntries;
  const totalPages = Math.ceil(tabEntries.length / PAGE_SIZE);
  const pagedEntries = tabEntries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    if (!selectedId) {
      setDetailBundle(null);
      return undefined;
    }

    let cancelled = false;
    setDetailLoading(true);
    loadRaffleDisplayBundle(selectedId)
      .then((bundle) => {
        if (!cancelled) setDetailBundle(bundle);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedId]);

  if (selectedId) {
    return (
      <div className="announcement-page">
        {detailLoading ? (
          <div className="announcement-loading">
            <Loader2 size={28} className="spin-icon" />
            <span>İlan yükleniyor…</span>
          </div>
        ) : (
          <RaffleAnnouncementDetail
            bundle={detailBundle}
            raffleId={selectedId}
            onBack={() => setSelectedId(null)}
            onDefineConfig={(id) => {
              setSelectedId(null);
              onDefineConfig(id);
            }}
            onStartScheduled={(id) => {
              setSelectedId(null);
              onStartScheduled(id);
            }}
          />
        )}
        <HowItWorksSection />
      </div>
    );
  }

  return (
    <div className="announcement-page">
      <div className="glass-container announcement-list-header">
        <div>
          <div className="announcement-list-kicker">
            <Megaphone size={14} /> Çekiliş İlanları
          </div>
          <h1 className="announcement-list-title">Aktif ve tamamlanan çekilişler</h1>
          <p className="announcement-list-subtitle">
            Bir ilana tıklayarak ödülleri, kuralları ve sonuçları görüntüleyin.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onCreateRaffle}>
          <Plus size={16} /> Yeni Çekiliş
        </button>
      </div>

      <div className="announcement-tabs" role="tablist" aria-label="Çekiliş durumu">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ongoing'}
          className={`announcement-tab${activeTab === 'ongoing' ? ' active' : ''}`}
          onClick={() => { setActiveTab('ongoing'); setPage(0); }}
        >
          <Clock size={15} />
          Devam Edenler
          <span className="announcement-tab-count">{ongoingEntries.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'completed'}
          className={`announcement-tab${activeTab === 'completed' ? ' active' : ''}`}
          onClick={() => { setActiveTab('completed'); setPage(0); }}
        >
          <CheckCircle2 size={15} />
          Tamamlananlar
          <span className="announcement-tab-count">{completedEntries.length}</span>
        </button>
      </div>

      {tabEntries.length === 0 ? (
        <div className="glass-container announcement-empty">
          <Award size={36} color="var(--insta-pink)" style={{ opacity: 0.7 }} />
          <h2>
            {activeTab === 'completed' ? 'Henüz tamamlanan çekiliş yok' : 'Devam eden çekiliş yok'}
          </h2>
          <p>
            {activeTab === 'completed'
              ? 'Tamamlanan çekilişler burada listelenir.'
              : 'Yeni bir çekiliş tanımlayın; ilan burada görünecek.'}
          </p>
          {activeTab === 'ongoing' && (
            <button type="button" className="btn btn-secondary" onClick={onCreateRaffle}>
              <Plus size={16} /> İlk Çekilişi Tanımla
            </button>
          )}
        </div>
      ) : (
        <div className="announcement-list">
          {pagedEntries.map((entry) => {
            const phase = getEntryPhase(entry);
            const winnerCount = entry.drawResults?.winners?.length || 0;
            const isConfirmingDelete = deletingId === entry.id;
            return (
              <div
                key={entry.id}
                className="announcement-card glass-container"
                role="button"
                tabIndex={0}
                onClick={() => { if (!isConfirmingDelete) setSelectedId(entry.id); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isConfirmingDelete) setSelectedId(entry.id); } }}
              >
                <div className="announcement-card-icon">
                  {phase === 'completed' ? (
                    <Trophy size={22} color="var(--insta-yellow)" />
                  ) : (
                    <Megaphone size={22} color="var(--insta-pink)" />
                  )}
                </div>
                <div className="announcement-card-body">
                  <strong>{getEntryTitle(entry)}</strong>
                  {entry.summary?.brandName && entry.summary?.raffleName && (
                    <span className="announcement-card-meta">{entry.summary.brandName}</span>
                  )}
                  <span className="announcement-card-meta">
                    {entry.summary?.prizeCount > 0
                      ? `${entry.summary.prizeCount} ödül`
                      : 'Ödül tanımlanmadı'}
                    {phase === 'completed' && winnerCount > 0 ? ` · ${winnerCount} kazanan` : ''}
                    {entry.updatedAt ? ` · ${formatRaffleDate(entry.updatedAt)}` : ''}
                  </span>
                </div>
                {isConfirmingDelete ? (
                  <div
                    style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ fontSize: '13px', padding: '4px 10px' }}
                      onClick={(e) => { e.stopPropagation(); onDeleteRaffle(entry.id); setDeletingId(null); }}
                    >
                      Sil
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '13px', padding: '4px 10px' }}
                      onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                    >
                      İptal
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label="Çekilişi sil"
                      className="announcement-card-delete"
                      onClick={(e) => { e.stopPropagation(); setDeletingId(entry.id); }}
                    >
                      <Trash2 size={15} />
                    </button>
                    <ChevronRight size={18} className="announcement-card-chevron" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', margin: '8px 0 16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '13px' }}
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹ Önceki
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{page + 1} / {totalPages}</span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '13px' }}
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Sonraki ›
          </button>
        </div>
      )}

      <HowItWorksSection />
    </div>
  );
}
