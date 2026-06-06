import React, { useState } from 'react';
import { Trophy, ArrowRight, Download, Share2, RefreshCw, XCircle, Check, ExternalLink } from 'lucide-react';

export default function RaffleResults({ winners: initialWinners, substitutes: initialSubstitutes, onReset }) {
  const [winners, setWinners] = useState([...initialWinners]);
  const [substitutes, setSubstitutes] = useState([...initialSubstitutes]);
  const [verificationState, setVerificationState] = useState({}); // { username: { follow: bool, like: bool } }

  // Checkbox Değişim Dinleyicisi
  const handleVerifyChange = (username, type) => {
    setVerificationState(prev => ({
      ...prev,
      [username]: {
        ...prev[username],
        [type]: !prev[username]?.[type]
      }
    }));
  };

  // Kazananı Elemek ve Yedek Üyeyi Kaydırmak
  const handleDisqualify = (winnerToDisqualify) => {
    if (substitutes.length === 0) {
      alert('Yedek listesinde başka üye kalmadığı için kaydırma işlemi yapılamaz!');
      return;
    }

    const confirmDisqualify = window.confirm(`@${winnerToDisqualify.username} adlı katılımcıyı diskalifiye etmek ve yerine ilk yedeği kaydırmak istediğinize emin misiniz?`);
    if (!confirmDisqualify) return;

    // 1. İlk yedeği al
    const nextInLine = substitutes[0];
    
    // 2. Yedekler listesinden ilkini çıkart, diğerlerini yukarı kaydır ve indekslerini güncelle
    const updatedSubstitutes = substitutes.slice(1).map((s, idx) => ({
      ...s,
      stepIndex: idx + 1
    }));

    // 3. Kazananlar listesinde elenenin yerine yedeği ata
    const updatedWinners = winners.map(w => {
      if (w.username.toLowerCase() === winnerToDisqualify.username.toLowerCase()) {
        return {
          ...nextInLine,
          stepIndex: w.stepIndex // Aynı sıra numarasını koru
        };
      }
      return w;
    });

    setWinners(updatedWinners);
    setSubstitutes(updatedSubstitutes);
  };

  // CSV Dışa Aktarma
  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Tip,Sira,Kullanici Adi,Yorum,Bilet Hak Sayisi\n';

    winners.forEach((w, idx) => {
      const commentClean = w.comment.replace(/"/g, '""');
      csvContent += `Asil,${idx + 1},@${w.username},"${commentClean}",${w.totalTickets || 1}\n`;
    });

    substitutes.forEach((s, idx) => {
      const commentClean = s.comment.replace(/"/g, '""');
      csvContent += `Yedek,${idx + 1},@${s.username},"${commentClean}",${s.totalTickets || 1}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'cekilis_sonuclari.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Instagram Story Sertifikası Oluşturma (HTML Canvas 9:16)
  const generateStoryImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // 1. Arka Plan degrade
    const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
    grad.addColorStop(0, '#f91f79');
    grad.addColorStop(0.5, '#b92b97');
    grad.addColorStop(1, '#773cb5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Işık halkaları
    ctx.fillStyle = 'rgba(252, 204, 99, 0.15)';
    ctx.beginPath();
    ctx.arc(200, 300, 450, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(64, 93, 230, 0.18)';
    ctx.beginPath();
    ctx.arc(880, 1600, 550, 0, Math.PI * 2);
    ctx.fill();

    // 2. Cam Efekti Kartı (Glass Card)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;

    const cardX = 80;
    const cardY = 160;
    const cardW = 920;
    const cardH = 1600;
    const cardR = 40;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
    } else {
      ctx.rect(cardX, cardY, cardW, cardH);
    }
    ctx.fill();
    ctx.stroke();

    // 3. Başlık
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 72px Outfit';
    ctx.fillText('ÇEKİLİŞ SONUÇLARI', 540, 310);

    ctx.font = '500 32px Inter';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('Katılan ve Kazanan Herkesi Tebrik Ederiz!', 540, 370);

    // Ayırıcı Çizgi
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(150, 420);
    ctx.lineTo(930, 420);
    ctx.stroke();

    // 4. Asiller Bölümü
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px Outfit';
    ctx.fillText('🏆 ASİL KAZANANLAR', 540, 500);

    let currentY = 570;
    const maxWinnersToShow = 6; // Ekrana sığması için sınırlı tutalım

    winners.slice(0, maxWinnersToShow).forEach((winner, idx) => {
      // Satır kartı
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(150, currentY - 50, 780, 90, 20);
      } else {
        ctx.rect(150, currentY - 50, 780, 90);
      }
      ctx.fill();

      // Sıra ve İsim
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(`${idx + 1}. @${winner.username}`, 190, currentY + 8);

      // Yorum (kırpılmış)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'italic 24px Inter';
      ctx.textAlign = 'right';
      const commentClean = winner.comment.length > 25 ? winner.comment.slice(0, 23) + '...' : winner.comment;
      ctx.fillText(`"${commentClean}"`, 890, currentY + 8);

      currentY += 120;
    });

    if (winners.length > maxWinnersToShow) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 28px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`+ ${winners.length - maxWinnersToShow} asil kazanan daha...`, 540, currentY - 20);
      currentY += 40;
    }

    // Yedek Bölümü Ayırıcı
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(150, currentY - 20);
    ctx.lineTo(930, currentY - 20);
    ctx.stroke();

    currentY += 40;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('⏱️ YEDEK KAZANANLAR', 540, currentY);

    currentY += 80;
    const maxSubstitutesToShow = 5;

    substitutes.slice(0, maxSubstitutesToShow).forEach((sub, idx) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(170, currentY - 40, 740, 74, 15);
      } else {
        ctx.rect(170, currentY - 40, 740, 74);
      }
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = 'bold 30px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(`${idx + 1}. @${sub.username}`, 210, currentY + 8);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = 'italic 22px Inter';
      ctx.textAlign = 'right';
      const commentClean = sub.comment.length > 28 ? sub.comment.slice(0, 26) + '...' : sub.comment;
      ctx.fillText(`"${commentClean}"`, 870, currentY + 8);

      currentY += 98;
    });

    if (substitutes.length > maxSubstitutesToShow) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 28px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`+ ${substitutes.length - maxSubstitutesToShow} yedek kazanan daha...`, 540, currentY - 20);
    }

    // 5. Alt Bilgi
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '600 24px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('instagram-cekilis-uygulamasi.github.io', 540, 1710);

    // İndirme işlemini tetikle
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cekilis_sonuclari_story.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert('Sertifika resmi oluşturulurken bir hata oluştu.');
      console.error(err);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
      
      {/* BAŞLIK VE ORTAK EYLEMLER */}
      <div style={{ display: 'flex', flexDirection: 'column', mdDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '26px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎉 Çekiliş Sonuçlandı!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Kazananları kontrol edebilir, yedekleri kaydırabilir veya sonucu görsel olarak indirebilirsiniz.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%', mdWidth: 'auto', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={exportToCSV}>
            <Download size={16} /> CSV İndir
          </button>
          <button className="btn btn-primary" onClick={generateStoryImage}>
            <Share2 size={16} /> Story Görseli Oluştur 🚀
          </button>
          <button className="btn btn-secondary" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }} onClick={onReset}>
            <RefreshCw size={16} /> Yeni Çekiliş
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* ASİL KAZANANLAR LİSTESİ */}
        <div className="glass-container" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 800, color: 'var(--insta-pink)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
            <Trophy size={20} /> Asil Kazananlar
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {winners.map((winner, idx) => (
              <div 
                key={idx} 
                className="glass-container" 
                style={{ 
                  padding: '16px', 
                  background: 'rgba(0,0,0,0.2)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  borderColor: 'rgba(225,48,108,0.15)'
                }}
              >
                {/* Profil Detay */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', background: 'var(--insta-pink)', color: 'white', padding: '2px 8px', borderRadius: '20px', fontWeight: 700, marginRight: '8px' }}>
                      ASİL #{idx + 1}
                    </span>
                    <a 
                      href={`https://instagram.com/${winner.username}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: 'white', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '15px' }}
                    >
                      @{winner.username} <ExternalLink size={12} color="var(--text-muted)" />
                    </a>
                  </div>
                  
                  {/* Diskalifiye Butonu */}
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: '11px', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', background: 'rgba(239,68,68,0.05)' }}
                    onClick={() => handleDisqualify(winner)}
                  >
                    <XCircle size={12} /> Diskalifiye Et (Yedek Kaydır)
                  </button>
                </div>

                {/* Yorum */}
                <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', margin: 0 }}>
                  "{winner.comment}"
                </p>

                {/* Manuel Kontrol Listesi */}
                <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '10px', fontSize: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={verificationState[winner.username]?.follow || false}
                      onChange={() => handleVerifyChange(winner.username, 'follow')}
                      style={{ cursor: 'pointer', accentColor: 'var(--insta-pink)' }}
                    />
                    <span>Hesabı Takip Ediyor</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={verificationState[winner.username]?.like || false}
                      onChange={() => handleVerifyChange(winner.username, 'like')}
                      style={{ cursor: 'pointer', accentColor: 'var(--insta-pink)' }}
                    />
                    <span>Gönderiyi Beğendi</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* YEDEK KAZANANLAR LİSTESİ */}
        <div className="glass-container" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 800, color: 'var(--insta-orange)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
            ⏱️ Yedek Kazananlar
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {substitutes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Yedek kazanan belirlenmedi.</p>
            ) : (
              substitutes.map((sub, idx) => (
                <div 
                  key={idx} 
                  className="glass-container" 
                  style={{ 
                    padding: '12px 16px', 
                    background: 'rgba(0,0,0,0.15)', 
                    borderColor: 'rgba(251,173,80,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '10px', background: 'var(--insta-orange)', color: 'white', padding: '1px 6px', borderRadius: '20px', fontWeight: 700, marginRight: '8px' }}>
                        YEDEK #{idx + 1}
                      </span>
                      <a 
                        href={`https://instagram.com/${sub.username}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: 'white', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}
                      >
                        @{sub.username} <ExternalLink size={12} color="var(--text-muted)" />
                      </a>
                    </div>
                  </div>
                  
                  <p style={{ fontStyle: 'italic', fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                    "{sub.comment}"
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
