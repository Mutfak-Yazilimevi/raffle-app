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

function extractUsernameFromHref(href) {
  const match = (href || '').match(/^\/([^/?#]+)\/?$/);
  if (!match) return null;
  const name = match[1].toLowerCase();
  if (SKIP_PATHS.has(name)) return null;
  return name;
}

function findScrollableElement(root) {
  const queue = [root];
  while (queue.length) {
    const el = queue.shift();
    if (!(el instanceof HTMLElement)) continue;

    const style = window.getComputedStyle(el);
    const canScroll = style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay';
    if (canScroll && el.scrollHeight > el.clientHeight + 20) {
      return el;
    }

    for (const child of el.children) {
      queue.push(child);
    }
  }
  return root;
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

async function waitForProfileReady(timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (document.querySelector('a[href$="/following/"]')) return true;
    await sleep(120);
  }
  return false;
}

async function openFollowingDialog() {
  const link = document.querySelector('a[href$="/following/"]');
  if (!link) return null;

  try {
    link.click();
  } catch (_) {
    return null;
  }

  for (let i = 0; i < 16; i += 1) {
    await sleep(150);
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) return dialog;
  }
  return null;
}

function closeTopDialog() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

async function scanFollowingDialog(requiredAccounts, minRequired) {
  const dialog = await openFollowingDialog();
  if (!dialog) {
    return { ok: false, error: 'following_dialog_not_found', followed: [], missing: requiredAccounts };
  }

  const scrollEl = findScrollableElement(dialog);
  const found = new Set();
  const requiredSet = new Set(requiredAccounts);
  let staleRounds = 0;

  for (let round = 0; round < 32 && staleRounds < 4; round += 1) {
    const before = found.size;
    if (collectUsernamesFromRoot(dialog, found, requiredSet)) break;

    const matchedCount = requiredAccounts.filter((acc) => found.has(acc)).length;
    if (matchedCount >= minRequired) break;

    scrollEl.scrollTop += Math.max(360, scrollEl.clientHeight * 0.9);
    await sleep(220);
    if (collectUsernamesFromRoot(dialog, found, requiredSet)) break;

    if (found.size === before) staleRounds += 1;
    else staleRounds = 0;
  }

  closeTopDialog();
  await sleep(180);

  const followed = requiredAccounts.filter((acc) => found.has(acc));
  const missing = requiredAccounts.filter((acc) => !found.has(acc));

  return {
    ok: true,
    followed,
    missing,
    meetsRequirement: followed.length >= minRequired,
    checkedVia: 'following_list',
  };
}

async function verifyParticipantFollowsRequired(requiredAccountsInput, minRequiredInput) {
  const requiredAccounts = (requiredAccountsInput || []).map(normalizeUsername).filter(Boolean);
  const minRequired = Math.max(1, Math.min(
    parseInt(minRequiredInput, 10) || requiredAccounts.length,
    requiredAccounts.length
  ));

  if (requiredAccounts.length === 0) {
    return { ok: true, followed: [], missing: [], meetsRequirement: true, checkedVia: 'none' };
  }

  const followedSet = new Set();
  const loggedInUser = getLoggedInUsername();

  if (loggedInUser && requiredAccounts.includes(loggedInUser) && pageHasFollowsYouIndicator()) {
    followedSet.add(loggedInUser);
  }

  const remaining = requiredAccounts.filter((acc) => !followedSet.has(acc));
  if (followedSet.size >= minRequired) {
    return {
      ok: true,
      followed: Array.from(followedSet),
      missing: remaining,
      meetsRequirement: true,
      checkedVia: 'follows_you',
    };
  }

  const listResult = await scanFollowingDialog(requiredAccounts, minRequired);
  if (!listResult.ok) {
    const followed = Array.from(followedSet);
    const missing = requiredAccounts.filter((acc) => !followedSet.has(acc));
    return {
      ok: followed.length > 0,
      error: listResult.error,
      followed,
      missing,
      meetsRequirement: followed.length >= minRequired,
      checkedVia: followed.length > 0 ? 'follows_you' : 'failed',
    };
  }

  listResult.followed.forEach((acc) => followedSet.add(acc));
  const followed = requiredAccounts.filter((acc) => followedSet.has(acc));
  const missing = requiredAccounts.filter((acc) => !followedSet.has(acc));

  return {
    ok: true,
    followed,
    missing,
    meetsRequirement: followed.length >= minRequired,
    checkedVia: loggedInUser && followedSet.has(loggedInUser) ? 'follows_you+following_list' : 'following_list',
  };
}

if (typeof window !== 'undefined') {
  window.__raffleFollowVerify = {
    verifyParticipantFollowsRequired,
    waitForProfileReady,
  };
}
