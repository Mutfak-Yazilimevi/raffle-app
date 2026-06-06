import React, { useState, useEffect } from 'react';
import RaffleSetup from './components/RaffleSetup';
import RaffleAnimation from './components/RaffleAnimation';
import RaffleResults from './components/RaffleResults';
import { Award, Zap, Compass } from 'lucide-react';

export default function App() {
  const [stage, setStage] = useState('setup'); // setup, animation, results
  const [importedComments, setImportedComments] = useState([]);
  
  // Çekiliş verileri
  const [raffleConfig, setRaffleConfig] = useState({
    ticketsPool: [],
    winnerCount: 1,
    substituteCount: 1,
    rules: {}
  });

  const [results, setResults] = useState({
    winners: [],
    substitutes: []
  });

  // Eklentiden gelen veri dinleme mekanizması
  useEffect(() => {
    // Sayfa açıldığında eklentiden enjekte edilmiş yorum var mı kontrol et
    const checkImportedData = () => {
      const data = localStorage.getItem('instagram_comments_import');
      if (data) {
        try {
          const comments = JSON.parse(data);
          if (Array.isArray(comments) && comments.length > 0) {
            setImportedComments(comments);
          }
        } catch (e) {
          console.error('Eklenti verisi okunamadı:', e);
        }
      }
    };

    checkImportedData();

    // Diğer sekmelerden/eklentiden gelen depolama değişimlerini dinle
    const handleStorageChange = (e) => {
      if (e.key === 'instagram_comments_import') {
        checkImportedData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Eklenti verisini temizleme
  const handleClearImported = () => {
    localStorage.removeItem('instagram_comments_import');
    setImportedComments([]);
  };

  // Kurulum tamamlandığında
  const handleSetupComplete = (config) => {
    setRaffleConfig(config);
    setStage('animation');
  };

  // Çekiliş tamamlandığında
  const handleDrawComplete = (drawResults) => {
    setResults(drawResults);
    setStage('results');
  };

  // Çekilişi sıfırlama (Yeni çekilişe başlama)
  const handleReset = () => {
    setResults({ winners: [], substitutes: [] });
    setStage('setup');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Premium Header */}
      <header 
        style={{ 
          borderBottom: '1px solid var(--glass-border)', 
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'rgba(10, 10, 12, 0.6)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '16px 24px'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={handleReset}>
            <div 
              style={{ 
                background: 'var(--insta-gradient)', 
                padding: '8px', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(225,48,108,0.2)' 
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

          {/* Durum Göstergesi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '50px', border: '1px solid var(--glass-border)' }}>
              <Zap size={12} color="var(--insta-yellow)" />
              <span style={{ color: 'var(--text-muted)' }}>Aşama:</span>
              <strong style={{ textTransform: 'capitalize', color: 'white' }}>
                {stage === 'setup' ? 'Ayarlar' : stage === 'animation' ? 'Canlı Çekiliş' : 'Sonuçlar'}
              </strong>
            </div>
            
            <a 
              href="https://github.com/mutfak-yazilimevi/raffle-app" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Compass size={14} /> GitHub
            </a>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flexGrow: 1, display: 'flex', alignItems: 'center', padding: '30px 0' }}>
        
        {stage === 'setup' && (
          <RaffleSetup 
            onSetupComplete={handleSetupComplete} 
            importedComments={importedComments}
            onClearImported={handleClearImported}
          />
        )}

        {stage === 'animation' && (
          <RaffleAnimation 
            ticketsPool={raffleConfig.ticketsPool}
            winnerCount={raffleConfig.winnerCount}
            substituteCount={raffleConfig.substituteCount}
            onDrawComplete={handleDrawComplete}
          />
        )}

        {stage === 'results' && (
          <RaffleResults 
            winners={results.winners}
            substitutes={results.substitutes}
            onReset={handleReset}
          />
        )}

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '20px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', background: 'rgba(0,0,0,0.2)' }}>
        <p>© 2026 Mutfak Yazılımevi - Instagram Çekiliş Stüdyosu. Tüm hakları saklıdır. Verileriniz tamamen yerel tarayıcınızda işlenir.</p>
      </footer>

    </div>
  );
}
