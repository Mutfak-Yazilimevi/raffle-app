// Instagram takip doğrulama yardımcıları (content script)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@+/, '').toLowerCase();
}

const SKIP_PATHS = new Set([
  'explore', 'accounts', 'direct', 'reels', 'stories', 'p', 'reel', 'tags',
  'locations', 'about', 'legal', 'following', 'followers', 'popular', 'tv',
]);

const FOLLOWS_YOU_LABELS = new Set([
  'follows you',
  'seni takip ediyor',
  'sizi takip ediyor',
]);

const BULK_VERIFY_THRESHOLD = 60;

const networkUsernames = new Set();

window.addEventListener('message', (event) => {
  if (event.source !== window || event.data?.type !== 'RAFFLE_IG_NETWORK') return;
  ingestUsersFromNetworkPayload(event.data.body);
});

function ingestUsersFromNetworkPayload(payload) {
  if (!payload || !/following|follower|friendship|edge_follow|username|"edges"/i.test(payload)) return;

  try {
    walkNetworkUsernames(JSON.parse(payload));
  } catch (_) {
    /* ignore invalid JSON */
  }
}

function walkNetworkUsernames(value, depth = 0) {
  if (!value || depth > 18) return;

  if (Array.isArray(value)) {
    for (const item of value) walkNetworkUsernames(item, depth + 1);
    return;
  }

  if (typeof value !== 'object') return;

  if (typeof value.username === 'string') {
    const name = normalizeUsername(value.username);
    if (name && !SKIP_PATHS.has(name)) networkUsernames.add(name);
  }

  if (value.user?.username) {
    networkUsernames.add(normalizeUsername(value.user.username));
  }

  if (value.node?.username) {
    networkUsernames.add(normalizeUsername(value.node.username));
  }

  if (Array.isArray(value.edges)) {
    for (const edge of value.edges) {
      walkNetworkUsernames(edge, depth + 1);
    }
  }

  for (const key of Object.keys(value)) {
    if (key === '__typename' || key === 'page_info') continue;
    walkNetworkUsernames(value[key], depth + 1);
  }
}

