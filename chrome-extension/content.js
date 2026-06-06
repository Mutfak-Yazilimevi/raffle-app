// Instagram Çekiliş Yardımcısı - Content Script

const SKIP_USERNAMES = new Set([
  'explore', 'accounts', 'direct', 'reels', 'stories', 'p', 'reel', 'tags', 'locations', 'about', 'legal',
]);

const NOISE_PATTERNS = [
  /^\d+[gsqd]$/i,
  /^\d+\s*(gün|saat|dakika|hafta|g|s|d|h|yıl)/i,
  /^(Yanıtla|Reply|Beğen|Like|Paylaş|Share|Gönder|Send)$/i,
  /^(Diğer yanıtları gör|View replies|Hide replies|Yanıtları gizle)/i,
  /^Beğenildi/i,
  /^Verified$/i,
];

const EXPAND_ALL_PATTERNS = [
  /tüm\s*\d*\s*yorum/u,
  /view\s+all\s+\d*\s*comments?/i,
  /^\d+\s+yorum/u,
  /^\d+\s+comments/i,
];

const LOAD_MORE_PATTERNS = [
  /^daha\s+fazla\s+yorum\s+yükle$/i,
  /^load\s+more\s+comments?$/i,
];

const SVG_LOAD_LABELS = new Set([
  'load more comments',
  'daha fazla yorum yükle',
]);

const BLOCKED_ARIA_FRAGMENTS = [
  'seçenek', 'option', 'more action', 'actions', 'menu', 'şikayet', 'report',
  'sil', 'delete', 'beğen', 'like', 'yanıtla', 'reply', 'emoji', 'ifade',
];

const SCRAPE_MIN_INTERVAL_MS = 100;
const OBSERVER_DEBOUNCE_MS = 180;
const NOTIFY_MIN_INTERVAL_MS = 300;
const SCROLL_INTERVAL_MIN_MS = 550;
const SCROLL_INTERVAL_MAX_MS = 1200;

let scrapingActive = false;
let scrapingTimer = null;
let observer = null;
let observerFlushTimer = null;
let commentsMap = new Map();
let commentUl = null;
let scrollContainer = null;
let loadMoreRoot = null;
let lastNotifyTime = 0;
let lastScrapeTime = 0;
let lastParsedLiCount = 0;
let scrollStepCount = 0;
let lastCountAtClick = 0;
let scrollIntervalMs = SCROLL_INTERVAL_MIN_MS;
let clickedLoadMoreKeys = new Set();
let menuDismissStep = 0;

function isNoise(text) {
  return NOISE_PATTERNS.some((pattern) => pattern.test(text));
}

