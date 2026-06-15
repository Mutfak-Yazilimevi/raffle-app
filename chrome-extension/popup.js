// Instagram Çekiliş Yardımcısı - Popup Script

const DEFAULT_APP_URL = 'https://mutfak-yazilimevi.github.io/raffle-app/';
const APP_URL_PATTERNS = ['raffle-app', 'localhost', '127.0.0.1'];

let activeTabId = null;
let isScraping = false;
let scrapedComments = [];
let popupPort = null;
let appTabId = null;
let followVerifyRunning = false;
let likeFollowVerifyRunning = false;

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

function isAppUrl(url) {
  if (!url) return false;
  return APP_URL_PATTERNS.some((part) => url.includes(part));
}

function readAppLocalStorage(tabId, keys) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript({
      target: { tabId },
      func: (storageKeys) => {
        const result = {};
        storageKeys.forEach((key) => {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              result[key] = JSON.parse(raw);
            } catch (_) {
              result[key] = raw;
            }
          }
        });
        return result;
      },
      args: [keys],
    }, (results) => {
      resolve(results?.[0]?.result || {});
    });
  });
}

async function findAppTab() {
  const urlPatterns = [
    '*://mutfak-yazilimevi.github.io/raffle-app/*',
    '*://*.github.io/raffle-app/*',
    'http://localhost/*',
    'http://127.0.0.1/*',
  ];

  for (const url of urlPatterns) {
    try {
      const tabs = await chrome.tabs.query({ url });
      if (tabs.length > 0) return tabs[0];
    } catch (_) {
      // host permission olmayabilir; fallback aşağıda
    }
  }

  const tabs = await chrome.tabs.query({});
  return tabs.find((tab) => isAppUrl(tab.url)) || null;
}

function writeCommentsToAppTab(tabId, commentsData) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript({
      target: { tabId },
      func: (data) => {
        try {
          const payload = JSON.stringify(data);
          localStorage.setItem('instagram_comments_import', payload);
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'instagram_comments_import',
            newValue: payload,
          }));
          return true;
        } catch (e) {
          console.error('Veri aktarılamadı:', e);
          return false;
        }
      },
      args: [commentsData],
    }, (results) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(Boolean(results?.[0]?.result));
    });
  });
}