function extractUsernameFromHref(href) {
  const match = (href || '').match(/^\/([^/?#]+)\/?$/);
  if (!match) return null;
  const name = match[1].toLowerCase();
  if (SKIP_PATHS.has(name)) return null;
  return name;
}

function findScrollableElement(root) {
  let best = root;
  let bestRoom = 0;

  const queue = [root];
  while (queue.length) {
    const el = queue.shift();
    if (!(el instanceof HTMLElement)) continue;

    const style = window.getComputedStyle(el);
    const canScroll = style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay';
    if (canScroll && el.scrollHeight > el.clientHeight + 20) {
      const room = el.scrollHeight - el.clientHeight;
      if (room > bestRoom) {
        bestRoom = room;
        best = el;
      }
    }

    for (const child of el.children) queue.push(child);
  }

  return best;
}

function getListScanRoot() {
  return document.querySelector('div[role="dialog"], [aria-modal="true"]')
    || document.querySelector('main')
    || document;
}

/** main > header > section > div > div:nth-child(n) > a — sınıflar değişken. */
function findProfileHeaderStatLinks() {
  const main = document.querySelector('main');
  if (!main) return null;

  const header = main.querySelector('header');
  if (!header) return null;

  const section = header.querySelector('section');
  if (!section) return null;

  const row = section.querySelector(':scope > div');
  if (!row) return null;

  const links = {
    posts: row.querySelector(':scope > div:nth-child(1) > a'),
    followers: row.querySelector(':scope > div:nth-child(2) > a'),
    following: row.querySelector(':scope > div:nth-child(3) > a'),
  };

  for (const block of row.querySelectorAll(':scope > div')) {
    const anchor = block.querySelector(':scope > a[href^="/"]');
    if (!anchor) continue;
    const href = anchor.getAttribute('href') || '';
    if (/\/followers\/?/i.test(href)) links.followers = anchor;
    if (/\/following\/?/i.test(href)) links.following = anchor;
  }

  return links;
}

function dispatchClick(el) {
  if (!(el instanceof Element)) return false;
  try {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    el.click();
    return true;
  } catch (_) {
    return false;
  }
}

async function openProfileListPopup(listKind = 'followers') {
  await waitForProfileReady(6000);

  const statLinks = findProfileHeaderStatLinks();
  let link = listKind === 'following' ? statLinks?.following : statLinks?.followers;

  if (!link) {
    link = document.querySelector(
      listKind === 'following'
        ? 'main header a[href*="/following"]'
        : 'main header a[href*="/followers"]',
    );
  }

  if (!link) return false;

  dispatchClick(link);
  await sleep(300);

  const started = Date.now();
  while (Date.now() - started < 5000) {
    const dialog = document.querySelector('div[role="dialog"], [aria-modal="true"]');
    if (dialog && dialog.querySelectorAll('a[href^="/"]').length >= 3) return true;
    await sleep(60);
  }

  return Boolean(document.querySelector('div[role="dialog"], [aria-modal="true"]'));
}

function collectUsernamesFromRoot(root, foundSet, requiredSet) {
  for (const link of root.querySelectorAll('a[href^="/"]')) {
    const username = extractUsernameFromHref(link.getAttribute('href'));
    if (!username) continue;
    foundSet.add(username);
    if (requiredSet && requiredSet.size > 0 && [...requiredSet].every((acc) => foundSet.has(acc))) {
      return true;
    }
  }
  return false;
}

function mergeNetworkUsernames(foundSet, requiredSet) {
  for (const username of networkUsernames) {
    foundSet.add(username);
    if (requiredSet && requiredSet.size > 0 && [...requiredSet].every((acc) => foundSet.has(acc))) {
      return true;
    }
  }
  return false;
}

function collectAllUsernamesFromRoot(root, intoSet) {
  for (const link of root.querySelectorAll('a[href^="/"]')) {
    const username = extractUsernameFromHref(link.getAttribute('href'));
    if (username) intoSet.add(username);
  }
  for (const username of networkUsernames) {
    intoSet.add(username);
  }
  return intoSet.size;
}

function collectPendingMatches(root, pending, matched) {
  for (const link of root.querySelectorAll('a[href^="/"]')) {
    const username = extractUsernameFromHref(link.getAttribute('href'));
    if (!username || !pending.has(username)) continue;
    pending.delete(username);
    matched.add(username);
    if (pending.size === 0) return true;
  }

  for (const username of networkUsernames) {
    if (!pending.has(username)) continue;
    pending.delete(username);
    matched.add(username);
    if (pending.size === 0) return true;
  }

  return pending.size === 0;
}

function countMatched(requiredAccounts, foundSet) {
  return requiredAccounts.filter((acc) => foundSet.has(acc)).length;
}

function buildFollowResult(requiredAccounts, foundSet, minRequired, checkedVia, ok = true, error = null) {
  const followed = requiredAccounts.filter((acc) => foundSet.has(acc));
  const missing = requiredAccounts.filter((acc) => !foundSet.has(acc));

  return {
    ok,
    error,
    followed,
    missing,
    meetsRequirement: followed.length >= minRequired,
    checkedVia,
  };
}

function pageHasFollowsYouIndicator() {
  const scope = document.querySelector('header, main section, [role="main"]') || document.body;
  for (const el of scope.querySelectorAll('span, div, a')) {
    const text = (el.textContent || '').trim().toLowerCase();
    if (text.length > 40) continue;
    if (FOLLOWS_YOU_LABELS.has(text)) return true;
  }
  return false;
}

function getLoggedInUsername() {
  const selectors = [
    'header a[href^="/"][href$="/"] img',
    'nav a[href^="/"][href$="/"] img',
    'a[href^="/"][href$="/"] img[alt*="profile" i]',
  ];
  for (const selector of selectors) {
    const img = document.querySelector(selector);
    const link = img?.closest('a[href^="/"]');
    const username = extractUsernameFromHref(link?.getAttribute('href'));
    if (username) return username;
  }
  return null;
}

async function waitForProfileReady(timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (document.querySelector('a[href$="/following/"], a[href$="/followers/"]')) return true;
    await sleep(40);
  }
  return false;
}

async function waitForListPageReady(timeoutMs = 4500) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const root = getListScanRoot();
    if (root.querySelectorAll('a[href^="/"]').length >= 4) return true;
    await sleep(40);
  }
  return false;
}

