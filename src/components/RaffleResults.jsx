import React, { useState, useEffect } from 'react';
import { Trophy, Download, Share2, RefreshCw, XCircle, ExternalLink } from 'lucide-react';
import { generateResultsStory } from '../utils/generateResultsStory';
import { parseFollowAccountList, isFollowRuleActive } from '../utils/followRules';

export default function RaffleResults({
  winners: initialWinners,
  substitutes: initialSubstitutes,
  brand = {},
  prizes = [],
  showPrizeProductsInResultsStory = false,
  storyBackgroundId,
  requiredFollowAccounts = '',
  minRequiredFollows = 0,
  followVerification = {},
  onReset,
  onBackToAnnouncement,
}) {
  const [winners, setWinners] = useState([...initialWinners]);
  const [substitutes, setSubstitutes] = useState([...initialSubstitutes]);
  const [verificationState, setVerificationState] = useState({});
  const [generatingStory, setGeneratingStory] = useState(false);
  const [showPrizeProducts, setShowPrizeProducts] = useState(showPrizeProductsInResultsStory);

  useEffect(() => {
    setShowPrizeProducts(showPrizeProductsInResultsStory);
  }, [showPrizeProductsInResultsStory]);

  const hasBrand = brand && (brand.name || brand.logo || brand.raffleName);
  const activePrizes = prizes?.length > 0 ? prizes : [];
  const followAccounts = parseFollowAccountList(requiredFollowAccounts);
  const followRuleActive = isFollowRuleActive(requiredFollowAccounts, minRequiredFollows);

  const getFollowVerificationForUser = (username) => followVerification[username.toLowerCase()] || null;

  const getPrizeForWinner = (person) => {
    if (person.prizeId && activePrizes.length > 0) {
      return activePrizes.find(p => p.id === person.prizeId);
    }
    return null;
  };

  const getPrizeGroups = () => {
    if (activePrizes.length > 0) {
      return activePrizes.map((prize, idx) => ({
        prize,
        label: prize.name || `${idx + 1}. Ödül`,
        winners: winners.filter(w => w.prizeId === prize.id),
        substitutes: substitutes.filter(s => s.prizeId === prize.id)
      }));
    }
    return [{
      prize: null,
      label: 'Ödül',
      winners,
      substitutes
    }];
  };

  const handleVerifyChange = (username, type) => {
    setVerificationState(prev => ({
      ...prev,
      [username]: {
        ...prev[username],
        [type]: !prev[username]?.[type]
      }
    }));
  };

  const handleDisqualify = (winnerToDisqualify) => {
    const prizeId = winnerToDisqualify.prizeId;
    const prizeSubs = substitutes
      .filter(s => !prizeId || s.prizeId === prizeId)
      .sort((a, b) => a.stepIndex - b.stepIndex);

    if (prizeSubs.length === 0) {
      alert('Bu ödül için yedek listesinde başka üye kalmadı!');
      return;
    }

    const confirmDisqualify = window.confirm(
      `@${winnerToDisqualify.username} adlı katılımcıyı diskalifiye etmek ve yerine ilk yedeği kaydırmak istediğinize emin misiniz?`
    );
    if (!confirmDisqualify) return;

    const nextInLine = prizeSubs[0];

    const updatedSubstitutes = substitutes
      .filter(s => s !== nextInLine)
      .map(s => {
        if (prizeId && s.prizeId === prizeId && s.stepIndex > nextInLine.stepIndex) {
          return { ...s, stepIndex: s.stepIndex - 1 };
        }
        return s;
      });

    const updatedWinners = winners.map(w => {
      if (
        w.username.toLowerCase() === winnerToDisqualify.username.toLowerCase() &&
        w.prizeId === winnerToDisqualify.prizeId &&
        w.stepIndex === winnerToDisqualify.stepIndex
      ) {
        return { ...nextInLine, stepIndex: w.stepIndex };
      }
      return w;
    });

    setWinners(updatedWinners);
    setSubstitutes(updatedSubstitutes);
  };

  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Tip,Sira,Odul,Kullanici Adi,Yorum,Bilet Hak Sayisi\n';

    winners.forEach((w) => {
      const commentClean = w.comment.replace(/"/g, '""');
      csvContent += `Asil,${w.stepIndex || 1},"${w.prizeName || ''}",@${w.username},"${commentClean}",${w.totalTickets || 1}\n`;
    });

    substitutes.forEach((s) => {
      const commentClean = s.comment.replace(/"/g, '""');
      csvContent += `Yedek,${s.stepIndex || 1},"${s.prizeName || ''}",@${s.username},"${commentClean}",${s.totalTickets || 1}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'cekilis_sonuclari.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateStoryImage = async () => {
    setGeneratingStory(true);
    try {
      await generateResultsStory({
        brand,
        prizes: activePrizes,
        winners,
        substitutes,
        showPrizeProducts,
        storyBackgroundId,
      });
    } catch (err) {
      alert('Story görseli oluşturulurken bir hata oluştu.');
      console.error(err);
    } finally {
      setGeneratingStory(false);
    }
  };

  const renderPersonCard = (person, type, globalIdx) => {
    const prize = getPrizeForWinner(person);
    const isWinner = type === 'winner';
    const badgeColor = isWinner ? 'var(--insta-pink)' : 'var(--insta-orange)';
    const badgeLabel = isWinner ? `ASİL #${person.stepIndex || globalIdx + 1}` : `YEDEK #${person.stepIndex || globalIdx + 1}`;

    return (
      <div
        key={`${person.prizeId}-${person.stepIndex}-${person.username}-${type}`}
        className="glass-container"
        style={{
          padding: isWinner ? '16px' : '12px 16px',
          background: 'var(--bg-inset)',
          display: 'flex',
          flexDirection: 'column',
          gap: isWinner ? '12px' : '8px',
          borderColor: isWinner ? 'rgba(225,48,108,0.15)' : 'rgba(251,173,80,0.15)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {prize?.image && (
              <img
                src={prize.image}
                alt={prize.name}
                style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px', background: 'var(--bg-muted)' }}
              />
            )}
            <div>
              <span style={{ fontSize: isWinner ? '11px' : '10px', background: badgeColor, color: 'white', padding: isWinner ? '2px 8px' : '1px 6px', borderRadius: '20px', fontWeight: 700, marginRight: '8px' }}>
                {badgeLabel}
              </span>
              <a
                href={`https://instagram.com/${person.username}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-main)', fontWeight: isWinner ? 700 : 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: isWinner ? '15px' : '14px' }}
              >
                @{person.username} <ExternalLink size={12} color="var(--text-muted)" />
              </a>
            </div>
          </div>

          {isWinner && (
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '11px', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', background: 'rgba(239,68,68,0.05)' }}
              onClick={() => handleDisqualify(person)}
            >
              <XCircle size={12} /> Diskalifiye Et
            </button>
          )}
        </div>

        {person.prizeName ? (
          <p style={{ fontStyle: 'italic', fontSize: isWinner ? '14px' : '12px', color: 'var(--insta-yellow)', background: 'var(--bg-muted)', padding: isWinner ? '10px' : '8px', borderRadius: '8px', border: '1px solid var(--glass-border)', margin: 0, fontWeight: 600 }}>
            🎁 {isWinner ? 'Kazandığı Ödül' : 'Ödül'}: {person.prizeName}
          </p>
        ) : (
          <p style={{ fontStyle: 'italic', fontSize: isWinner ? '13px' : '12px', color: 'var(--text-muted)', background: isWinner ? 'var(--bg-muted)' : 'transparent', padding: isWinner ? '10px' : 0, borderRadius: '8px', border: isWinner ? '1px solid var(--glass-border)' : 'none', margin: 0 }}>
            "{person.comment}"
          </p>
        )}

        {isWinner && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--glass-border)', paddingTop: '10px', fontSize: '12px' }}>
            {followRuleActive ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Takip şartı (eklenti doğrulaması)</span>
                {followAccounts.map((account) => {
                  const verification = getFollowVerificationForUser(person.username);
                  const followed = verification?.followed?.includes(account);
                  const unknown = !verification?.verified;
                  return (
                    <label key={account} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        checked={followed || verificationState[person.username]?.[`follow_${account}`] || false}
                        onChange={() => handleVerifyChange(person.username, `follow_${account}`)}
                        style={{ cursor: 'pointer', accentColor: 'var(--insta-pink)' }}
                      />
                      <span>@{account} {unknown ? '(doğrulanmadı)' : followed ? '✓' : '✗'}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={verificationState[person.username]?.follow || false}
                  onChange={() => handleVerifyChange(person.username, 'follow')}
                  style={{ cursor: 'pointer', accentColor: 'var(--insta-pink)' }}
                />
                <span>Hesabı Takip Ediyor</span>
              </label>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={verificationState[person.username]?.like || false}
                onChange={() => handleVerifyChange(person.username, 'like')}
                style={{ cursor: 'pointer', accentColor: 'var(--insta-pink)' }}
              />
              <span>Gönderiyi Beğendi</span>
            </label>
          </div>
        )}
      </div>
    );
  };

  const prizeGroups = getPrizeGroups();

  return (
    <div style={{ width: '100%', maxWidth: '960px', margin: '0 auto', padding: '20px' }}>

      {hasBrand && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px', background: 'var(--bg-inset)', padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
          {brand.logo && (
            <img src={brand.logo} alt="Marka logosu" style={{ height: '60px', objectFit: 'contain', borderRadius: '10px' }} />
          )}
          <div style={{ textAlign: brand.logo ? 'left' : 'center' }}>
            {brand.raffleName && (
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--insta-yellow)' }}>{brand.raffleName}</h2>
            )}
            {brand.name && (
              <p style={{ margin: brand.raffleName ? '4px 0 0' : 0, fontSize: '15px', color: 'var(--text-main)', opacity: 0.9 }}>{brand.name}</p>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', mdDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '26px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎉 Çekiliş Sonuçlandı!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Kazananları kontrol edebilir, yedekleri kaydırabilir veya sonucu görsel olarak indirebilirsiniz.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%', mdWidth: 'auto', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
          {onBackToAnnouncement && (
            <button type="button" className="btn btn-secondary" onClick={onBackToAnnouncement}>
              <ExternalLink size={16} /> İlan Sayfasına Dön
            </button>
          )}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-muted)' }}>
            <input
              type="checkbox"
              checked={showPrizeProducts}
              onChange={(e) => setShowPrizeProducts(e.target.checked)}
              style={{ accentColor: 'var(--insta-pink)' }}
            />
            Ürün görsellerini story&apos;de göster
          </label>
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <Download size={16} /> CSV İndir
          </button>
          <button className="btn btn-primary" onClick={generateStoryImage} disabled={generatingStory}>
            <Share2 size={16} /> {generatingStory ? 'Oluşturuluyor...' : 'Story Görseli Oluştur 🚀'}
          </button>
          <button className="btn btn-secondary" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }} onClick={onReset}>
            <RefreshCw size={16} /> Yeni Çekiliş
          </button>
        </div>
      </div>

      {activePrizes.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', justifyContent: 'center' }}>
          {activePrizes.map((prize, idx) => (
            <div
              key={prize.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--bg-inset)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                padding: '10px 14px'
              }}
            >
              {prize.image ? (
                <img src={prize.image} alt={prize.name} style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--bg-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  {idx + 1}
                </div>
              )}
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--insta-yellow)' }}>{prize.name || `${idx + 1}. Ödül`}</strong>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {prize.winnerCount} asil · {prize.substituteCount} yedek
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {prizeGroups.map((group) => (
        <div key={group.prize?.id || 'default'} style={{ marginBottom: '32px' }}>
          {(activePrizes.length > 1 || group.prize?.image) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--glass-border)' }}>
              {group.prize?.image && (
                <img src={group.prize.image} alt={group.label} style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: '10px', background: 'var(--bg-inset)' }} />
              )}
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--insta-yellow)' }}>
                {group.label}
              </h3>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div className="glass-container" style={{ padding: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 800, color: 'var(--insta-pink)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                <Trophy size={18} /> Asil Kazananlar
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {group.winners.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>Asil kazanan yok.</p>
                ) : (
                  group.winners
                    .sort((a, b) => a.stepIndex - b.stepIndex)
                    .map((winner, idx) => renderPersonCard(winner, 'winner', idx))
                )}
              </div>
            </div>

            <div className="glass-container" style={{ padding: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 800, color: 'var(--insta-orange)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                ⏱️ Yedek Kazananlar
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {group.substitutes.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>Yedek kazanan belirlenmedi.</p>
                ) : (
                  group.substitutes
                    .sort((a, b) => a.stepIndex - b.stepIndex)
                    .map((sub, idx) => renderPersonCard(sub, 'substitute', idx))
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

    </div>
  );
}
