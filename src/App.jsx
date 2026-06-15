import { useState, useEffect, useCallback } from 'react';
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
  deleteRaffle,
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
  const [importedLikers, setImportedLikers] = useState([]);
  const [importedReplies, setImportedReplies] = useState([]);
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
    setImportedLikers([]);
    setImportedReplies([]);
  };

  const form = useRaffleForm({
    importedComments,
    importedLikers,
    importedReplies,
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
        const parsed = JSON.parse(data);
        // Support both legacy flat array and new { comments, likers } format
        const rawComments = Array.isArray(parsed) ? parsed : (parsed?.comments || []);
        const rawLikers = Array.isArray(parsed) ? [] : (parsed?.likers || []);
        const rawReplies = Array.isArray(parsed) ? [] : (parsed?.replies || []);
        const comments = normalizeImportedComments(rawComments);
        if (comments.length > 0) {
          setImportedComments(comments);
          setImportedLikers(rawLikers);
          setImportedReplies(rawReplies);
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

  const handleDeleteRaffle = async (raffleId) => {
    await deleteRaffle(raffleId);
    await refreshRaffleList();
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
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo" onClick={handleLogoClick}>
            <div className="app-logo-mark">
              <Award size={22} color="white" />
            </div>
            <div>
              <h1 className="app-logo-title">
                Mutfak<span className="gradient-text">RaffleStudio</span>
              </h1>
              <span className="app-logo-tagline">
                {APP_TAGLINE}
              </span>
            </div>
          </div>

          {view === 'studio' && (
            <div className="header-step-progress">
              <StepProgress currentStep={currentProgressStep} />
            </div>
          )}

          <div className="app-header-nav">
            <div className="stage-pill">
              <span className="stage-pill__label">Aşama:</span>
              <strong className="stage-pill__value">{stageLabel}</strong>
            </div>

            {view !== 'announcement' && (
              <button
                type="button"
                onClick={goToAnnouncement}
                className="nav-pill nav-pill--pink"
              >
                <Megaphone size={14} /> İlan Sayfası
              </button>
            )}

            {view === 'studio' && (
              <button
                type="button"
                onClick={() => setView(view === 'extension' ? 'studio' : 'extension')}
                className={`nav-pill nav-pill--blue${view === 'extension' ? ' is-active' : ''}`}
              >
                <Puzzle size={14} /> Chrome Eklentisi
              </button>
            )}

            {view === 'announcement' && (
              <button
                type="button"
                onClick={handleCreateRaffle}
                className="nav-pill nav-pill--yellow"
              >
                <Puzzle size={14} /> Yeni Çekiliş
              </button>
            )}

            <a
              href={LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
            >
              <Compass size={14} /> GitHub
            </a>
          </div>
        </div>
      </header>

      <main className="app-main">
        {view === 'announcement' && (
          <RaffleAnnouncement
            raffleEntries={raffleEntries}
            onCreateRaffle={handleCreateRaffle}
            onDeleteRaffle={handleDeleteRaffle}
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
            completedAt={displayResults?.completedAt || results?.completedAt}
            onReset={handleReset}
            onBackToAnnouncement={goToAnnouncement}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>© 2026 {APP_DISPLAY_NAME} · Mutfak Yazılımevi. Tüm hakları saklıdır. Verileriniz tamamen yerel tarayıcınızda işlenir.</p>
      </footer>
    </div>
  );
}
