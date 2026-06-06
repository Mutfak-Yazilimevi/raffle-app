// Instagram Çekiliş Yardımcısı - Content Script

const SKIP_USERNAMES = new Set([
  'explore', 'accounts', 'direct', 'reels', 'stories', 'p', 'reel', 'tags', 'locations', 'about', 'legal'
]);

const NOISE_PATTERNS = [
  /^\d+[gsqd]$/i,
  /^\d+\s*(gün|saat|dakika|hafta|g|s|d|h|yıl)/i,
  /^(Yanıtla|Reply|Beğen|Like|Paylaş|Share|Gönder|Send)$/i,
  /^(Diğer yanıtları gör|View replies|Hide replies|Yanıtları gizle)/i,
  /^Beğenildi/i,
  /^Verified$/i,
];

// Yalnızca yorum listesini genişleten metinler — geniş eşleşme YOK
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

let scrapingInterval = null;
let observer = null;
let commentsMap = new Map();
let commentUl = null;
let scrollContainer = null;
let lastNotifyTime = 0;
let lastScrapeTime = 0;
let scrollStepCount = 0;
let lastCountAtClick = 0;
let clickedLoadMoreKeys = new Set();

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
}

function scrapeVisibleComments() {
  const now = Date.now();
  if (now - lastScrapeTime < 150) {
    return commentsMap.size;
  }
  lastScrapeTime = now;

  if (!commentUl) refreshCommentTargets();
  if (!commentUl) return commentsMap.size;

  for (const li of commentUl.querySelectorAll(':scope > li')) {
    const parsed = parseCommentLi(li);
    if (parsed) {
      commentsMap.set(`${parsed.username.toLowerCase()}:${parsed.text}`, parsed);
    }
  }

  return commentsMap.size;
}

function notifyPopup(force = false) {
  const now = Date.now();
  if (!force && now - lastNotifyTime < 350) return;
  lastNotifyTime = now;

  chrome.runtime.sendMessage({
    type: 'SCRAPE_UPDATE',
    count: commentsMap.size,
  }).catch(() => {});
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
  const panels = document.querySelectorAll('[role="dialog"], [role="menu"]');
  for (const panel of panels) {
    const text = (panel.textContent || '').toLowerCase();
    const isActionMenu =
      (text.includes('şikayet') || text.includes('report')) &&
      (text.includes('iptal') || text.includes('cancel'));

    if (!isActionMenu) continue;

    const cancelBtn = panel.querySelector('button, [role="button"]');
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

  const root = document.querySelector('div[role="dialog"]') || document.querySelector('main') || document;

  for (const el of root.querySelectorAll('button, a')) {
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

  // Tıklama yalnızca başlangıçta ve ilerleme durduğunda — her döngüde değil
  if (scrollStepCount === 1 || (scrollStepCount % 10 === 0 && commentsMap.size === lastCountAtClick)) {
    clickLoadMoreButtons();
    lastCountAtClick = commentsMap.size;
  }

  if (!commentUl) refreshCommentTargets();

  if (scrollContainer) {
    scrollContainer.scrollTop += Math.max(400, scrollContainer.clientHeight * 0.85);
    if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 10) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  } else if (commentUl) {
    commentUl.lastElementChild?.scrollIntoView({ block: 'end', behavior: 'instant' });
  }

  const count = scrapeVisibleComments();
  notifyPopup();
  return count;
}

function startObserver() {
  stopObserver();
  if (!commentUl) return;

  observer = new MutationObserver(() => {
    scrapeVisibleComments();
    notifyPopup();
  });

  observer.observe(commentUl, { childList: true, subtree: true });
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

function resetState() {
  commentsMap = new Map();
  commentUl = null;
  scrollContainer = null;
  lastNotifyTime = 0;
  lastScrapeTime = 0;
  scrollStepCount = 0;
  lastCountAtClick = 0;
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

  if (request.type === 'START_SCRAPING') {
    if (scrapingInterval) clearInterval(scrapingInterval);

    resetState();
    refreshCommentTargets();
    clickLoadMoreButtons();
    scrapeVisibleComments();
    startObserver();

    autoScrollStep();
    scrapingInterval = setInterval(autoScrollStep, 800);

    sendResponse({ status: 'started', count: commentsMap.size });
  } else if (request.type === 'STOP_SCRAPING') {
    if (scrapingInterval) {
      clearInterval(scrapingInterval);
      scrapingInterval = null;
    }
    stopObserver();
    dismissAccidentalMenus();
    scrapeVisibleComments();
    sendResponse({ status: 'stopped', count: commentsMap.size });
  } else if (request.type === 'GET_COMMENTS') {
    scrapeVisibleComments();
    sendResponse({ comments: getCommentsArray() });
  }

  return true;
});
