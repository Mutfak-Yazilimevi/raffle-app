import {
  Award, ExternalLink, Settings, Play, Zap, Trophy, Megaphone, CheckCircle2, ArrowLeft,
} from 'lucide-react';
import { resolveInstagramUrl } from '../config';
import { getRulesSummaryLines } from '../utils/raffleConfigFile';
import { parseParticipationCriteria } from '../utils/participationCriteria';
import { getScheduleSummaryLines, hasScheduleInfo } from '../utils/raffleSchedule';

export default function RaffleAnnouncementDetail({
  bundle,
  raffleId,
  onBack,
  onDefineConfig,
  onStartScheduled,
}) {
  if (!bundle?.setup) return null;

  const { setup, drawResults, phase } = bundle;
  const brand = setup.brand || {};
  const prizes = setup.prizes || [];
  const rules = {
    entryMethod: setup.entryMethod,
    minMentions: setup.minMentions,
    mentionMode: setup.mentionMode,
    weightedEntry: setup.weightedEntry,
    uniqueMentions: setup.uniqueMentions,
    keywordRequired: setup.keywordRequired,
    keywordBlacklist: setup.keywordBlacklist,
    userBlacklist: setup.userBlacklist,
    requiredFollowAccounts: setup.requiredFollowAccounts,
    ...parseParticipationCriteria(setup),
  };
  const ruleLines = getRulesSummaryLines(rules);
  const scheduleLines = getScheduleSummaryLines(brand);
  const instagramUrl = resolveInstagramUrl(brand.postUrl);
  const title = brand.raffleName || 'Çekiliş Duyurusu';
  const winners = drawResults?.winners || [];

  const prizeGroups = prizes.map((prize, idx) => ({
    prize,
    label: prize.name || `${idx + 1}. Ödül`,
    winners: winners.filter((w) => w.prizeId === prize.id),
  }));

  return (
    <>
      <button type="button" className="announcement-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> İlan listesine dön
      </button>

      <div className="glass-container" style={{ padding: '32px 28px', textAlign: 'center', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'var(--insta-gradient)', opacity: 0.06, pointerEvents: 'none' }} />
        {brand.logo && (
          <img
            src={brand.logo}
            alt=""
            style={{ height: '72px', maxWidth: '200px', objectFit: 'contain', marginBottom: '16px', borderRadius: '12px' }}
          />
        )}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--insta-pink)', marginBottom: '12px', fontWeight: 700 }}>
          <Megaphone size={14} /> Çekiliş İlanı
        </div>
        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 }}>
          {title}
        </h1>
        {brand.name && (
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted)' }}>{brand.name}</p>
        )}
        {phase === 'completed' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '16px', padding: '8px 16px', borderRadius: '50px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#10b981', fontSize: '13px', fontWeight: 600 }}>
            <CheckCircle2 size={16} /> Çekiliş tamamlandı
          </div>
        )}
      </div>

      {hasScheduleInfo(brand) && (
        <div className="glass-container" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Çekiliş Takvimi</h2>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: 1.9, color: 'var(--text-main)' }}>
            {scheduleLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {prizes.some((p) => p.name || p.image) && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award className="gradient-text" size={20} /> Ödüller
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {prizes.map((prize, idx) => (
              <div
                key={prize.id}
                className="glass-container"
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}
              >
                {prize.image ? (
                  <img src={prize.image} alt="" style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '10px', background: 'var(--bg-inset)', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '64px', height: '64px', borderRadius: '10px', background: 'rgba(225,48,108,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Award size={28} color="var(--insta-pink)" />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '16px', marginBottom: '4px' }}>
                    {prize.name || `${idx + 1}. Ödül`}
                  </strong>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {prize.winnerCount} asil · {prize.substituteCount} yedek kazanan
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ruleLines.length > 0 && (
        <div className="glass-container" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Katılım Kuralları</h2>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: 1.9, color: 'var(--text-main)' }}>
            {ruleLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {phase !== 'completed' && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary pulse-glow"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: 700,
            textDecoration: 'none',
            marginBottom: '24px',
          }}
        >
          <ExternalLink size={20} /> Instagram&apos;da Katıl
        </a>
      )}

      {phase === 'completed' && winners.length > 0 && (
        <div className="glass-container" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={20} color="var(--insta-yellow)" /> Kazananlar
          </h2>
          {prizeGroups.map((group) => (
            <div key={group.prize.id} style={{ marginBottom: group === prizeGroups[prizeGroups.length - 1] ? 0 : '20px' }}>
              {prizes.length > 1 && (
                <h3 style={{ fontSize: '14px', color: 'var(--insta-yellow)', margin: '0 0 10px', fontWeight: 700 }}>{group.label}</h3>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {group.winners
                  .sort((a, b) => a.stepIndex - b.stepIndex)
                  .map((w) => (
                    <span
                      key={`${w.username}-${w.stepIndex}`}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '50px',
                        background: 'rgba(225, 48, 108, 0.12)',
                        border: '1px solid rgba(225, 48, 108, 0.25)',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      @{w.username}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-container" style={{ padding: '20px 24px', background: 'var(--bg-muted)', borderStyle: 'dashed', marginBottom: '8px' }}>
        <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
          Organizatör
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => onDefineConfig(raffleId)} style={{ justifyContent: 'center' }}>
            <Settings size={16} /> Çekilişi Düzenle
          </button>
          {phase === 'configured' && (
            <button type="button" className="btn btn-primary pulse-glow" onClick={() => onStartScheduled(raffleId)} style={{ justifyContent: 'center' }}>
              <Play size={16} fill="white" /> Bu Çekilişi Başlat
            </button>
          )}
          {phase === 'completed' && (
            <button type="button" className="btn btn-secondary" onClick={() => onDefineConfig(raffleId)} style={{ justifyContent: 'center', borderColor: 'rgba(251, 173, 80, 0.3)' }}>
              <Zap size={16} color="var(--insta-yellow)" /> Sonuçları Gör / Düzenle
            </button>
          )}
        </div>
      </div>
    </>
  );
}