function closeTopDialog() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

function reportBulkScanProgress(targetAccount, matchedCount, totalCount, pendingCount) {
  chrome.runtime.sendMessage({
    type: 'FOLLOW_VERIFY_PROGRESS',
    mode: 'bulk',
    account: targetAccount,
    found: matchedCount,
    total: totalCount,
    pending: pendingCount,
    current: matchedCount,
    participant: `@${targetAccount}`,
  }).catch(() => {});
}

async function scanAccountFollowersForParticipants(targetAccountInput, participantsInput, options = {}) {
  const targetAccount = normalizeUsername(targetAccountInput);
  const participants = (participantsInput || []).map(normalizeUsername).filter(Boolean);
  const pending = new Set(participants);
  const matched = new Set();
  const totalCount = participants.length;

  if (participants.length === 0) {
    return { ok: true, targetAccount, matched: [], pendingRemaining: 0, rounds: 0, completedVia: 'empty' };
  }

  networkUsernames.clear();

  const popupOpened = await openProfileListPopup('followers');
  if (!popupOpened) {
    return {
      ok: false,
      error: 'followers_popup_failed',
      targetAccount,
      matched: [],
      pendingRemaining: pending.size,
      rounds: 0,
      completedVia: 'popup_open_failed',
    };
  }

  await waitForListPageReady();

  const root = getListScanRoot();
  const scrollEl = findScrollableElement(root);
  const maxRounds = options.maxRounds || Math.min(4000, Math.max(600, Math.ceil(totalCount * 4)));
  const staleLimit = options.staleLimit || 35;
  const scrollWaitMs = options.scrollWaitMs || 120;
  let staleRounds = 0;
  let rounds = 0;
  let lastListSize = 0;
  let completedVia = 'max_rounds';

  const measureList = () => {
    const seen = new Set();
    collectAllUsernamesFromRoot(root, seen);
    return seen.size;
  };

  const ingestMatches = () => collectPendingMatches(root, pending, matched);

  ingestMatches();
  lastListSize = measureList();
  reportBulkScanProgress(targetAccount, matched.size, totalCount, pending.size);

  if (pending.size === 0) {
    return {
      ok: true,
      targetAccount,
      matched: Array.from(matched),
      pendingRemaining: 0,
      rounds: 0,
      completedVia: 'all_matched',
    };
  }

  while (rounds < maxRounds && staleRounds < staleLimit && pending.size > 0) {
    rounds += 1;

    const beforeScrollTop = scrollEl.scrollTop;
    scrollEl.scrollTop += Math.max(520, scrollEl.clientHeight * 0.92);
    if (scrollEl.scrollTop === beforeScrollTop) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
    scrollEl.dispatchEvent(new WheelEvent('wheel', {
      deltaY: 950,
      bubbles: true,
      cancelable: true,
    }));
    await sleep(scrollWaitMs);

    ingestMatches();
    if (pending.size === 0) {
      completedVia = 'all_matched';
      break;
    }

    const listSize = measureList();
    const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 40;

    if (listSize > lastListSize) {
      staleRounds = 0;
      lastListSize = listSize;
    } else if (atBottom) {
      staleRounds += 1;
    } else {
      staleRounds = 0;
    }

    if (rounds % 6 === 0) {
      reportBulkScanProgress(targetAccount, matched.size, totalCount, pending.size);
    }
  }

  if (pending.size === 0) {
    completedVia = 'all_matched';
  } else if (staleRounds >= staleLimit) {
    completedVia = 'list_exhausted';
  }

  closeTopDialog();
  reportBulkScanProgress(targetAccount, matched.size, totalCount, pending.size);

  return {
    ok: true,
    targetAccount,
    matched: Array.from(matched),
    pendingRemaining: pending.size,
    rounds,
    completedVia,
    listSize: lastListSize,
  };
}

