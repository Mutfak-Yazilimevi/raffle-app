// Instagram Çekiliş Yardımcısı - Popup Script

const DEFAULT_APP_URL = 'https://mutfak-yazilimevi.github.io/raffle-app/';

let activeTabId = null;
let isScraping = false;
let scrapedComments = [];
let popupPort = null;

function connectPopupSession() {
  try {
    popupPort = chrome.runtime.connect({ name: 'raffle-popup' });
    popupPort.onDisconnect.addListener(() => {
      popupPort = null;
    });
  } catch (_) {
    popupPort = null;
  }
}

function notifyScrapingStarted() {
  popupPort?.postMessage({ type: 'SCRAPING_STARTED', tabId: activeTabId });
}

function notifyScrapingStopped() {
  popupPort?.postMessage({ type: 'SCRAPING_STOPPED' });
}

function stopScrapingOnTab(callback) {
  if (!activeTabId) {
    callback?.();
    return;
  }

  chrome.tabs.sendMessage(activeTabId, { type: 'STOP_SCRAPING' }, (response) => {
    isScraping = false;
    notifyScrapingStopped();
    callback?.(response);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  connectPopupSession();

  const pageStatusEl = document.getElementById('page-status');
  const commentCountEl = document.getElementById('comment-count');
  const scrollStatusRow = document.getElementById('scroll-status-row');
  const scrollStatusEl = document.getElementById('scroll-status');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');

  const btnStart = document.getElementById('btn-start');
  const btnStop = document.getElementById('btn-stop');
  const btnExport = document.getElementById('btn-export');

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

    try {
      await chrome.tabs.sendMessage(activeTabId, { type: 'PING' });
    } catch (_) {
      await chrome.scripting.executeScript({
        target: { tabId: activeTabId },
        files: ['content.js'],
      });
    }
  } else {
    pageStatusEl.textContent = 'Instagram Gönderi Sayfası Değil';
    pageStatusEl.className = 'status-value error';
    btnStart.disabled = true;
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SCRAPE_UPDATE') {
      commentCountEl.textContent = message.count;
      progressBar.style.width = `${Math.min(20 + message.count * 2, 100)}%`;
      if (message.count > 0) {
        btnExport.disabled = false;
      }
    }
  });

  btnStart.addEventListener('click', () => {
    if (!activeTabId) return;

    isScraping = true;
    btnStart.style.display = 'none';
    btnStop.style.display = 'flex';
    btnExport.disabled = true;
    scrollStatusRow.style.display = 'flex';
    scrollStatusEl.textContent = 'Yorumlar Yükleniyor...';
    progressContainer.style.display = 'block';

    notifyScrapingStarted();

    chrome.tabs.sendMessage(activeTabId, { type: 'START_SCRAPING' }, (response) => {
      if (response) {
        commentCountEl.textContent = response.count;
      }
    });
  });

  btnStop.addEventListener('click', () => {
    if (!activeTabId) return;

    btnStop.style.display = 'none';
    btnStart.style.display = 'flex';
    btnStart.textContent = 'Yorumları Çekmeye Devam Et';
    scrollStatusEl.textContent = 'Durduruldu';

    stopScrapingOnTab((response) => {
      if (response) {
        commentCountEl.textContent = response.count;
        if (response.count > 0) {
          btnExport.disabled = false;
        }
      }
    });
  });

  btnExport.addEventListener('click', () => {
    if (!activeTabId) return;

    const finishExport = () => {
      chrome.tabs.sendMessage(activeTabId, { type: 'GET_COMMENTS' }, (response) => {
        if (!response?.comments?.length) return;

        scrapedComments = response.comments;

        chrome.tabs.create({ url: DEFAULT_APP_URL }, (newTab) => {
          chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === newTab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);

              chrome.scripting.executeScript({
                target: { tabId: newTab.id },
                func: (commentsData) => {
                  try {
                    localStorage.setItem('instagram_comments_import', JSON.stringify(commentsData));
                    window.dispatchEvent(new StorageEvent('storage', {
                      key: 'instagram_comments_import',
                      newValue: JSON.stringify(commentsData),
                    }));
                  } catch (e) {
                    console.error('Veri aktarılamadı:', e);
                  }
                },
                args: [scrapedComments],
              });
            }
          });
        });
      });
    };

    if (isScraping) {
      stopScrapingOnTab(finishExport);
    } else {
      finishExport();
    }
  });

  window.addEventListener('pagehide', () => {
    if (isScraping && activeTabId) {
      chrome.tabs.sendMessage(activeTabId, { type: 'STOP_SCRAPING' }).catch(() => {});
      notifyScrapingStopped();
    }
  });
});
