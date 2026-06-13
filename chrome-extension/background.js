// Instagram takip doğrulama orkestrasyonu

const VERIFY_STORAGE_KEY = 'raffle_follow_verify_progress';
const PROFILE_READY_TIMEOUT_MS = 4500;
const TAB_LOAD_TIMEOUT_MS = 18000;
const VERIFY_CONCURRENCY = 2;
const BULK_ACCOUNT_CONCURRENCY = 3;
const BULK_VERIFY_THRESHOLD = 60;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeParticipants(participants) {
  return Array.from(new Set(
    (participants || []).map((p) => String(p).replace(/^@+/, '').toLowerCase()).filter(Boolean),
  ));
}

function normalizeAccounts(accounts) {
  return Array.from(new Set(
    (accounts || []).map((a) => String(a).replace(/^@+/, '').toLowerCase()).filter(Boolean),
  ));
}

function waitForTabComplete(tabId, timeoutMs = TAB_LOAD_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let settled = false;

    function finish(fn, value) {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      clearTimeout(timeoutId);
      fn(value);
    }

    function onUpdated(updatedTabId, info) {
      if (updatedTabId !== tabId) return;
      if (info.status === 'complete') finish(resolve, true);
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
      if (tab.status === 'complete') finish(resolve, true);
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
  const response = await sendTabMessage(tabId, {
    type: 'WAIT_PROFILE_READY',
    timeoutMs,
  });
  return Boolean(response?.ready);
}

async function createVerifyTab() {
  const created = await chrome.tabs.create({ url: 'https://www.instagram.com/', active: false });
  await waitForTabComplete(created.id).catch(() => {});
  await sleep(120);
  return created.id;
}

function saveProgress(progress) {
  chrome.storage.local.set({ [VERIFY_STORAGE_KEY]: progress });
  chrome.runtime.sendMessage({ type: 'FOLLOW_VERIFY_PROGRESS', ...progress }).catch(() => {});
}

async function verifyParticipantOnTab(tabId, participant, requiredAccounts, minRequired) {
  const encoded = encodeURIComponent(participant);

  await chrome.tabs.update(tabId, { url: `https://www.instagram.com/${encoded}/` });
  await waitForTabComplete(tabId).catch(() => {});
  await ensureContentScripts(tabId);
  await waitForProfileReady(tabId);

  const profileResult = await sendTabMessage(tabId, {
    type: 'VERIFY_PARTICIPANT_FOLLOWS',
    phase: 'profile',
    requiredFollowAccounts: requiredAccounts,
    minRequiredFollows: minRequired,
  });

  if (profileResult?.meetsRequirement) return profileResult;

  await ensureContentScripts(tabId);

  const listResult = await sendTabMessage(tabId, {
    type: 'VERIFY_PARTICIPANT_FOLLOWS',
    phase: 'following',
    priorFollowed: profileResult?.followed || [],
    requiredFollowAccounts: requiredAccounts,
    minRequiredFollows: minRequired,
  });

  if (listResult) return listResult;

  return profileResult || {
    ok: false,
    error: 'verify_message_failed',
    followed: [],
    missing: requiredAccounts,
    meetsRequirement: false,
  };
}

async function scanAccountFollowersOnTab(tabId, targetAccount, participants, requestId) {
  await chrome.tabs.update(tabId, {
    url: `https://www.instagram.com/${encodeURIComponent(targetAccount)}/`,
  });
  await waitForTabComplete(tabId).catch(() => {});
  await ensureContentScripts(tabId);
  await waitForProfileReady(tabId);

  return sendTabMessage(tabId, {
    type: 'SCAN_FOLLOWERS_FOR_PARTICIPANTS',
    targetAccount,
    participants,
    requestId,
    maxRounds: Math.min(4000, Math.max(600, Math.ceil(participants.length * 4))),
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

async function runPerParticipantVerification({
  participants,
  requiredFollowAccounts,
  minRequiredFollows,
  appTabId,
  requestId,
}) {
  const results = {};
  const verifyTabIds = [];
  let nextIndex = 0;
  let completedCount = 0;

  function reportProgress(participant) {
    completedCount += 1;
    saveProgress({
      requestId,
      status: 'running',
      mode: 'profile',
      current: completedCount,
      total: participants.length,
      participant,
    });
  }

  async function worker(tabId) {
    while (nextIndex < participants.length) {
      const index = nextIndex;
      nextIndex += 1;
      const participant = participants[index];

      results[participant] = await verifyParticipantOnTab(
        tabId,
        participant,
        requiredFollowAccounts,
        minRequiredFollows,
      );

      reportProgress(participant);
    }
  }

  try {
    const workerCount = Math.min(VERIFY_CONCURRENCY, participants.length);
    for (let i = 0; i < workerCount; i += 1) {
      verifyTabIds.push(await createVerifyTab());
    }

    await Promise.all(verifyTabIds.map((tabId) => worker(tabId)));

    return results;
  } finally {
    for (const tabId of verifyTabIds) {
      chrome.tabs.remove(tabId).catch(() => {});
    }
  }
}

async function runBulkFollowVerification({
  participants,
  requiredFollowAccounts,
  minRequiredFollows,
  requestId,
}) {
  const matchMap = Object.fromEntries(participants.map((p) => [p, new Set()]));
  const verifyTabIds = [];

  saveProgress({
    requestId,
    status: 'running',
    mode: 'bulk',
    current: 0,
    total: participants.length,
    participant: requiredFollowAccounts.join(', '),
    message: `@${requiredFollowAccounts[0]} profilinde takipçi listesi açılıyor…`,
  });

  async function scanRequiredAccount(targetAccount, tabId) {
    const stillPending = participants.filter((participant) => !matchMap[participant].has(targetAccount));
    if (stillPending.length === 0) {
      return { targetAccount, matched: [] };
    }

    const scanResult = await scanAccountFollowersOnTab(tabId, targetAccount, stillPending, requestId);
    const matched = scanResult?.matched || [];

    for (const participant of matched) {
      if (matchMap[participant]) matchMap[participant].add(targetAccount);
    }

    return scanResult || { targetAccount, matched: [] };
  }

  try {
    const workerCount = Math.min(BULK_ACCOUNT_CONCURRENCY, requiredFollowAccounts.length);
    for (let i = 0; i < workerCount; i += 1) {
      verifyTabIds.push(await createVerifyTab());
    }

    let accountIndex = 0;
    async function accountWorker(tabId) {
      while (accountIndex < requiredFollowAccounts.length) {
        const index = accountIndex;
        accountIndex += 1;
        await scanRequiredAccount(requiredFollowAccounts[index], tabId);
      }
    }

    await Promise.all(verifyTabIds.map((tabId) => accountWorker(tabId)));

    const results = {};
    for (const participant of participants) {
      const followed = requiredFollowAccounts.filter((acc) => matchMap[participant].has(acc));
      const missing = requiredFollowAccounts.filter((acc) => !matchMap[participant].has(acc));
      results[participant] = {
        ok: true,
        followed,
        missing,
        meetsRequirement: followed.length >= minRequiredFollows,
        checkedVia: 'bulk_followers_popup',
      };
    }

    return results;
  } finally {
    for (const tabId of verifyTabIds) {
      chrome.tabs.remove(tabId).catch(() => {});
    }
  }
}

async function runFollowVerification({
  participants,
  requiredFollowAccounts,
  minRequiredFollows,
  appTabId,
  requestId,
}) {
  const uniqueParticipants = normalizeParticipants(participants);
  const requiredAccounts = normalizeAccounts(requiredFollowAccounts);
  const minRequired = Math.max(1, Math.min(
    parseInt(minRequiredFollows, 10) || requiredAccounts.length,
    requiredAccounts.length,
  ));

  const useBulkMode = uniqueParticipants.length >= BULK_VERIFY_THRESHOLD;

  const results = useBulkMode
    ? await runBulkFollowVerification({
      participants: uniqueParticipants,
      requiredFollowAccounts: requiredAccounts,
      minRequiredFollows: minRequired,
      requestId,
    })
    : await runPerParticipantVerification({
      participants: uniqueParticipants,
      requiredFollowAccounts: requiredAccounts,
      minRequiredFollows: minRequired,
      appTabId,
      requestId,
    });

  const payload = {
    requestId,
    status: 'completed',
    mode: useBulkMode ? 'bulk' : 'profile',
    completedAt: new Date().toISOString(),
    requiredFollowAccounts: requiredAccounts,
    minRequiredFollows: minRequired,
    results,
    summary: useBulkMode ? {
      passed: Object.values(results).filter((r) => r.meetsRequirement).length,
      total: uniqueParticipants.length,
    } : null,
  };

  if (appTabId) {
    await writeResultsToAppTab(appTabId, payload);
  }

  await chrome.storage.local.set({
    [VERIFY_STORAGE_KEY]: {
      requestId,
      status: 'completed',
      mode: payload.mode,
      total: uniqueParticipants.length,
    },
  });
  chrome.runtime.sendMessage({ type: 'FOLLOW_VERIFY_DONE', ...payload }).catch(() => {});

  return payload;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractOgMeta(html, property) {
  const esc = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re1 = new RegExp(`<meta[^>]+property=["']${esc}["'][^>]+content=["']([^"']*?)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+property=["']${esc}["']`, 'i');
  const m = html.match(re1) || html.match(re2);
  return m ? decodeHtmlEntities(m[1]) : null;
}

async function fetchPostMetadata(url) {
  let html;
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'tr,en;q=0.5',
      },
    });
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    html = await resp.text();
  } catch (err) {
    return { ok: false, error: err.message || 'Ağ hatası' };
  }

  const title = extractOgMeta(html, 'og:title');
  const description = extractOgMeta(html, 'og:description');
  const ogImageUrl = extractOgMeta(html, 'og:image');

  if (!title && !description) {
    return { ok: false, error: 'Post bilgileri bulunamadı (giriş gerekiyor olabilir)' };
  }

  // Instagram og:title formats:
  // "Display Name (@username) • Instagram photos and videos"
  // "Display Name (@username) on Instagram: \"caption\""
  let brandName = null;
  if (title) {
    const m1 = title.match(/^(.+?)\s+\(@[^)]+\)/);
    if (m1) {
      brandName = m1[1].trim();
    } else {
      const m2 = title.match(/^@?(\S+)\s+[•·]/);
      if (m2) brandName = m2[1].trim();
    }
  }

  let imageDataUrl = null;
  if (ogImageUrl) {
    try {
      const imgResp = await fetch(ogImageUrl);
      if (imgResp.ok) {
        const buf = await imgResp.arrayBuffer();
        if (buf.byteLength <= 3 * 1024 * 1024) {
          const uint8 = new Uint8Array(buf);
          let bin = '';
          for (let i = 0; i < uint8.length; i += 8192) {
            bin += String.fromCharCode(...uint8.subarray(i, Math.min(i + 8192, uint8.length)));
          }
          const ct = imgResp.headers.get('content-type') || 'image/jpeg';
          imageDataUrl = `data:${ct};base64,${btoa(bin)}`;
        }
      }
    } catch (_) {
      // image fetch failed, not critical
    }
  }

  return { ok: true, postUrl: url, brandName, title, description, imageDataUrl };
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

  if (message.type === 'FETCH_POST_METADATA') {
    fetchPostMetadata(message.url)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  return false;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_POST_METADATA') {
    fetchPostMetadata(message.url)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
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
