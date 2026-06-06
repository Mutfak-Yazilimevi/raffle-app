// Instagram takip doğrulama orkestrasyonu

const VERIFY_STORAGE_KEY = 'raffle_follow_verify_progress';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForTabComplete(tabId, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const check = (tab) => {
      if (!tab || tab.id !== tabId) return;
      if (tab.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve(tab);
      } else if (Date.now() - started > timeoutMs) {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        reject(new Error('tab_load_timeout'));
      }
    };

    function onUpdated(updatedTabId, info, tab) {
      if (updatedTabId !== tabId) return;
      if (info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve(tab);
      }
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        reject(chrome.runtime.lastError);
        return;
      }
      if (tab.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve(tab);
      }
    });
  });
}

async function ensureContentScripts(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch (_) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['followVerify.js', 'content.js'],
    });
  }
}

async function verifyParticipantOnTab(tabId, participant, requiredAccounts, minRequired) {
  const url = `https://www.instagram.com/${encodeURIComponent(participant)}/`;
  await chrome.tabs.update(tabId, { url });
  await waitForTabComplete(tabId);
  await sleep(2200);
  await ensureContentScripts(tabId);

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, {
      type: 'VERIFY_PARTICIPANT_FOLLOWS',
      requiredFollowAccounts: requiredAccounts,
      minRequiredFollows: minRequired,
    }, (response) => {
      if (chrome.runtime.lastError || !response) {
        resolve({
          ok: false,
          error: chrome.runtime.lastError?.message || 'verify_message_failed',
          followed: [],
          missing: requiredAccounts,
          meetsRequirement: false,
        });
        return;
      }
      resolve(response);
    });
  });
}

async function writeResultsToAppTab(appTabId, payload) {
  await chrome.scripting.executeScript({
    target: { tabId: appTabId },
    func: (data) => {
      try {
        localStorage.setItem('raffle_follow_verify_results', JSON.stringify(data));
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'raffle_follow_verify_results',
          newValue: JSON.stringify(data),
        }));
      } catch (e) {
        console.error('Takip doğrulama sonuçları yazılamadı:', e);
      }
    },
    args: [payload],
  });
}

async function runFollowVerification({ participants, requiredFollowAccounts, minRequiredFollows, appTabId, requestId }) {
  const results = {};
  let verifyTabId = null;

  try {
    const created = await chrome.tabs.create({ url: 'https://www.instagram.com/', active: false });
    verifyTabId = created.id;
    await waitForTabComplete(verifyTabId);
    await sleep(1500);

    for (let i = 0; i < participants.length; i += 1) {
      const participant = participants[i];
      const progress = {
        requestId,
        status: 'running',
        current: i + 1,
        total: participants.length,
        participant,
      };
      await chrome.storage.local.set({ [VERIFY_STORAGE_KEY]: progress });
      chrome.runtime.sendMessage({ type: 'FOLLOW_VERIFY_PROGRESS', ...progress }).catch(() => {});

      results[participant] = await verifyParticipantOnTab(
        verifyTabId,
        participant,
        requiredFollowAccounts,
        minRequiredFollows
      );

      await sleep(800);
    }

    const payload = {
      requestId,
      status: 'completed',
      completedAt: new Date().toISOString(),
      requiredFollowAccounts,
      minRequiredFollows,
      results,
    };

    if (appTabId) {
      await writeResultsToAppTab(appTabId, payload);
    }

    await chrome.storage.local.set({ [VERIFY_STORAGE_KEY]: { requestId, status: 'completed', total: participants.length } });
    chrome.runtime.sendMessage({ type: 'FOLLOW_VERIFY_DONE', ...payload }).catch(() => {});

    return payload;
  } finally {
    if (verifyTabId) {
      chrome.tabs.remove(verifyTabId).catch(() => {});
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_FOLLOW_VERIFICATION') {
    runFollowVerification(message)
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
    return true;
  }

  if (message.type === 'GET_FOLLOW_VERIFY_PROGRESS') {
    chrome.storage.local.get(VERIFY_STORAGE_KEY, (data) => {
      sendResponse(data[VERIFY_STORAGE_KEY] || null);
    });
    return true;
  }

  return false;
});

// Popup ile content script arasında oturum yönetimi.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'raffle-popup') return;

  let scrapingTabId = null;

  port.onMessage.addListener((msg) => {
    if (msg.type === 'SCRAPING_STARTED' && msg.tabId) {
      scrapingTabId = msg.tabId;
    }
    if (msg.type === 'SCRAPING_STOPPED') {
      scrapingTabId = null;
    }
  });

  port.onDisconnect.addListener(() => {
    if (!scrapingTabId) return;
    chrome.tabs.sendMessage(scrapingTabId, { type: 'STOP_SCRAPING' }).catch(() => {});
    scrapingTabId = null;
  });
});
