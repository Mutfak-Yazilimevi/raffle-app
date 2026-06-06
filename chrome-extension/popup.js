// Instagram Çekiliş Yardımcısı - Popup Script

const DEFAULT_APP_URL = 'https://mutfak-yazilimevi.github.io/raffle-app/';
let activeTabId = null;
let isScraping = false;
let scrapedComments = [];

document.addEventListener('DOMContentLoaded', async () => {
  const pageStatusEl = document.getElementById('page-status');
  const commentCountEl = document.getElementById('comment-count');
  const scrollStatusRow = document.getElementById('scroll-status-row');
  const scrollStatusEl = document.getElementById('scroll-status');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  
  const btnStart = document.getElementById('btn-start');
  const btnStop = document.getElementById('btn-stop');
  const btnExport = document.getElementById('btn-export');

  // Aktif sekmeyi kontrol et
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) return;
  
  const isInstagramPost = tab.url && (
    tab.url.includes('instagram.com/p/') || 
    tab.url.includes('instagram.com/reel/') || 
    tab.url.includes('instagram.com/tv/')
  );

  if (isInstagramPost) {
    activeTabId = tab.id;
    pageStatusEl.textContent = 'Gönderi Tespit Edildi';
    pageStatusEl.className = 'status-value success';
    btnStart.disabled = false;
    
    // Sayfadaki content script'in yüklenip yüklenmediğini test etmek için boş bir mesaj gönderelim
    // Eğer yüklenmemişse manifest.json veya chrome.scripting ile content script enjekte edilebilir.
    try {
      await chrome.tabs.sendMessage(activeTabId, { type: 'PING' });
    } catch (err) {
      // Content script enjekte edilmemişse manuel enjekte et
      await chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        files: ['content.js']
      });
    }
  } else {
    pageStatusEl.textContent = 'Instagram Gönderi Sayfası Değil';
    pageStatusEl.className = 'status-value error';
    btnStart.disabled = true;
  }

  // Canlı sayaç güncelleme mesajlarını dinle
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SCRAPE_UPDATE') {
      commentCountEl.textContent = message.count;
      progressBar.style.width = `${Math.min(20 + message.count * 2, 100)}%`;
      if (message.count > 0) {
        btnExport.disabled = false;
      }
    }
  });

  // Çekmeyi Başlat
  btnStart.addEventListener('click', () => {
    if (!activeTabId) return;

    isScraping = true;
    btnStart.style.display = 'none';
    btnStop.style.display = 'flex';
    btnExport.disabled = true;
    scrollStatusRow.style.display = 'flex';
    scrollStatusEl.textContent = 'Yorumlar Yükleniyor...';
    progressContainer.style.style = 'block';
    progressContainer.style.display = 'block';

    chrome.tabs.sendMessage(activeTabId, { type: 'START_SCRAPING' }, (response) => {
      if (response) {
        commentCountEl.textContent = response.count;
      }
    });
  });

  // Çekmeyi Durdur
  btnStop.addEventListener('click', () => {
    if (!activeTabId) return;

    isScraping = false;
    btnStop.style.display = 'none';
    btnStart.style.display = 'flex';
    btnStart.textContent = 'Yorumları Çekmeye Devam Et';
    scrollStatusEl.textContent = 'Durduruldu';
    
    chrome.tabs.sendMessage(activeTabId, { type: 'STOP_SCRAPING' }, (response) => {
      if (response) {
        commentCountEl.textContent = response.count;
        if (response.count > 0) {
          btnExport.disabled = false;
        }
      }
    });
  });

  // Çekiliş Uygulamasına Aktar
  btnExport.addEventListener('click', () => {
    if (!activeTabId) return;

    chrome.tabs.sendMessage(activeTabId, { type: 'GET_COMMENTS' }, (response) => {
      if (response && response.comments && response.comments.length > 0) {
        scrapedComments = response.comments;
        
        // Kullanıcının local geliştirme yapıp yapmadığını anlamak için veya varsayılan uygulamayı açmak için
        // local dev URL'si http://localhost:5173 veya deploy edilmiş url'yi sorabiliriz.
        // Hızlıca aktarım için hedef URL'yi belirliyoruz.
        const raffleAppUrl = DEFAULT_APP_URL;

        chrome.tabs.create({ url: raffleAppUrl }, (newTab) => {
          // Yeni sekme yüklendiğinde localStorage'a veriyi enjekte et
          chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === newTab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              
              chrome.scripting.executeScript({
                target: { tabId: newTab.id },
                func: (commentsData) => {
                  try {
                    localStorage.setItem('instagram_comments_import', JSON.stringify(commentsData));
                    // React uygulamasındaki storage dinleyicisini tetikle
                    window.dispatchEvent(new StorageEvent('storage', {
                      key: 'instagram_comments_import',
                      newValue: JSON.stringify(commentsData)
                    }));
                  } catch (e) {
                    console.error('Veri aktarılamadı:', e);
                  }
                },
                args: [scrapedComments]
              });
            }
          });
        });
      }
    });
  });
});
