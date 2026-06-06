import React, { useState, useEffect } from 'react';
import { Award, Compass, Puzzle } from 'lucide-react';
import { LINKS } from './config';
import { useRaffleForm } from './hooks/useRaffleForm';
import RaffleConfigStep from './components/RaffleConfigStep';
import RaffleCommentsStep from './components/RaffleCommentsStep';
import RaffleAnimation from './components/RaffleAnimation';
import RaffleResults from './components/RaffleResults';
import ExtensionPage from './components/ExtensionPage';
import StepProgress from './components/StepProgress';

export default function App() {
  const [page, setPage] = useState('raffle');
  const [raffleStep, setRaffleStep] = useState('config');
  const [drawStage, setDrawStage] = useState('animation');
  const [importedComments, setImportedComments] = useState([]);

  const [raffleConfig, setRaffleConfig] = useState({
    ticketsPool: [],
    brand: { name: '', logo: '', raffleName: '', postUrl: '' },
    prizes: [],
    rules: {},
  });

  const [results, setResults] = useState({
    winners: [],
    substitutes: [],
  });

  const handleClearImported = () => {
    localStorage.removeItem('instagram_comments_import');
    setImportedComments([]);
  };

  const form = useRaffleForm({ importedComments, onClearImported: handleClearImported });

  useEffect(() => {
    const checkImportedData = () => {
      const data = localStorage.getItem('instagram_comments_import');
      if (!data) return;
      try {
        const comments = JSON.parse(data);
        if (Array.isArray(comments) && comments.length > 0) {
          setImportedComments(comments);
          if (page === 'raffle' && raffleStep === 'config') {
            setRaffleStep('comments');
          }
        }
      } catch (e) {
        console.error('Eklenti verisi okunamadı:', e);
      }
    };

    checkImportedData();

    const handleStorageChange = (e) => {
      if (e.key === 'instagram_comments_import') checkImportedData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [page, raffleStep]);

  const handleStartDraw = () => {
    if (!form.validateStart()) return;
    setRaffleConfig(form.buildSetupConfig());
    setRaffleStep('draw');
    setDrawStage('animation');
  };

  const handleDrawComplete = (drawResults) => {
    setResults(drawResults);
    setDrawStage('results');
  };

  const handleReset = () => {
    setResults({ winners: [], substitutes: [] });
    setRaffleStep('config');
    setDrawStage('animation');
    setPage('raffle');
  };

  const currentProgressStep = raffleStep === 'draw' ? 'draw' : raffleStep;

  const stageLabel = page === 'extension'
    ? 'Chrome Eklentisi'
    : raffleStep === 'config'
      ? 'Kurallar'
      : raffleStep === 'comments'
        ? 'Yorumlar'
        : drawStage === 'animation'
          ? 'Canlı Çekiliş'
          : 'Sonuçlar';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          borderBottom: '1px solid var(--glass-border)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'rgba(10, 10, 12, 0.6)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '16px 24px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={handleReset}>
            <div
              style={{
                background: 'var(--insta-gradient)',
                padding: '8px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(225,48,108,0.2)',
              }}
            >
              <Award size={22} color="white" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', margin: 0 }}>
                Raffle<span className="gradient-text">Studio</span>
              </h1>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: 500, marginTop: '-2px' }}>
                Premium Instagram Giveaway Engine
              </span>
            </div>
          </div>

          {page === 'raffle' && (
            <StepProgress currentStep={currentProgressStep} />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '50px', border: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Aşama:</span>
              <strong style={{ color: 'white' }}>{stageLabel}</strong>
            </div>

            <button
              type="button"
              onClick={() => setPage(page === 'extension' ? 'raffle' : 'extension')}
              style={{
                fontSize: '12px',
                color: page === 'extension' ? 'white' : 'var(--insta-blue)',
                background: page === 'extension' ? 'rgba(64, 93, 230, 0.25)' : 'rgba(64, 93, 230, 0.08)',
                border: '1px solid rgba(64, 93, 230, 0.35)',
                borderRadius: '50px',
                padding: '6px 14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              <Puzzle size={14} /> Chrome Eklentisi
            </button>

            <a
              href={LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Compass size={14} /> GitHub
            </a>
          </div>
        </div>
      </header>

      <main style={{ flexGrow: 1, display: 'flex', alignItems: 'flex-start', padding: '30px 0', width: '100%' }}>
        {page === 'extension' && (
          <ExtensionPage onBack={() => setPage('raffle')} postUrl={form.brand.postUrl} />
        )}

        {page === 'raffle' && raffleStep === 'config' && (
          <RaffleConfigStep form={form} onNext={() => setRaffleStep('comments')} />
        )}

        {page === 'raffle' && raffleStep === 'comments' && (
          <RaffleCommentsStep
            form={form}
            importedCount={importedComments.length}
            onBack={() => setRaffleStep('config')}
            onStart={handleStartDraw}
            onOpenExtension={() => setPage('extension')}
          />
        )}

        {page === 'raffle' && raffleStep === 'draw' && drawStage === 'animation' && (
          <RaffleAnimation
            ticketsPool={raffleConfig.ticketsPool}
            brand={raffleConfig.brand}
            prizes={raffleConfig.prizes}
            onDrawComplete={handleDrawComplete}
          />
        )}

        {page === 'raffle' && raffleStep === 'draw' && drawStage === 'results' && (
          <RaffleResults
            winners={results.winners}
            substitutes={results.substitutes}
            brand={raffleConfig.brand}
            prizes={raffleConfig.prizes}
            onReset={handleReset}
          />
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '20px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', background: 'rgba(0,0,0,0.2)' }}>
        <p>© 2026 Mutfak Yazılımevi - Instagram Çekiliş Stüdyosu. Tüm hakları saklıdır. Verileriniz tamamen yerel tarayıcınızda işlenir.</p>
      </footer>
    </div>
  );
}