function extractUsername(link) {
  const href = link.getAttribute('href') || '';
  const match = href.match(/^\/([^/?#]+)\/?$/);
  if (!match) return null;
  const name = match[1].toLowerCase();
  if (SKIP_USERNAMES.has(name)) return null;
  return match[1];
}

function parseCommentLi(li) {
  const userLinks = li.querySelectorAll('a[href^="/"]');
  let username = null;

  for (const link of userLinks) {
    const found = extractUsername(link);
    if (found) {
      username = found;
      break;
    }
  }
  if (!username) return null;

  let commentText = '';
  const spans = li.querySelectorAll('span[dir="auto"]');

  for (const span of spans) {
    const text = span.textContent.trim();
    if (!text || text === username) continue;
    if (text.startsWith('@') && !text.includes(' ')) continue;
    if (isNoise(text)) continue;
    if (text.length > commentText.length) commentText = text;
  }

  if (!commentText) {
    const heading = li.querySelector('h1');
    if (heading) {
      const text = heading.textContent.trim();
      if (text && text !== username && !isNoise(text)) commentText = text;
    }
  }

  if (!username || !commentText) return null;
  return { username, text: commentText };
}

function findCommentSection() {
  const dialog = document.querySelector('div[role="dialog"]');
  const root = dialog || document.querySelector('main') || document;

  let bestUl = null;
  let bestScore = 0;

  for (const ul of root.querySelectorAll('ul')) {
    const directItems = ul.querySelectorAll(':scope > li');
    if (directItems.length < 1) continue;

    let score = directItems.length;
    const sample = directItems[0];
    if (sample?.querySelector('a[href^="/"]') && sample?.querySelector('span[dir="auto"], h1')) {
      score += 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestUl = ul;
    }
  }

  return bestUl;
}

function findScrollContainer(element) {
  let parent = element?.parentElement;
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const canScroll =
      style.overflowY === 'auto' ||
      style.overflowY === 'scroll' ||
      style.overflowY === 'overlay';

    if (canScroll && parent.scrollHeight > parent.clientHeight + 20) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

function refreshCommentTargets() {
  commentUl = findCommentSection();
  scrollContainer = commentUl
    ? findScrollContainer(commentUl) || findScrollContainer(commentUl.parentElement)
    : null;
  loadMoreRoot = commentUl?.closest('article')
    || document.querySelector('div[role="dialog"]')
    || document.querySelector('main')
    || document;
  lastParsedLiCount = 0;
}

function scrapeVisibleComments(forceFull = false) {
  const now = Date.now();
  if (!forceFull && now - lastScrapeTime < SCRAPE_MIN_INTERVAL_MS) {
    return commentsMap.size;
  }
  lastScrapeTime = now;

  if (!commentUl || !commentUl.isConnected) refreshCommentTargets();
  if (!commentUl) return commentsMap.size;

  const items = commentUl.querySelectorAll(':scope > li');
  const startIndex = forceFull
    ? 0
    : Math.max(0, Math.min(lastParsedLiCount, items.length) - 1);

  for (let i = startIndex; i < items.length; i += 1) {
    const parsed = parseCommentLi(items[i]);
    if (parsed) {
      commentsMap.set(`${parsed.username.toLowerCase()}:${parsed.text}`, parsed);
    }
  }

  lastParsedLiCount = items.length;
  return commentsMap.size;
}

function notifyPopup(force = false) {
  const now = Date.now();
  if (!force && now - lastNotifyTime < NOTIFY_MIN_INTERVAL_MS) return;
  lastNotifyTime = now;

  chrome.runtime.sendMessage({
    type: 'SCRAPE_UPDATE',
    count: commentsMap.size,
  }).catch(() => {});
}

function scheduleObserverScrape() {
  if (observerFlushTimer) return;
  observerFlushTimer = setTimeout(() => {
    observerFlushTimer = null;
    scrapeVisibleComments();
    notifyPopup();
  }, OBSERVER_DEBOUNCE_MS);
}

function isInsideCommentRow(el) {
  if (!commentUl) return false;
  const li = el.closest('li');
  return Boolean(li && li.closest('ul') === commentUl);
}

function getElementLabel(el) {
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
  return aria || text;
}

function hasBlockedAria(el) {
  const aria = (el.getAttribute('aria-label') || '').toLowerCase();
  return BLOCKED_ARIA_FRAGMENTS.some((part) => aria.includes(part));
}

function matchesLoadMoreLabel(label) {
  if (!label || label.length > 80) return false;
  return (
    EXPAND_ALL_PATTERNS.some((pattern) => pattern.test(label)) ||
    LOAD_MORE_PATTERNS.some((pattern) => pattern.test(label))
  );
}

function isSafeLoadMoreTarget(el) {
  if (!(el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement)) return false;
  if (isInsideCommentRow(el)) return false;
  if (hasBlockedAria(el)) return false;
  if (el.closest('[role="menu"], [role="menuitem"]')) return false;

  const label = getElementLabel(el);
  return matchesLoadMoreLabel(label);
}

function dismissAccidentalMenus() {
  menuDismissStep += 1;
  if (menuDismissStep % 4 !== 1) return;

  const panels = document.querySelectorAll('[role="dialog"], [role="menu"]');
  for (const panel of panels) {
    const text = (panel.textContent || '').toLowerCase();
    const isActionMenu =
      (text.includes('şikayet') || text.includes('report')) &&
      (text.includes('iptal') || text.includes('cancel'));

    if (!isActionMenu) continue;

    const buttons = panel.querySelectorAll('button, [role="button"]');
    for (const btn of buttons) {
      const label = (btn.textContent || '').trim().toLowerCase();
      if (label === 'iptal' || label === 'cancel') {
        try { btn.click(); } catch (_) { /* ignore */ }
        break;
      }
    }

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }
}

function clickLoadMoreButtons() {
  dismissAccidentalMenus();

  const root = loadMoreRoot || document.querySelector('main') || document;

  for (const el of root.querySelectorAll('button, a[href="#"]')) {
    if (!isSafeLoadMoreTarget(el)) continue;

    const key = getElementLabel(el);
    if (clickedLoadMoreKeys.has(key)) continue;

    try {
      el.click();
      clickedLoadMoreKeys.add(key);
    } catch (_) { /* ignore */ }
  }

  for (const svg of root.querySelectorAll('svg[aria-label]')) {
    const label = (svg.getAttribute('aria-label') || '').trim().toLowerCase();
    if (!SVG_LOAD_LABELS.has(label)) continue;
    if (isInsideCommentRow(svg)) continue;

    const btn = svg.closest('button');
    if (!btn || clickedLoadMoreKeys.has(label)) continue;

    try {
      btn.click();
      clickedLoadMoreKeys.add(label);
    } catch (_) { /* ignore */ }
  }
}

function autoScrollStep() {
  scrollStepCount += 1;
  const countBefore = commentsMap.size;

  if (scrollStepCount === 1 || (scrollStepCount % 8 === 0 && commentsMap.size === lastCountAtClick)) {
    clickLoadMoreButtons();
    lastCountAtClick = commentsMap.size;
  }

  if (!commentUl || !commentUl.isConnected) refreshCommentTargets();

  if (scrollContainer) {
    scrollContainer.scrollTop += Math.max(450, scrollContainer.clientHeight * 0.9);
    if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 10) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  } else if (commentUl) {
    commentUl.lastElementChild?.scrollIntoView({ block: 'end', behavior: 'instant' });
  }

  const count = scrapeVisibleComments(true);
  notifyPopup();

  if (count === countBefore) {
    scrollIntervalMs = Math.min(SCROLL_INTERVAL_MAX_MS, scrollIntervalMs + 80);
  } else {
    scrollIntervalMs = SCROLL_INTERVAL_MIN_MS;
  }

  return count;
}

function scheduleNextScrollStep() {
  if (!scrapingActive) return;
  scrapingTimer = setTimeout(() => {
    autoScrollStep();
    scheduleNextScrollStep();
  }, scrollIntervalMs);
}

function startObserver() {
  stopObserver();
  if (!commentUl) return;

  observer = new MutationObserver(() => {
    scheduleObserverScrape();
  });

  observer.observe(commentUl, { childList: true, subtree: false });
}

function stopObserver() {
  if (observerFlushTimer) {
    clearTimeout(observerFlushTimer);
    observerFlushTimer = null;
  }
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

function stopScraping() {
  scrapingActive = false;
  if (scrapingTimer) {
    clearTimeout(scrapingTimer);
    scrapingTimer = null;
  }
  stopObserver();
  dismissAccidentalMenus();
  scrapeVisibleComments(true);
  return commentsMap.size;
}

function resetState() {
  commentsMap = new Map();
  commentUl = null;
  scrollContainer = null;
  loadMoreRoot = null;
  lastNotifyTime = 0;
  lastScrapeTime = 0;
  lastParsedLiCount = 0;
  scrollStepCount = 0;
  lastCountAtClick = 0;
  scrollIntervalMs = SCROLL_INTERVAL_MIN_MS;
  menuDismissStep = 0;
  clickedLoadMoreKeys = new Set();
}

function getCommentsArray() {
  return Array.from(commentsMap.values());
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PING') {
    sendResponse({ ok: true });
    return true;
  }

  if (request.type === 'WAIT_PROFILE_READY') {
    const waitFn = window.__raffleFollowVerify?.waitForProfileReady;
    if (waitFn) {
      waitFn(request.timeoutMs || 8000)
        .then((ready) => sendResponse({ ready }))
        .catch(() => sendResponse({ ready: false }));
    } else {
      sendResponse({ ready: Boolean(document.querySelector('a[href$="/following/"]')) });
    }
    return true;
  }

  if (request.type === 'START_SCRAPING') {
    stopScraping();
    resetState();
    refreshCommentTargets();
    clickLoadMoreButtons();
    scrapeVisibleComments(true);
    startObserver();

    scrapingActive = true;
    autoScrollStep();
    scheduleNextScrollStep();

    sendResponse({ status: 'started', count: commentsMap.size });
  } else if (request.type === 'STOP_SCRAPING') {
    const count = stopScraping();
    sendResponse({ status: 'stopped', count });
  } else if (request.type === 'GET_COMMENTS') {
    scrapeVisibleComments(true);
    sendResponse({ comments: getCommentsArray() });
  } else if (request.type === 'VERIFY_PARTICIPANT_FOLLOWS') {
    const verifyFn = window.__raffleFollowVerify?.verifyParticipantFollowsRequired;
    if (!verifyFn) {
      sendResponse({
        ok: false,
        error: 'follow_verify_unavailable',
        followed: [],
        missing: request.requiredFollowAccounts || [],
        meetsRequirement: false,
      });
    } else {
      verifyFn(request.requiredFollowAccounts, request.minRequiredFollows)
        .then(sendResponse)
        .catch((err) => {
          sendResponse({
            ok: false,
            error: err?.message || 'verify_failed',
            followed: [],
            missing: request.requiredFollowAccounts || [],
            meetsRequirement: false,
          });
        });
    }
  }

  return true;
});
