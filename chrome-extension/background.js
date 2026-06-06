// Instagram takip doğrulama orkestrasyonu

const VERIFY_STORAGE_KEY = 'raffle_follow_verify_progress';
const PROFILE_READY_TIMEOUT_MS = 9000;
const BETWEEN_PARTICIPANTS_MS = 350;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForTabComplete(tabId, timeoutMs = 35000) {
  return new Promise((resolve, reject) => {
    let settled = false;

    function finish(fn, value) {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      clearTimeout(timeoutId);
      fn(value);
    }

    function onUpdated(updatedTabId, info, tab) {
      if (updatedTabId !== tabId) return;
      if (info.status === 'complete') {
        finish(resolve, tab);
      }
    }

    const timeoutId = setTimeout(() => {
      finish(reject, new Error('tab_load_timeout'));
    }, timeoutMs);

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        finish(reject, chrome.runtime.lastError);
        return;
      }
      if (tab.status === 'complete') {
        finish(resolve, tab);
      }
    });
  });
}

async function ensureContentScripts(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    return;
  } catch (_) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['followVerify.js', 'content.js'],
    });
  }
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError || !response) {
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

async function waitForProfileReady(tabId, timeoutMs = PROFILE_READY_TIMEOUT_MS) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const response = await sendTabMessage(tabId, {
      type: 'WAIT_PROFILE_READY',
      timeoutMs: Math.max(800, timeoutMs - (Date.now() - started)),
    });
    if (response?.ready) return true;
    await sleep(180);
  }
  return false;
}

async function verifyParticipantOnTab(tabId, participant, requiredAccounts, minRequired) {
  const url = `https://www.instagram.com/${encodeURIComponent(participant)}/`;
  await chrome.tabs.update(tabId, { url });
  await waitForTabComplete(tabId);
  await ensureContentScripts(tabId);
  await waitForProfileReady(tabId);

  const response = await sendTabMessage(tabId, {
    type: 'VERIFY_PARTICIPANT_FOLLOWS',
    requiredFollowAccounts: requiredAccounts,
    minRequiredFollows: minRequired,
  });

  if (!response) {
    return {
      ok: false,
      error: 'verify_message_failed',
      followed: [],
      missing: requiredAccounts,
      meetsRequirement: false,
    };
  }

  return response;
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
    await sleep(600);

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

      if (i < participants.length - 1) {
        await sleep(BETWEEN_PARTICIPANTS_MS);
      }
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
