import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Award, Volume2, VolumeX, ChevronRight, RefreshCw, Trophy, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateStartingStory } from '../utils/generateStartingStory';
import { generateWinnerStory } from '../utils/generateWinnerStory';

const SLOT_ITEM_HEIGHT = 48;
const IDLE_NAME_COUNT = 24;

function buildNameLoop(pool, count) {
  if (pool.length === 0) return ['Çekilişe Hazır!'];
  const names = [];
  for (let i = 0; i < count; i += 1) {
    names.push(pool[Math.floor(Math.random() * pool.length)].username);
  }
  return names;
}

function buildSpinSequence(pool, winnerUsername, totalItems) {
  const names = [];
  for (let i = 0; i < totalItems - 1; i += 1) {
    names.push(pool[Math.floor(Math.random() * pool.length)].username);
  }
  names.push(winnerUsername);
  return names;
}

export default function RaffleAnimation({ ticketsPool, brand, prizes, storyBackgroundId, onDrawComplete }) {
  const activePrizes = prizes?.length > 0 ? prizes : [{ id: 1, name: 'Ödül', winnerCount: 1, substituteCount: 0 }];
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [drawingPool, setDrawingPool] = useState([...ticketsPool]);
  const [drawnWinners, setDrawnWinners] = useState([]);
  const [drawnSubstitutes, setDrawnSubstitutes] = useState([]);
  
  // useRef ile state'in güncel halini senkron tutuyoruz (stale closure önlemi)
  const drawnWinnersRef = useRef(drawnWinners);
  const drawnSubstitutesRef = useRef(drawnSubstitutes);
  useEffect(() => { drawnWinnersRef.current = drawnWinners; }, [drawnWinners]);
  useEffect(() => { drawnSubstitutesRef.current = drawnSubstitutes; }, [drawnSubstitutes]);
  
  // currentStep: { prizeIndex: number, type: 'asil' | 'yedek', index: number }
  const [currentStep, setCurrentStep] = useState({ prizeIndex: 0, type: 'asil', index: 1 });
  const currentPrize = activePrizes[currentStep.prizeIndex] || activePrizes[0];
  const [isSpinning, setIsSpinning] = useState(false);
  const [animationNames, setAnimationNames] = useState([]);
  const [slotScrollOffset, setSlotScrollOffset] = useState(0);
  const [idleScrollOffset, setIdleScrollOffset] = useState(0);
  const [winnerTicket, setWinnerTicket] = useState(null);
  const [generatingStartingStory, setGeneratingStartingStory] = useState(false);
  const [generatingWinnerStory, setGeneratingWinnerStory] = useState(false);

  const slotListRef = useRef(null);
  const slotContainerRef = useRef(null);
  const audioContextRef = useRef(null);
  const spinTimerRef = useRef(null);
  const idleRafRef = useRef(null);
  const chosenTicketRef = useRef(null);

  const idleNames = useMemo(
    () => {
      const segment = buildNameLoop(drawingPool, IDLE_NAME_COUNT);
      return segment.length > 1 ? [...segment, ...segment] : segment;
    },
    [drawingPool]
  );

  const idleLoopHeight = useMemo(
    () => (idleNames.length / 2) * SLOT_ITEM_HEIGHT,
    [idleNames]
  );

  const clearSpinTimer = useCallback(() => {
    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
  }, []);

  const getItemHeight = useCallback(() => {
    if (slotContainerRef.current) {
      const raw = getComputedStyle(slotContainerRef.current).getPropertyValue('--slot-item-height').trim();
      const parsed = parseFloat(raw);
      if (parsed > 0) return parsed;
    }
    return SLOT_ITEM_HEIGHT;
  }, []);

  useEffect(() => () => {
    clearSpinTimer();
    if (idleRafRef.current) cancelAnimationFrame(idleRafRef.current);
  }, [clearSpinTimer]);

  // Bekleme ekranında sürekli akan isim bandı
  useEffect(() => {
    if (isSpinning || winnerTicket || drawingPool.length === 0 || idleLoopHeight === 0) {
      if (idleRafRef.current) {
        cancelAnimationFrame(idleRafRef.current);
        idleRafRef.current = null;
      }
      return undefined;
    }

    let offset = idleScrollOffset;
    const itemHeight = getItemHeight();
    const loopHeight = (idleNames.length / 2) * itemHeight;

    const step = () => {
      offset += 1.4;
      if (offset >= loopHeight) offset -= loopHeight;
      setIdleScrollOffset(offset);
      idleRafRef.current = requestAnimationFrame(step);
    };

    idleRafRef.current = requestAnimationFrame(step);
    return () => {
      if (idleRafRef.current) cancelAnimationFrame(idleRafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning, winnerTicket, drawingPool.length, idleNames, getItemHeight]);

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

    clearSpinTimer();
    if (idleRafRef.current) {
      cancelAnimationFrame(idleRafRef.current);
      idleRafRef.current = null;
    }

    setIsSpinning(true);
    setWinnerTicket(null);

    const randomIndex = Math.floor(Math.random() * drawingPool.length);
    const chosenTicket = drawingPool[randomIndex];
    chosenTicketRef.current = chosenTicket;

    const totalItems = 50;
    const tempNames = buildSpinSequence(drawingPool, chosenTicket.username, totalItems);
    const itemHeight = getItemHeight();
    setAnimationNames(tempNames);
    setSlotScrollOffset(0);

    let speed = 35;
    let index = 0;

    const tick = () => {
      setSlotScrollOffset(index * itemHeight);
      playTickSound();

      index += 1;
      if (index < totalItems) {
        if (index > totalItems - 18) speed += 22;
        if (index > totalItems - 6) speed += 55;
        spinTimerRef.current = setTimeout(tick, speed);
      } else {
        spinTimerRef.current = setTimeout(() => {
          const winner = chosenTicketRef.current;
          setWinnerTicket(winner);
          setIsSpinning(false);
          setIdleScrollOffset(0);
          playSuccessSound();
          triggerConfetti();

          const wonUser = winner.username.toLowerCase();

          if (currentStep.type === 'asil') {
            setDrawnWinners((prev) => [...prev, { ...winner, prizeId: currentPrize.id, prizeName: currentPrize.name, stepIndex: currentStep.index }]);
          } else {
            setDrawnSubstitutes((prev) => [...prev, { ...winner, prizeId: currentPrize.id, prizeName: currentPrize.name, stepIndex: currentStep.index }]);
          }

          setDrawingPool((prev) => prev.filter((t) => t.username.toLowerCase() !== wonUser));
        }, 350);
      }
    };

    spinTimerRef.current = setTimeout(tick, speed);
  };

  // Sonraki aşamaya geçiş
  const handleNextStep = () => {
    setIdleScrollOffset(0);
    if (currentStep.type === 'asil') {
      if (currentStep.index < currentPrize.winnerCount) {
        setCurrentStep({ ...currentStep, index: currentStep.index + 1 });
        setWinnerTicket(null);
      } else if (currentPrize.substituteCount > 0) {
        setCurrentStep({ ...currentStep, type: 'yedek', index: 1 });
        setWinnerTicket(null);
      } else {
        goToNextPrize();
      }
    } else {
      if (currentStep.index < currentPrize.substituteCount) {
        setCurrentStep({ ...currentStep, index: currentStep.index + 1 });
        setWinnerTicket(null);
      } else {
        goToNextPrize();
      }
    }
  };

  const goToNextPrize = () => {
    if (currentStep.prizeIndex + 1 < activePrizes.length) {
      setCurrentStep({ prizeIndex: currentStep.prizeIndex + 1, type: 'asil', index: 1 });
      setWinnerTicket(null);
    } else {
      // Çekiliş bitti
      onDrawComplete({ winners: drawnWinnersRef.current, substitutes: drawnSubstitutesRef.current });
    }
  };

  const isAllDone = currentStep.prizeIndex === activePrizes.length - 1 &&
                    ((currentStep.type === 'asil' && currentStep.index === currentPrize.winnerCount && currentPrize.substituteCount === 0 && winnerTicket) ||
                    (currentStep.type === 'yedek' && currentStep.index === currentPrize.substituteCount && winnerTicket));

  const uniqueParticipants = useMemo(
    () => new Set(ticketsPool.map((t) => t.username.toLowerCase())).size,
    [ticketsPool]
  );

  const handleGenerateWinnerStory = async () => {
    if (!winnerTicket) return;
    setGeneratingWinnerStory(true);
    try {
      await generateWinnerStory({
        brand,
        prize: currentPrize,
        winner: winnerTicket,
        drawType: currentStep.type === 'yedek' ? 'yedek' : 'asil',
        stepIndex: currentStep.index,
        storyBackgroundId,
      });
    } catch (err) {
      console.error(err);
      alert('Talihli story görseli oluşturulurken bir hata oluştu.');
    } finally {
      setGeneratingWinnerStory(false);
    }
  };

  const handleGenerateStartingStory = async () => {
    setGeneratingStartingStory(true);
    try {
      await generateStartingStory(
        { brand, prizes: activePrizes, storyBackgroundId },
        {
          participantCount: uniqueParticipants,
          ticketCount: ticketsPool.length,
          prizeCount: activePrizes.length,
        }
      );
    } catch (err) {
      console.error(err);
      alert('Story görseli oluşturulurken bir hata oluştu.');
    } finally {
      setGeneratingStartingStory(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      
      {/* Marka Bilgileri Header */}
      {brand && (brand.name || brand.logo || brand.raffleName) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px', background: 'var(--bg-inset)', padding: '16px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
          {brand.logo && <img src={brand.logo} alt="Brand Logo" style={{ height: '50px', objectFit: 'contain', borderRadius: '8px' }} />}
          <div>
            {brand.raffleName && <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--insta-yellow)' }}>{brand.raffleName}</h3>}
            {brand.name && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-main)', opacity: 0.9 }}>{brand.name}</p>}
          </div>
        </div>
      )}

      {/* Üst Panel: Durum & Ses Ayarı */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy className="gradient-text" size={24} />
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '20px', fontWeight: 800 }}>
            {currentStep.type === 'asil' ? `${currentStep.index}. Asil Kazanan` : `${currentStep.index}. Yedek Kazanan`} Çekiliyor
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '8px 12px', fontSize: '12px' }}
            onClick={handleGenerateStartingStory}
            disabled={generatingStartingStory}
          >
            <Share2 size={14} /> {generatingStartingStory ? '...' : 'Başlıyor Story'}
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '8px 12px', borderRadius: '50px' }}
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} color="#ef4444" />}
            <span style={{ fontSize: '12px' }}>{soundEnabled ? 'Ses Açık' : 'Sessiz'}</span>
          </button>
        </div>
      </div>

      {/* ANA ÇARK / SLOT MACHINE EKRANI */}
      <div className="glass-container" style={{ padding: '40px 20px', textAlign: 'center', marginBottom: '24px', background: 'var(--bg-muted)' }}>
        
        {currentPrize.image && (
          <div style={{ marginBottom: '20px' }}>
            <img src={currentPrize.image} alt="Prize" style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)' }} />
          </div>
        )}

        {/* Slot Alanı */}
        <div style={{ maxWidth: '400px', margin: '0 auto 30px' }}>
          <div
            className="slot-machine-container"
            ref={slotContainerRef}
            role="region"
            aria-label="Çekiliş slotu"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="slot-indicator" />

            {isSpinning ? (
              <div
                className="slot-list slot-list--smooth"
                ref={slotListRef}
                style={{ transform: `translateY(-${slotScrollOffset}px)` }}
              >
                {animationNames.map((name, idx) => {
                  const itemHeight = getItemHeight();
                  const activeIndex = Math.round(slotScrollOffset / itemHeight);
                  return (
                    <div key={`${name}-${idx}`} className={`slot-item ${idx === activeIndex ? 'active' : ''}`}>
                      @{name}
                    </div>
                  );
                })}
              </div>
            ) : winnerTicket ? (
              <div className="slot-list" ref={slotListRef} style={{ transform: 'translateY(0)' }}>
                <div className="slot-item active" style={{ fontSize: '28px' }}>
                  @{winnerTicket.username}
                </div>
              </div>
            ) : (
              <div
                className="slot-list slot-list--idle"
                ref={slotListRef}
                style={{ transform: `translateY(-${idleScrollOffset}px)` }}
              >
                {idleNames.map((name, idx) => (
                  <div key={`idle-${idx}-${name}`} className="slot-item" style={name === 'Çekilişe Hazır!' ? { color: 'var(--text-muted)', fontSize: '18px', fontWeight: 500 } : undefined}>
                    {name === 'Çekilişe Hazır!' ? name : `@${name}`}
                  </div>
                ))}
              </div>
            )}
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
            
            {currentPrize.name ? (
              <p style={{ fontStyle: 'italic', fontSize: '16px', color: 'var(--insta-yellow)', background: 'var(--bg-muted)', padding: '12px', borderRadius: '10px', marginTop: '12px', border: '1px solid var(--glass-border)', display: 'inline-block', width: '100%', fontWeight: 600 }}>
                🎁 Kazandığı Ödül: {currentPrize.name}
              </p>
            ) : (
              <p style={{ fontStyle: 'italic', fontSize: '14px', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '12px', borderRadius: '10px', marginTop: '12px', border: '1px solid var(--glass-border)', display: 'inline-block', width: '100%' }}>
                Tebrikler!
              </p>
            )}

            {winnerTicket.totalTickets > 1 && (
              <span style={{ display: 'inline-block', fontSize: '11px', background: 'rgba(217, 119, 6, 0.12)', padding: '4px 8px', borderRadius: '20px', marginTop: '10px', color: 'var(--insta-yellow)', fontWeight: 600 }}>
                🎫 Bu kullanıcı toplam {winnerTicket.totalTickets} bilet (hak) ile katıldı
              </span>
            )}

            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: '16px', width: '100%', background: 'linear-gradient(135deg, #fbad50, #e1306c)' }}
              onClick={handleGenerateWinnerStory}
              disabled={generatingWinnerStory}
            >
              <Share2 size={16} /> {generatingWinnerStory ? 'Oluşturuluyor...' : 'Talihli Story Oluştur'}
            </button>
          </div>
        )}

        {/* Kontrol Butonları */}
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          {!winnerTicket && !isSpinning ? (
            <button
              type="button"
              className="btn btn-primary pulse-glow"
              style={{ width: '100%', maxWidth: '260px', padding: '14px 28px', fontSize: '16px' }}
              onClick={startDraw}
              disabled={drawingPool.length === 0}
              aria-label={currentStep.type === 'asil' ? 'Asil kazananı çek' : 'Yedek kazananı çek'}
            >
              <RefreshCw className={isSpinning ? 'spin' : ''} size={18} />
              {currentStep.type === 'asil' ? 'Asili Çek' : 'Yedeği Çek'}
            </button>
          ) : isSpinning ? (
            <button type="button" className="btn btn-secondary" style={{ width: '100%', maxWidth: '260px' }} disabled aria-live="polite">
              Çekiliyor...
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-success"
              style={{ width: '100%', maxWidth: '260px', padding: '14px 28px', fontSize: '16px' }}
              onClick={handleNextStep}
              aria-label={isAllDone ? 'Sonuçları incele' : 'Sıradaki ödülü çek'}
            >
              {isAllDone ? 'Sonuçları İncele' : 'Sıradakini Çek'} <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      {/* YAN PANEL: CANLI ÇEKİLİŞ DURUMU */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* Asil Listesi */}
        <div className="glass-container" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '12px', color: 'var(--insta-pink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🏆 Asil Kazananlar
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
            {activePrizes.map((prize, pIdx) => {
               const prizeWinners = drawnWinners.filter(w => w.prizeId === prize.id);
               return (
                 <div key={prize.id} style={{ marginBottom: '8px' }}>
                   <strong style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{prize.name || `${pIdx+1}. Ödül`}</strong>
                   {Array.from({ length: prize.winnerCount }).map((_, idx) => {
                     const winner = prizeWinners.find(w => w.stepIndex === idx + 1);
                     const isActive = currentStep.prizeIndex === pIdx && currentStep.type === 'asil' && currentStep.index === idx + 1;
                     return (
                       <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: isActive ? 'rgba(219, 39, 119, 0.1)' : winner ? 'rgba(219, 39, 119, 0.06)' : 'var(--bg-muted)', border: '1px solid', borderColor: isActive ? 'var(--insta-pink)' : winner ? 'rgba(225,48,108,0.2)' : 'var(--glass-border)', borderRadius: '6px', fontSize: '12px', marginTop: '4px' }}>
                         <span style={{ fontWeight: 600 }}>{idx + 1}. Asil:</span>
                         <span style={{ color: winner ? 'var(--text-main)' : 'var(--text-muted)' }}>{winner ? `@${winner.username}` : 'Çekilmedi'}</span>
                       </div>
                     );
                   })}
                 </div>
               );
            })}
          </div>
        </div>

        {/* Yedek Listesi */}
        <div className="glass-container" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '12px', color: 'var(--insta-orange)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⏱️ Yedek Kazananlar
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
            {activePrizes.map((prize, pIdx) => {
               if (prize.substituteCount === 0) return null;
               const prizeSubs = drawnSubstitutes.filter(w => w.prizeId === prize.id);
               return (
                 <div key={prize.id} style={{ marginBottom: '8px' }}>
                   <strong style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{prize.name || `${pIdx+1}. Ödül`}</strong>
                   {Array.from({ length: prize.substituteCount }).map((_, idx) => {
                     const sub = prizeSubs.find(s => s.stepIndex === idx + 1);
                     const isActive = currentStep.prizeIndex === pIdx && currentStep.type === 'yedek' && currentStep.index === idx + 1;
                     return (
                       <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: isActive ? 'rgba(234, 88, 12, 0.1)' : sub ? 'rgba(234, 88, 12, 0.06)' : 'var(--bg-muted)', border: '1px solid', borderColor: isActive ? 'var(--insta-orange)' : sub ? 'rgba(251,173,80,0.2)' : 'var(--glass-border)', borderRadius: '6px', fontSize: '12px', marginTop: '4px' }}>
                         <span style={{ fontWeight: 600 }}>{idx + 1}. Yedek:</span>
                         <span style={{ color: sub ? 'var(--text-main)' : 'var(--text-muted)' }}>{sub ? `@${sub.username}` : 'Çekilmedi'}</span>
                       </div>
                     );
                   })}
                 </div>
               );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