async function exportCommentsToApp(comments, likers = []) {
  const payload = { comments, likers };
  let appTab = await findAppTab();

  if (appTab) {
    await writeCommentsToAppTab(appTab.id, payload);
    chrome.tabs.update(appTab.id, { active: true });
    return appTab.id;
  }

  return new Promise((resolve) => {
    chrome.tabs.create({ url: DEFAULT_APP_URL }, (newTab) => {
      const onUpdated = (tabId, info) => {
        if (tabId !== newTab.id || info.status !== 'complete') return;
        chrome.tabs.onUpdated.removeListener(onUpdated);
        writeCommentsToAppTab(newTab.id, payload).then(() => resolve(newTab.id));
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

async function setupFollowVerificationUI(elements) {
  const {
    followSection,
    followRuleSummary,
    followVerifyStatus,
    btnVerifyFollows,
  } = elements;

  const appTab = await findAppTab();
  if (!appTab) {
    followSection.style.display = 'none';
    return;
  }

  appTabId = appTab.id;
  const data = await readAppLocalStorage(appTab.id, ['raffle_follow_verify_request']);
  const request = data.raffle_follow_verify_request;

  if (!request?.requiredFollowAccounts?.length) {
    followSection.style.display = 'none';
    return;
  }

  followSection.style.display = 'block';
  const handles = request.requiredFollowAccounts.map((a) => `@${a}`).join(', ');
  followRuleSummary.textContent = request.minRequiredFollows >= request.requiredFollowAccounts.length
    ? `${handles} (tümü)`
    : `${handles} (${request.minRequiredFollows}+)`;
  followVerifyStatus.textContent = request.status === 'pending'
    ? `${request.participants?.length || 0} katılımcı bekliyor`
    : 'Hazır';

  btnVerifyFollows.disabled = followVerifyRunning;
  btnVerifyFollows.onclick = async () => {
    if (followVerifyRunning) return;

    const latest = await readAppLocalStorage(appTab.id, ['raffle_follow_verify_request']);
    const req = latest.raffle_follow_verify_request;
    if (!req?.participants?.length) {
      followVerifyStatus.textContent = 'Doğrulama isteği bulunamadı';
      followVerifyStatus.className = 'status-value error';
      return;
    }

    followVerifyRunning = true;
    btnVerifyFollows.disabled = true;
    followVerifyStatus.textContent = 'Doğrulanıyor...';
    followVerifyStatus.className = 'status-value';

    chrome.runtime.sendMessage({
      type: 'START_FOLLOW_VERIFICATION',
      requestId: req.requestId,
      participants: req.participants,
      requiredFollowAccounts: req.requiredFollowAccounts,
      minRequiredFollows: req.minRequiredFollows,
      appTabId: appTab.id,
    }, (response) => {
      followVerifyRunning = false;
      btnVerifyFollows.disabled = false;

      if (!response?.ok) {
        followVerifyStatus.textContent = response?.error || 'Doğrulama başarısız';
        followVerifyStatus.className = 'status-value error';
        return;
      }

      const passed = response.payload?.summary?.passed;
      const total = response.payload?.summary?.total;
      if (typeof passed === 'number' && typeof total === 'number') {
        followVerifyStatus.textContent = `Tamamlandı — ${passed}/${total} katılımcı takip şartını sağlıyor`;
      } else {
        followVerifyStatus.textContent = 'Tamamlandı — uygulamaya aktarıldı';
      }
      followVerifyStatus.className = 'status-value success';
    });
  };
}

async function setupLikeFollowVerificationUI(elements) {
  const {
    likeFollowSection,
    likeFollowRuleSummary,
    likeFollowVerifyStatus,
    btnVerifyLikeFollows,
  } = elements;

  const appTab = await findAppTab();
  if (!appTab) {
    likeFollowSection.style.display = 'none';
    return;
  }

  appTabId = appTab.id;
  const data = await readAppLocalStorage(appTab.id, ['raffle_like_follow_verify_request']);
  const request = data.raffle_like_follow_verify_request;

  if (!request?.requiredFollowAccounts?.length || !request?.participants?.length) {
    likeFollowSection.style.display = 'none';
    return;
  }

  likeFollowSection.style.display = 'block';
  const handles = request.requiredFollowAccounts.map((a) => `@${a}`).join(', ');
  likeFollowRuleSummary.textContent = request.minRequiredFollows >= request.requiredFollowAccounts.length
    ? `${handles} (tümü)`
    : `${handles} (${request.minRequiredFollows}+)`;
  likeFollowVerifyStatus.textContent = `${request.participants.length} beğeni bekliyor`;

  btnVerifyLikeFollows.disabled = likeFollowVerifyRunning;
  btnVerifyLikeFollows.onclick = async () => {
    if (likeFollowVerifyRunning) return;

    const latest = await readAppLocalStorage(appTab.id, ['raffle_like_follow_verify_request']);
    const req = latest.raffle_like_follow_verify_request;
    if (!req?.participants?.length) {
      likeFollowVerifyStatus.textContent = 'Doğrulama isteği bulunamadı';
      likeFollowVerifyStatus.className = 'status-value error';
      return;
    }

    likeFollowVerifyRunning = true;
    btnVerifyLikeFollows.disabled = true;
    likeFollowVerifyStatus.textContent = 'Doğrulanıyor...';
    likeFollowVerifyStatus.className = 'status-value';

    chrome.runtime.sendMessage({
      type: 'START_LIKE_FOLLOW_VERIFICATION',
      requestId: req.requestId,
      participants: req.participants,
      requiredFollowAccounts: req.requiredFollowAccounts,
      minRequiredFollows: req.minRequiredFollows,
      appTabId: appTab.id,
    }, (response) => {
      likeFollowVerifyRunning = false;
      btnVerifyLikeFollows.disabled = false;

      if (!response?.ok) {
        likeFollowVerifyStatus.textContent = response?.error || 'Doğrulama başarısız';
        likeFollowVerifyStatus.className = 'status-value error';
        return;
      }

      const passed = response.payload?.summary?.passed;
      const total = response.payload?.summary?.total;
      if (typeof passed === 'number' && typeof total === 'number') {
        likeFollowVerifyStatus.textContent = `Tamamlandı — ${passed}/${total} beğeni takip şartını sağlıyor`;
      } else {
        likeFollowVerifyStatus.textContent = 'Tamamlandı — uygulamaya aktarıldı';
      }
      likeFollowVerifyStatus.className = 'status-value success';
    });
  };
}

async function setupPostImportSection(prefillUrl = null) {
  const section = document.getElementById('post-import-section');
  if (!section) return;

  const targetTabId = appTabId || (await findAppTab())?.id;
  if (!targetTabId) return;

  section.style.display = 'block';

  const urlInput = document.getElementById('post-url-input');
  const btn = document.getElementById('btn-import-post');
  const statusEl = document.getElementById('post-import-status');

  if (prefillUrl) urlInput.value = prefillUrl;

  btn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) return;

    btn.disabled = true;
    btn.textContent = 'Yükleniyor...';
    statusEl.style.display = 'none';

    chrome.runtime.sendMessage({ type: 'FETCH_POST_METADATA', url }, async (result) => {
      btn.disabled = false;
      btn.textContent = '📋 Çekiliş Bilgilerini Doldur';

      if (chrome.runtime.lastError || !result?.ok) {
        statusEl.textContent = result?.error || 'Post bilgileri alınamadı';
        statusEl.style.color = '#ef4444';
        statusEl.style.display = 'block';
        return;
      }

      try {
        await chrome.scripting.executeScript({
          target: { tabId: targetTabId },
          func: (data) => {
            try {
              localStorage.setItem('raffle_post_import_result', JSON.stringify(data));
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'raffle_post_import_result',
                newValue: JSON.stringify(data),
              }));
            } catch (e) {
              console.error('Post metadata yazılamadı:', e);
            }
          },
          args: [result],
        });
        statusEl.textContent = result.brandName
          ? `✓ @${result.brandName} bilgileri aktarıldı`
          : '✓ Bilgiler aktarıldı';
        statusEl.style.color = '#10b981';
      } catch (_) {
        statusEl.textContent = 'Uygulamaya aktarılamadı';
        statusEl.style.color = '#ef4444';
      }
      statusEl.style.display = 'block';
    });
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

  const followSection = document.getElementById('follow-verify-section');
  const followRuleSummary = document.getElementById('follow-rule-summary');
  const followVerifyStatus = document.getElementById('follow-verify-status');
  const btnVerifyFollows = document.getElementById('btn-verify-follows');

  const likeFollowSection = document.getElementById('like-follow-verify-section');
  const likeFollowRuleSummary = document.getElementById('like-follow-rule-summary');
  const likeFollowVerifyStatus = document.getElementById('like-follow-verify-status');
  const btnVerifyLikeFollows = document.getElementById('btn-verify-like-follows');

  let zeroCommentHintTimer = null;

  function clearZeroCommentHintTimer() {
    if (zeroCommentHintTimer) {
      clearTimeout(zeroCommentHintTimer);
      zeroCommentHintTimer = null;
    }
  }

  function scheduleZeroCommentHint() {
    clearZeroCommentHintTimer();
    zeroCommentHintTimer = setTimeout(() => {
      if (!isScraping || Number(commentCountEl.textContent) > 0) return;
      scrollStatusEl.textContent = 'Yorum bulunamadı — gönderide "tüm yorumları gör"e tıklayın';
      scrollStatusEl.className = 'status-value error';
    }, 12000);
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  if (isAppUrl(tab.url)) {
    pageStatusEl.textContent = 'Çekiliş Uygulaması';
    pageStatusEl.className = 'status-value success';
    btnStart.disabled = true;
    btnExport.disabled = true;
    appTabId = tab.id;
    // Write extension ID so the app can call back via chrome.runtime.sendMessage
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (extId) => { try { localStorage.setItem('raffle_extension_id', extId); } catch (_) {} },
      args: [chrome.runtime.id],
    }).catch(() => {});
    await setupFollowVerificationUI({
      followSection,
      followRuleSummary,
      followVerifyStatus,
      btnVerifyFollows,
    });
    await setupLikeFollowVerificationUI({
      likeFollowSection,
      likeFollowRuleSummary,
      likeFollowVerifyStatus,
      btnVerifyLikeFollows,
    });
    await setupPostImportSection();
    return;
  }

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
        files: ['followVerify.js', 'content.js'],
      });
    }
  } else {
    pageStatusEl.textContent = 'Instagram Gönderi Sayfası Değil';
    pageStatusEl.className = 'status-value error';
    btnStart.disabled = true;
  }

  await setupFollowVerificationUI({
    followSection,
    followRuleSummary,
    followVerifyStatus,
    btnVerifyFollows,
  });
  await setupLikeFollowVerificationUI({
    likeFollowSection,
    likeFollowRuleSummary,
    likeFollowVerifyStatus,
    btnVerifyLikeFollows,
  });

  await setupPostImportSection(isInstagramPost ? tab.url : null);

  function applyScrapeUiState({ count, phase, expectedTotal }) {
    commentCountEl.textContent = count;
    const target = expectedTotal > count ? expectedTotal : Math.max(count, 20);
    progressBar.style.width = `${Math.min(20 + (count / target) * 80, 100)}%`;

    if (phase === 'ready' && count > 0) {
      isScraping = false;
      btnStop.style.display = 'none';
      btnStart.style.display = 'flex';
      btnStart.textContent = 'Yorumları Çekmeye Devam Et';
      btnExport.disabled = false;
      const totalHint = expectedTotal > count ? ` / ${expectedTotal}` : '';
      scrollStatusEl.textContent = `${count}${totalHint} yorum hazır — Çekilişe Gönder'e basın`;
      scrollStatusEl.className = 'status-value success';
      progressBar.style.width = '100%';
      notifyScrapingStopped();
      return;
    }

    if (count > 0) {
      clearZeroCommentHintTimer();
      btnExport.disabled = isScraping;
      const totalHint = expectedTotal > count ? ` / ${expectedTotal}` : '';
      if (phase === 'stalled' || phase === 'recovering') {
        scrollStatusEl.textContent = phase === 'recovering'
          ? `${count}${totalHint} yorum · API ile yükleniyor / panel açılıyor…`
          : `${count}${totalHint} yorum · daha fazlası yükleniyor…`;
      } else if (isScraping) {
        scrollStatusEl.textContent = `${count}${totalHint} yorum · tarama sürüyor…`;
      } else {
        scrollStatusEl.textContent = `${count}${totalHint} yorum çekildi`;
      }
      scrollStatusEl.className = 'status-value success';
    } else if (isScraping) {
      scrollStatusEl.textContent = 'Yorum paneli açılıyor...';
      scrollStatusEl.className = 'status-value';
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SCRAPE_UPDATE') {
      applyScrapeUiState({
        count: message.count,
        phase: message.phase,
        expectedTotal: message.expectedTotal || 0,
      });
    }

    if (message.type === 'FOLLOW_VERIFY_PROGRESS' && followVerifyStatus) {
      if (message.mode === 'bulk') {
        followVerifyStatus.textContent = `@${message.account} takipçileri · ${message.found}/${message.total} katılımcı eşleşti`;
      } else {
        followVerifyStatus.textContent = `${message.current}/${message.total} · @${message.participant}`;
      }
    }

    if (message.type === 'FOLLOW_VERIFY_DONE' && followVerifyStatus) {
      followVerifyStatus.textContent = 'Tamamlandı';
      followVerifyStatus.className = 'status-value success';
      followVerifyRunning = false;
      if (btnVerifyFollows) btnVerifyFollows.disabled = false;
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
    scrollStatusEl.className = 'status-value';
    progressContainer.style.display = 'block';
    scheduleZeroCommentHint();

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
    clearZeroCommentHintTimer();

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
      chrome.tabs.sendMessage(activeTabId, { type: 'GET_COMMENTS' }, async (response) => {
        if (!response?.comments?.length) return;

        scrapedComments = response.comments;
        const scrapedLikers = response.likers || [];
        btnExport.disabled = true;
        btnExport.textContent = 'Aktarılıyor...';

        try {
          await exportCommentsToApp(scrapedComments, scrapedLikers);
          const likerNote = scrapedLikers.length > 0 ? ` · ${scrapedLikers.length} beğeni` : '';
          btnExport.textContent = `Aktarıldı ✓ (${scrapedComments.length} yorum${likerNote})`;
        } catch (_) {
          btnExport.textContent = 'Çekilişe Gönder 🚀';
          btnExport.disabled = false;
        }
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
