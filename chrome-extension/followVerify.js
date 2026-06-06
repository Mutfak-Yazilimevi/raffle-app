// Instagram takip doğrulama yardımcıları (content script)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUsername(value) {
  return String(value || '').trim().replace(/^@+/, '').toLowerCase();
}

function extractUsernameFromHref(href) {
  const match = (href || '').match(/^\/([^/?#]+)\/?$/);
  if (!match) return null;
  const name = match[1].toLowerCase();
  const skip = new Set([
    'explore', 'accounts', 'direct', 'reels', 'stories', 'p', 'reel', 'tags',
    'locations', 'about', 'legal', 'following', 'followers', 'popular', 'tv',
  ]);
  if (skip.has(name)) return null;
  return name;
}

function findScrollableElement(root) {
  const candidates = root.querySelectorAll('div');
  for (const el of candidates) {
    const style = window.getComputedStyle(el);
    const canScroll = style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay';
    if (canScroll && el.scrollHeight > el.clientHeight + 20) {
      return el;
    }
  }
  return root;
}

function collectUsernamesFromRoot(root, foundSet) {
  for (const link of root.querySelectorAll('a[href^="/"]')) {
    const username = extractUsernameFromHref(link.getAttribute('href'));
    if (username) foundSet.add(username);
  }
}

function pageHasFollowsYouIndicator() {
  const text = (document.body?.innerText || '').toLowerCase();
  return (
    text.includes('follows you') ||
    text.includes('seni takip ediyor') ||
    text.includes('sizi takip ediyor')
  );
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

async function openFollowingDialog() {
  const link = document.querySelector('a[href$="/following/"]');
  if (!link) return null;

  try {
    link.click();
  } catch (_) {
    return null;
  }

  for (let i = 0; i < 20; i += 1) {
    await sleep(250);
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
  let staleRounds = 0;

  for (let round = 0; round < 50 && staleRounds < 6; round += 1) {
    const before = found.size;
    collectUsernamesFromRoot(dialog, found);

    const matchedCount = requiredAccounts.filter((acc) => found.has(acc)).length;
    if (matchedCount >= minRequired) break;

    scrollEl.scrollTop += Math.max(300, scrollEl.clientHeight * 0.85);
    await sleep(350);
    collectUsernamesFromRoot(dialog, found);

    if (found.size === before) staleRounds += 1;
    else staleRounds = 0;
  }

  closeTopDialog();
  await sleep(300);

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

// eslint-disable-next-line no-undef
if (typeof window !== 'undefined') {
  window.__raffleFollowVerify = { verifyParticipantFollowsRequired };
}