function buildResultsFromMatchMap(participants, requiredAccounts, minRequired, matchMap) {
  const results = {};

  for (const participant of participants) {
    const followedSet = new Set(matchMap[participant] || []);
    results[participant] = buildFollowResult(
      requiredAccounts,
      followedSet,
      minRequired,
      'bulk_followers_popup',
    );
  }

  return results;
}

async function scanFollowingSurface(requiredAccounts, minRequired, initialFound = new Set()) {
  networkUsernames.clear();

  const popupOpened = await openProfileListPopup('following');
  if (!popupOpened) {
    await waitForListPageReady();
  }

  const root = getListScanRoot();
  const scrollEl = findScrollableElement(root);
  const found = new Set(initialFound);
  const requiredSet = new Set(requiredAccounts);
  let staleRounds = 0;

  collectUsernamesFromRoot(root, found, requiredSet);
  mergeNetworkUsernames(found, requiredSet);
  if (countMatched(requiredAccounts, found) >= minRequired) {
    return buildFollowResult(requiredAccounts, found, minRequired, 'following_list');
  }

  for (let round = 0; round < 20 && staleRounds < 3; round += 1) {
    const before = found.size;
    scrollEl.scrollTop += Math.max(420, scrollEl.clientHeight * 0.85);
    scrollEl.dispatchEvent(new WheelEvent('wheel', {
      deltaY: 700,
      bubbles: true,
      cancelable: true,
    }));
    await sleep(70);

    collectUsernamesFromRoot(root, found, requiredSet);
    mergeNetworkUsernames(found, requiredSet);

    if (countMatched(requiredAccounts, found) >= minRequired) break;
    if (found.size === before) staleRounds += 1;
    else staleRounds = 0;
  }

  closeTopDialog();
  return buildFollowResult(requiredAccounts, found, minRequired, 'following_list');
}

async function verifyProfilePhase(requiredAccounts, minRequired, followedSet) {
  const loggedInUser = getLoggedInUsername();

  if (loggedInUser && requiredAccounts.includes(loggedInUser) && pageHasFollowsYouIndicator()) {
    followedSet.add(loggedInUser);
  }

  return buildFollowResult(
    requiredAccounts,
    followedSet,
    minRequired,
    followedSet.size > 0 ? 'follows_you' : 'profile',
  );
}

async function verifyParticipantFollowsRequired(requiredAccountsInput, minRequiredInput, options = {}) {
  const requiredAccounts = (requiredAccountsInput || []).map(normalizeUsername).filter(Boolean);
  const minRequired = Math.max(1, Math.min(
    parseInt(minRequiredInput, 10) || requiredAccounts.length,
    requiredAccounts.length,
  ));
  const phase = options.phase || 'full';
  const followedSet = new Set(
    (options.priorFollowed || []).map(normalizeUsername).filter((acc) => requiredAccounts.includes(acc)),
  );

  if (requiredAccounts.length === 0) {
    return { ok: true, followed: [], missing: [], meetsRequirement: true, checkedVia: 'none' };
  }

  if (phase === 'profile') {
    return verifyProfilePhase(requiredAccounts, minRequired, followedSet);
  }

  if (phase === 'following') {
    await waitForListPageReady();
    return scanFollowingSurface(requiredAccounts, minRequired, followedSet);
  }

  const profileResult = await verifyProfilePhase(requiredAccounts, minRequired, followedSet);
  if (profileResult.meetsRequirement) return profileResult;

  profileResult.followed.forEach((acc) => followedSet.add(acc));
  return scanFollowingSurface(requiredAccounts, minRequired, followedSet);
}

if (typeof window !== 'undefined') {
  window.__raffleFollowVerify = {
    BULK_VERIFY_THRESHOLD,
    verifyParticipantFollowsRequired,
    scanAccountFollowersForParticipants,
    buildResultsFromMatchMap,
    waitForProfileReady,
    findProfileHeaderStatLinks,
    openProfileListPopup,
  };
}
