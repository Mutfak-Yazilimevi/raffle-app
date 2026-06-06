import React, { useState, useEffect, useRef } from 'react';
import { Award, Volume2, VolumeX, Sparkles, ChevronRight, RefreshCw, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RaffleAnimation({ ticketsPool, winnerCount, substituteCount, onDrawComplete }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [drawingPool, setDrawingPool] = useState([...ticketsPool]);
  const [drawnWinners, setDrawnWinners] = useState([]);
  const [drawnSubstitutes, setDrawnSubstitutes] = useState([]);
  
  // Çekiliş Aşaması Durumu
  // currentStep: { type: 'asil' | 'yedek', index: number }
  const [currentStep, setCurrentStep] = useState({ type: 'asil', index: 1 });
  const [isSpinning, setIsSpinning] = useState(false);
  const [animationNames, setAnimationNames] = useState([]);
  const [slotIndex, setSlotIndex] = useState(0);
  const [winnerTicket, setWinnerTicket] = useState(null);

  const slotListRef = useRef(null);
  const audioContextRef = useRef(null);

  // Ses Sentezleyicisi (Web Audio API)
  const playTickSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.frequency.value = 600; // Tick tonu
      gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.04);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn('Ses çalınamadı:', e);
    }
  };

  const playSuccessSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      // Major chord arpeggio
      const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + (index * 0.08);
        
        gainNode.gain.setValueAtTime(0.08, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + 0.5);
        
        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch (e) {
      console.warn('Ses çalınamadı:', e);
    }
  };

  // Konfeti Fırlatıcı
  const triggerConfetti = () => {
    const duration = 2 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f91f79', '#b92b97', '#773cb5', '#fccc63']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f91f79', '#b92b97', '#773cb5', '#fccc63']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  // Çekiliş Tetikleyici
  const startDraw = () => {
    if (isSpinning || drawingPool.length === 0) return;

    setIsSpinning(true);
    setWinnerTicket(null);

    // 1. Kazanan bileti rastgele seç
    const randomIndex = Math.floor(Math.random() * drawingPool.length);
    const chosenTicket = drawingPool[randomIndex];

    // 2. Arayüzde dönecek isim listesini hazırla
    // Listeyi doldurmak için havuzdan rastgele isimler seçip sonuna kazananı ekleyeceğiz
    const totalItems = 35; // Toplam kayacak isim sayısı
    const tempNames = [];
    for (let i = 0; i < totalItems - 1; i++) {
      const idx = Math.floor(Math.random() * drawingPool.length);
      tempNames.push(drawingPool[idx].username);
    }
    // Son eleman gerçek kazanan
    tempNames.push(chosenTicket.username);
    setAnimationNames(tempNames);

    // 3. Slot animasyonunu başlat
    let currentPos = 0;
    let speed = 40; // Başlangıç milisaniye hızı (hızlı)
    let count = 0;

    const tick = () => {
      setSlotIndex(count);
      playTickSound();
      
      count++;
      if (count < totalItems) {
        // Hızı logaritmik olarak yavaşlat
        if (count > totalItems - 15) {
          speed += 25; // Sonlara doğru yavaşlama
        }
        if (count > totalItems - 5) {
          speed += 60; // Çok yavaşlama
        }
        setTimeout(tick, speed);
      } else {
        // Durdu! Kazanan açıklandı
        setTimeout(() => {
          setWinnerTicket(chosenTicket);
          setIsSpinning(false);
          playSuccessSound();
          triggerConfetti();

          // Kazananı ekle ve havuzdan bu kullanıcının TÜM biletlerini sil
          const wonUser = chosenTicket.username.toLowerCase();
          
          if (currentStep.type === 'asil') {
            setDrawnWinners(prev => [...prev, { ...chosenTicket, stepIndex: currentStep.index }]);
          } else {
            setDrawnSubstitutes(prev => [...prev, { ...chosenTicket, stepIndex: currentStep.index }]);
          }

          // Çekiliş havuzunu güncelle (kazananın diğer tüm biletlerini ele ki tekrar kazanmasın)
          setDrawingPool(prev => prev.filter(t => t.username.toLowerCase() !== wonUser));
        }, 300);
      }
    };

    setTimeout(tick, speed);
  };

  // Sonraki aşamaya geçiş
  const handleNextStep = () => {
    if (currentStep.type === 'asil') {
      if (currentStep.index < winnerCount) {
        setCurrentStep({ type: 'asil', index: currentStep.index + 1 });
        setWinnerTicket(null);
      } else if (substituteCount > 0) {
        setCurrentStep({ type: 'yedek', index: 1 });
        setWinnerTicket(null);
      } else {
        // Çekiliş bitti
        onDrawComplete({ winners: drawnWinners, substitutes: drawnSubstitutes });
      }
    } else {
      if (currentStep.index < substituteCount) {
        setCurrentStep({ type: 'yedek', index: currentStep.index + 1 });
        setWinnerTicket(null);
      } else {
        // Çekiliş bitti
        onDrawComplete({ winners: drawnWinners, substitutes: drawnSubstitutes });
      }
    }
  };

  const isAllDone = (currentStep.type === 'asil' && currentStep.index === winnerCount && winnerTicket) ||
                    (currentStep.type === 'yedek' && currentStep.index === substituteCount && winnerTicket) ||
                    (currentStep.type === 'asil' && winnerCount === 0 && substituteCount === 0);

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      
      {/* Üst Panel: Durum & Ses Ayarı */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy className="gradient-text" size={24} />
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 800 }}>
            {currentStep.type === 'asil' ? `${currentStep.index}. Asil Kazanan` : `${currentStep.index}. Yedek Kazanan`} Çekiliyor
          </h2>
        </div>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '8px 12px', borderRadius: '50px' }}
          onClick={() => setSoundEnabled(!soundEnabled)}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} color="#ef4444" />}
          <span style={{ fontSize: '12px' }}>{soundEnabled ? 'Ses Açık' : 'Sessiz'}</span>
        </button>
      </div>

      {/* ANA ÇARK / SLOT MACHINE EKRANI */}
      <div className="glass-container" style={{ padding: '40px 20px', textAlign: 'center', marginBottom: '24px', background: 'rgba(255,255,255,0.015)' }}>
        
        {/* Slot Alanı */}
        <div style={{ maxWidth: '400px', margin: '0 auto 30px' }}>
          <div className="slot-machine-container">
            <div className="slot-indicator"></div>
            
            <div 
              className="slot-list" 
              ref={slotListRef}
              style={{
                transform: isSpinning 
                  ? `translateY(-${slotIndex * 48}px)` 
                  : winnerTicket 
                    ? `translateY(0px)` 
                    : `translateY(0px)`
              }}
            >
              {isSpinning ? (
                animationNames.map((name, idx) => (
                  <div key={idx} className={`slot-item ${idx === slotIndex ? 'active' : ''}`}>
                    @{name}
                  </div>
                ))
              ) : winnerTicket ? (
                <div className="slot-item active" style={{ fontSize: '28px' }}>
                  @{winnerTicket.username}
                </div>
              ) : (
                <div className="slot-item" style={{ color: 'var(--text-muted)', fontSize: '18px', fontWeight: 500 }}>
                  Çekilişe Hazır!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kazanan Açıklama Kartı */}
        {winnerTicket && !isSpinning && (
          <div 
            className="glass-container pulse-glow" 
            style={{ 
              maxWidth: '500px', 
              margin: '0 auto 20px', 
              padding: '24px', 
              background: currentStep.type === 'asil' 
                ? 'linear-gradient(135deg, rgba(225, 48, 108, 0.1), rgba(131, 58, 180, 0.1))' 
                : 'linear-gradient(135deg, rgba(251, 173, 80, 0.1), rgba(225, 48, 108, 0.1))',
              borderColor: currentStep.type === 'asil' ? 'var(--insta-pink)' : 'var(--insta-orange)',
              borderRadius: '20px'
            }}
          >
            <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '50%', background: currentStep.type === 'asil' ? 'var(--insta-pink)' : 'var(--insta-orange)', color: 'white', marginBottom: '12px' }}>
              <Award size={28} />
            </div>
            
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              @{winnerTicket.username}
            </h1>
            
            <p style={{ fontStyle: 'italic', fontSize: '14px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', marginTop: '12px', border: '1px solid var(--glass-border)', display: 'inline-block', width: '100%' }}>
              "{winnerTicket.comment}"
            </p>

            {winnerTicket.totalTickets > 1 && (
              <span style={{ display: 'inline-block', fontSize: '11px', background: 'rgba(255,255,255,0.08)', padding: '4px 8px', borderRadius: '20px', marginTop: '10px', color: 'var(--insta-yellow)', fontWeight: 600 }}>
                🎫 Bu kullanıcı toplam {winnerTicket.totalTickets} bilet (hak) ile katıldı
              </span>
            )}
          </div>
        )}

        {/* Kontrol Butonları */}
        <div style={{ marginTop: '20px' }}>
          {!winnerTicket && !isSpinning ? (
            <button 
              className="btn btn-primary pulse-glow" 
              style={{ width: '100%', maxWidth: '260px', padding: '14px 28px', fontSize: '16px' }}
              onClick={startDraw}
              disabled={drawingPool.length === 0}
            >
              <RefreshCw className={isSpinning ? 'spin' : ''} size={18} /> 
              {currentStep.type === 'asil' ? 'Asili Çek' : 'Yedeği Çek'}
            </button>
          ) : isSpinning ? (
            <button className="btn btn-secondary" style={{ width: '100%', maxWidth: '260px' }} disabled>
              Çekiliyor...
            </button>
          ) : (
            <button 
              className="btn btn-success" 
              style={{ width: '100%', maxWidth: '260px', padding: '14px 28px', fontSize: '16px' }}
              onClick={handleNextStep}
            >
              {isAllDone ? 'Sonuçları İncele' : 'Sıradakini Çek'} <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      {/* YAN PANEL: CANLI ÇEKİLİŞ DURUMU */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        
        {/* Asil Listesi */}
        <div className="glass-container" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '12px', color: 'var(--insta-pink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🏆 Asil Kazananlar ({drawnWinners.length} / {winnerCount})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {Array.from({ length: winnerCount }).map((_, idx) => {
              const winner = drawnWinners.find(w => w.stepIndex === idx + 1);
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: winner ? 'rgba(225,48,108,0.06)' : 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: winner ? 'rgba(225,48,108,0.2)' : 'var(--glass-border)', borderRadius: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600 }}>{idx + 1}. Asil:</span>
                  <span style={{ color: winner ? '#fff' : 'var(--text-muted)' }}>
                    {winner ? `@${winner.username}` : 'Çekilmedi'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Yedek Listesi */}
        <div className="glass-container" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '12px', color: 'var(--insta-orange)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⏱️ Yedek Kazananlar ({drawnSubstitutes.length} / {substituteCount})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {Array.from({ length: substituteCount }).map((_, idx) => {
              const sub = drawnSubstitutes.find(s => s.stepIndex === idx + 1);
              return (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: sub ? 'rgba(251,173,80,0.06)' : 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: sub ? 'rgba(251,173,80,0.2)' : 'var(--glass-border)', borderRadius: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600 }}>{idx + 1}. Yedek:</span>
                  <span style={{ color: sub ? '#fff' : 'var(--text-muted)' }}>
                    {sub ? `@${sub.username}` : 'Çekilmedi'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
