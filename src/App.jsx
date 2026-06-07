import React, { useState, useEffect, useCallback } from 'react';
import { Award, Compass, Puzzle, Megaphone } from 'lucide-react';
import { LINKS } from './config';
import { normalizeImportedComments } from './utils/commentParsing';
import { useRaffleForm } from './hooks/useRaffleForm';
import RaffleAnnouncement from './components/RaffleAnnouncement';
import RaffleConfigStep from './components/RaffleConfigStep';
import RaffleCommentsStep from './components/RaffleCommentsStep';
import RaffleAnimation from './components/RaffleAnimation';
import RaffleResults from './components/RaffleResults';
import ExtensionPage from './components/ExtensionPage';
import StepProgress from './components/StepProgress';
import { APP_DISPLAY_NAME, APP_TAGLINE } from './utils/appBranding';
import {
  ensureRegistryInitialized,
  listRaffleEntries,
  createRaffle,
  setActiveRaffleId,
  getActiveRaffleId,
  loadDrawResults,
  saveDrawResults,
  clearDrawResults,
} from './utils/setupStorage';

export default function App() {
  const [view, setView] = useState('announcement');
  const [raffleStep, setRaffleStep] = useState('config');
  const [drawStage, setDrawStage] = useState('animation');
  const [importedComments, setImportedComments] = useState([]);
  const [activeRaffleId, setActiveRaffleIdState] = useState(null);
  const [raffleEntries, setRaffleEntries] = useState([]);
  const [registryReady, setRegistryReady] = useState(false);
  const [savedDrawResults, setSavedDrawResults] = useState(null);

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

  const form = useRaffleForm({
    importedComments,
    onClearImported: handleClearImported,
    activeRaffleId: registryReady ? activeRaffleId : null,
  });

  const refreshRaffleList = useCallback(async () => {
    await ensureRegistryInitialized();
    const entries = await listRaffleEntries();
    setRaffleEntries(entries);
    const activeId = getActiveRaffleId();
    setActiveRaffleIdState(activeId);
    if (activeId) {
      setSavedDrawResults(loadDrawResults(activeId));
    }
  }, []);

  useEffect(() => {
    ensureRegistryInitialized().then(() => {
      setRegistryReady(true);
      refreshRaffleList();
    });
  }, [refreshRaffleList]);

  const selectRaffle = useCallback((raffleId) => {
    setActiveRaffleId(raffleId);
    setActiveRaffleIdState(raffleId);
    setSavedDrawResults(loadDrawResults(raffleId));
  }, []);

  const openStudio = useCallback(async (step, raffleId) => {
    let id = raffleId || activeRaffleId;
    if (!id) {
      id = await createRaffle();
      await refreshRaffleList();
    }
    selectRaffle(id);
    setView('studio');
    setRaffleStep(step);
    if (step !== 'draw') setDrawStage('animation');
  }, [activeRaffleId, refreshRaffleList, selectRaffle]);

  const goToAnnouncement = () => {
    setView('announcement');
    refreshRaffleList();
  };

  useEffect(() => {
    const checkImportedData = () => {
      const data = localStorage.getItem('instagram_comments_import');
      if (!data) return;
      try {
        const comments = normalizeImportedComments(JSON.parse(data));
        if (comments.length > 0) {
          setImportedComments(comments);
          openStudio('comments');
        }
      } catch (e) {
        console.error('Eklenti verisi okunamadı:', e);
      }
    };

    if (registryReady) checkImportedData();

    const handleStorageChange = (e) => {
      if (e.key === 'instagram_comments_import') checkImportedData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [registryReady, openStudio]);

  const handleStartDraw = () => {
    if (!form.validateStart()) return;
    if (activeRaffleId) clearDrawResults(activeRaffleId);
    setSavedDrawResults(null);
    setRaffleConfig(form.buildSetupConfig());
    setRaffleStep('draw');
    setDrawStage('animation');
  };

  const handleDrawComplete = (drawResults) => {
    setResults(drawResults);
    if (activeRaffleId) {
      saveDrawResults(drawResults, activeRaffleId);
      setSavedDrawResults(loadDrawResults(activeRaffleId));
    }
    refreshRaffleList();
    setDrawStage('results');
  };

  const handleReset = () => {
    if (activeRaffleId) clearDrawResults(activeRaffleId);
    setSavedDrawResults(null);
    setResults({ winners: [], substitutes: [] });
    setRaffleStep('config');
    setDrawStage('animation');
    setView('announcement');
    refreshRaffleList();
  };

  const handleCreateRaffle = async () => {
    const id = await createRaffle();
    selectRaffle(id);
    await refreshRaffleList();
    setView('studio');
    setRaffleStep('config');
    setDrawStage('animation');
  };

  const handleLogoClick = () => {
    setView('announcement');
    refreshRaffleList();
  };

  const currentProgressStep = raffleStep === 'draw' ? 'draw' : raffleStep;

  const stageLabel = view === 'extension'
    ? 'Chrome Eklentisi'
    : view === 'announcement'
      ? 'İlanlar'
      : raffleStep === 'config'
        ? 'Kurallar'
        : raffleStep === 'comments'
          ? 'Yorumlar'
          : drawStage === 'animation'
            ? 'Canlı Çekiliş'
            : 'Sonuçlar';

  const displayResults = view === 'studio' && drawStage === 'results'
    ? results
    : savedDrawResults;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          borderBottom: '1px solid var(--glass-border)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'var(--bg-header)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '16px 24px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={handleLogoClick}>
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
                Mutfak<span className="gradient-text">RaffleStudio</span>
              </h1>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', fontWeight: 500, marginTop: '-2px' }}>
                {APP_TAGLINE}
              </span>
            </div>
          </div>

          {view === 'studio' && (
            <StepProgress currentStep={currentProgressStep} />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'var(--bg-inset)', padding: '6px 12px', borderRadius: '50px', border: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Aşama:</span>
              <strong style={{ color: 'var(--text-main)' }}>{stageLabel}</strong>
            </div>

            {view !== 'announcement' && (
              <button
                type="button"
                onClick={goToAnnouncement}
                style={{
                  fontSize: '12px',
                  color: 'var(--insta-pink)',
                  background: 'rgba(225, 48, 108, 0.08)',
                  border: '1px solid rgba(225, 48, 108, 0.25)',
                  borderRadius: '50px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                }}
              >
                <Megaphone size={14} /> İlan Sayfası
              </button>
            )}

            {view === 'studio' && (
              <button
                type="button"
                onClick={() => setView(view === 'extension' ? 'studio' : 'extension')}
                style={{
                  fontSize: '12px',
                  color: view === 'extension' ? 'white' : 'var(--insta-blue)',
                  background: view === 'extension' ? 'rgba(64, 93, 230, 0.25)' : 'rgba(64, 93, 230, 0.08)',
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
            )}

            {view === 'announcement' && (
              <button
                type="button"
                onClick={handleCreateRaffle}
                style={{
                  fontSize: '12px',
                  color: 'var(--insta-yellow)',
                  background: 'rgba(251, 173, 80, 0.08)',
                  border: '1px solid rgba(251, 173, 80, 0.3)',
                  borderRadius: '50px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                }}
              >
                <Puzzle size={14} /> Yeni Çekiliş
              </button>
            )}

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

      <main style={{ flexGrow: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '30px 0', width: '100%' }}>
        {view === 'announcement' && (
          <RaffleAnnouncement
            raffleEntries={raffleEntries}
            onCreateRaffle={handleCreateRaffle}
            onDefineConfig={(id) => openStudio('config', id)}
            onStartScheduled={(id) => openStudio('comments', id)}
          />
        )}

        {view === 'extension' && (
          <ExtensionPage onBack={() => setView('studio')} postUrl={form.brand.postUrl} />
        )}

        {view === 'studio' && raffleStep === 'config' && (
          <RaffleConfigStep
            form={form}
            onNext={() => setRaffleStep('comments')}
            onBackToAnnouncement={goToAnnouncement}
            onRaffleSaved={refreshRaffleList}
          />
        )}

        {view === 'studio' && raffleStep === 'comments' && (
          <RaffleCommentsStep
            form={form}
            importedCount={importedComments.length}
            onBack={() => setRaffleStep('config')}
            onStart={handleStartDraw}
            onOpenExtension={() => setView('extension')}
          />
        )}

        {view === 'studio' && raffleStep === 'draw' && drawStage === 'animation' && (
          <RaffleAnimation
            ticketsPool={raffleConfig.ticketsPool}
            brand={raffleConfig.brand}
            prizes={raffleConfig.prizes}
            storyBackgroundId={raffleConfig.rules?.storyBackgroundId}
            onDrawComplete={handleDrawComplete}
          />
        )}

        {view === 'studio' && raffleStep === 'draw' && drawStage === 'results' && (
          <RaffleResults
            winners={displayResults?.winners || results.winners}
            substitutes={displayResults?.substitutes || results.substitutes}
            brand={raffleConfig.brand}
            prizes={raffleConfig.prizes}
            showPrizeProductsInResultsStory={Boolean(raffleConfig.rules?.showPrizeProductsInResultsStory)}
            storyBackgroundId={raffleConfig.rules?.storyBackgroundId}
            rules={raffleConfig.rules || {}}
            onReset={handleReset}
            onBackToAnnouncement={goToAnnouncement}
          />
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '20px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', background: 'var(--bg-footer)' }}>
        <p>© 2026 {APP_DISPLAY_NAME} · Mutfak Yazılımevi. Tüm hakları saklıdır. Verileriniz tamamen yerel tarayıcınızda işlenir.</p>
      </footer>
    </div>
  );
}
