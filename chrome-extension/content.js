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
  /yorum.*tümün/u,
  /tümün.*yorum/u,
  /view\s+all\s+\d*\s*comments?/i,
  /see\s+all\s+\d*\s*comments?/i,
  /\d+\s+yorum/u,
  /\d+\s+comments?/i,
];

const OPEN_COMMENTS_PATTERNS = [
  /^\d+\s+yorum/u,
  /^\d+\s+comments?/i,
  /yorum(?:un)?\s+tümün/iu,
  /yorum.*(gör|oku)/iu,
  /(view|see)\s+(all\s+)?\d*\s*comments?/i,
];

const LOAD_MORE_PATTERNS = [
  /daha\s+fazla\s+yorum\s+yükle/i,
  /load\s+more\s+comments?/i,
  /daha\s+fazla\s+yükle/i,
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
const SCROLL_INTERVAL_MIN_MS = 450;
const SCROLL_INTERVAL_MAX_MS = 900;
const STALL_STEP_THRESHOLD = 6;
const AUTO_FINISH_IDLE_STEPS = 18;
const AUTO_FINISH_IDLE_STEPS_LONG = 55;
const OPEN_RETRY_STEP_INTERVAL = 8;
const MAX_IDLE_STEPS_CAP = 240;

let scrapingActive = false;
let scrapingTimer = null;
let observer = null;
let observerFlushTimer = null;
let observedCommentUl = null;
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
let unchangedStepCount = 0;
let expectedCommentTotal = 0;
let lastNetworkIngestCount = 0;

window.addEventListener('message', (event) => {
  if (event.source !== window || event.data?.type !== 'RAFFLE_IG_NETWORK') return;
  ingestCommentsFromNetworkPayload(event.data.body);
});

function parseCountToken(raw) {
  if (!raw) return 0;
  const normalized = String(raw).replace(/[^\d]/g, '');
  const value = parseInt(normalized, 10);
  return Number.isFinite(value) ? value : 0;
}

function detectCommentCountFromEmbedded() {
  let best = 0;

  for (const script of document.querySelectorAll('script:not([src])')) {
    const raw = script.textContent || '';
    if (raw.length < 40 || !/comment/i.test(raw)) continue;

    const patterns = [
      /"comment_count"\s*:\s*(\d+)/g,
      /"edge_media_to_(?:parent_)?comment"\s*:\s*\{\s*"count"\s*:\s*(\d+)/g,
      /"comments"\s*:\s*\{\s*"count"\s*:\s*(\d+)/g,
    ];

    for (const pattern of patterns) {
      for (const match of raw.matchAll(pattern)) {
        best = Math.max(best, parseCountToken(match[1]));
      }
    }
  }

  return best;
}

function detectExpectedCommentTotal() {
  let expandBest = expectedCommentTotal;
  let genericBest = 0;
  const embeddedBest = detectCommentCountFromEmbedded();
  const sources = [];

  for (const el of document.querySelectorAll('button, a, span, [role="button"], [aria-label]')) {
    const text = `${el.textContent || ''} ${el.getAttribute('aria-label') || ''}`.replace(/\s+/g, ' ').trim();
    if (text && text.length <= 120) sources.push(text);
  }

  const expandPatterns = [
    /view\s+all\s+([\d.,\s]+)\s+comments?/i,
    /see\s+all\s+([\d.,\s]+)\s+comments?/i,
    /([\d.,\s]+)\s+yorum(?:un)?\s+tümün/i,
    /tüm\s+([\d.,\s]+)\s+yorum/u,
  ];

  const genericPatterns = [
    /([\d.,\s]+)\s+yorum\b/u,
    /([\d.,\s]+)\s+comments?\b/i,
  ];

  for (const text of sources) {
    for (const pattern of expandPatterns) {
      const match = text.match(pattern);
      if (match) {
        expandBest = Math.max(expandBest, parseCountToken(match[1]));
      }
    }

    if (/tümün|view\s+all|see\s+all/i.test(text)) continue;

    for (const pattern of genericPatterns) {
      const match = text.match(pattern);
      if (!match) continue;
      const value = parseCountToken(match[1]);
      if (value > 20 || value > commentsMap.size + 8) {
        genericBest = Math.max(genericBest, value);
      }
    }
  }

  if (expandBest > 0) {
    expectedCommentTotal = expandBest;
  } else if (genericBest > 0) {
    expectedCommentTotal = Math.max(expectedCommentTotal, genericBest);
  }

  if (embeddedBest > 0) {
    expectedCommentTotal = Math.max(expectedCommentTotal, embeddedBest);
  }

  return expectedCommentTotal;
}

function getMaxIdleSteps() {
  detectExpectedCommentTotal();
  if (expectedCommentTotal > commentsMap.size + 5) {
    return Math.min(
      MAX_IDLE_STEPS_CAP,
      Math.max(AUTO_FINISH_IDLE_STEPS_LONG, Math.ceil(expectedCommentTotal / 3)),
    );
  }
  return AUTO_FINISH_IDLE_STEPS;
}

function findExpandCommentsControl() {
  const root = getScrapeRoot();

  for (const el of root.querySelectorAll('button, a, span, [role="button"], [aria-label]')) {
    const label = getElementLabel(el);
    if (matchesOpenCommentsLabel(label) || matchesLoadMoreLabel(label)) return true;

    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length <= 100 && EXPAND_ALL_PATTERNS.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  return false;
}

function hasMoreCommentsExpected() {
  detectExpectedCommentTotal();
  if (expectedCommentTotal > 0 && commentsMap.size + 3 < expectedCommentTotal) {
    return true;
  }

  if (commentsMap.size >= 10 && commentsMap.size <= 20 && unchangedStepCount < getMaxIdleSteps()) {
    const root = getScrapeRoot();
    if (countRowsInRoot(root) > commentsMap.size + 2) return true;
    if (findExpandCommentsControl()) return true;
  }

  return false;
}

function shouldAutoFinish() {
  detectExpectedCommentTotal();

  if (hasMoreCommentsExpected()) {
    return unchangedStepCount >= getMaxIdleSteps();
  }

  if (expectedCommentTotal > 0 && commentsMap.size >= expectedCommentTotal) {
    return unchangedStepCount >= 4;
  }

  return unchangedStepCount >= AUTO_FINISH_IDLE_STEPS;
}

function countRowsInRoot(root) {
  let count = 0;
  for (const container of root.querySelectorAll('ul, [role="list"]')) {
    count += container.querySelectorAll(':scope > li, :scope > [role="listitem"]').length;
  }
  return count;
}

function getScrapeRoot() {
  return document.querySelector('div[role="dialog"]')
    || document.querySelector('main')
    || document;
}

function addComment(username, text) {
  const trimmed = (text || '').trim();
  if (!username || !trimmed || isNoise(trimmed)) return false;
  commentsMap.set(`${username.toLowerCase()}:${trimmed}`, { username, text: trimmed });
  return true;
}

function ingestCommentsFromNetworkPayload(payload) {
  if (!payload) return;

  const before = commentsMap.size;
  try {
    walkForNetworkComments(JSON.parse(payload));
  } catch (_) {
    /* ignore invalid JSON */
  }

  if (commentsMap.size > before) {
    unchangedStepCount = 0;
    notifyPopup();
  }
}

function ingestCommentNode(node) {
  const username =
    node?.user?.username
    || node?.owner?.username
    || node?.commenter?.username
    || node?.from?.username;

  const text = node?.text || node?.comment_text || node?.content;
  if (addComment(username, text)) notifyPopup();
}

function walkForNetworkComments(value, depth = 0) {
  if (!value || depth > 20) return;

  if (Array.isArray(value)) {
    for (const item of value) walkForNetworkComments(item, depth + 1);
    return;
  }

  if (typeof value !== 'object') return;

  if (value.node?.user?.username && typeof value.node?.text === 'string') {
    ingestCommentNode(value.node);
  }

  if (value.node?.owner?.username && typeof value.node?.text === 'string') {
    ingestCommentNode(value.node);
  }

  if (value.user?.username && typeof value.text === 'string') {
    ingestCommentNode(value);
  }

  if (value.owner?.username && typeof value.text === 'string') {
    ingestCommentNode(value);
  }

  if (typeof value.text === 'string' && typeof value.username === 'string') {
    ingestCommentNode(value);
  }

  if (Array.isArray(value.edges)) {
    for (const edge of value.edges) {
      if (edge?.node) ingestCommentNode(edge.node);
      walkForNetworkComments(edge, depth + 1);
    }
  }

  if (Array.isArray(value.comments)) {
    for (const item of value.comments) {
      ingestCommentNode(item);
      walkForNetworkComments(item, depth + 1);
    }
  }

  for (const key of Object.keys(value)) {
    if (key === '__typename' || key === 'page_info') continue;
    walkForNetworkComments(value[key], depth + 1);
  }
}

function scrapeEmbeddedPageData() {
  for (const script of document.querySelectorAll('script:not([src])')) {
    const raw = script.textContent || '';
    if (raw.length < 80 || !/comment/i.test(raw)) continue;

    if (script.type === 'application/json' || script.type === 'application/ld+json') {
      try {
        walkForNetworkComments(JSON.parse(raw));
      } catch (_) {
        /* ignore */
      }
      continue;
    }

    const markers = ['"comments"', '"xdt_api', '"edge_media_to_comment"'];
    if (!markers.some((marker) => raw.includes(marker))) continue;

    try {
      walkForNetworkComments(JSON.parse(raw));
    } catch (_) {
      const chunks = raw.match(/\{"require":[\s\S]*?\}\]\}/g) || [];
      for (const chunk of chunks) {
        try {
          walkForNetworkComments(JSON.parse(chunk));
        } catch (_) {
          /* ignore */
        }
      }
    }
  }
}

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

function parseCommentRow(row) {
  if (!row || !(row instanceof Element)) return null;

  const userEl = row.querySelector('h2 a, h3 a, a[role="link"], a[href^="/"]');
  let username = null;

  if (userEl) {
    const fromLink = extractUsername(userEl) || userEl.textContent.trim().replace(/^@/, '');
    if (fromLink && !SKIP_USERNAMES.has(fromLink.toLowerCase())) {
      username = fromLink;
    }
  }

  if (!username) {
    for (const link of row.querySelectorAll('a[href^="/"]')) {
      const found = extractUsername(link);
      if (found) {
        username = found;
        break;
      }
    }
  }
  if (!username) return null;

  let commentText = '';
  const textCandidates = row.querySelectorAll('span[dir="auto"], [dir="auto"], h1, h2, h3, span');

  for (const node of textCandidates) {
    const text = node.textContent.trim();
    if (!text || text === username) continue;
    if (text.startsWith('@') && !text.includes(' ')) continue;
    if (isNoise(text)) continue;
    if (userEl && node.closest('a') === userEl) continue;
    if (text.length > commentText.length) commentText = text;
  }

  if (!commentText) {
    const heading = row.querySelector('h1, h2, h3');
    if (heading) {
      const text = heading.textContent.trim();
      if (text && text !== username && !isNoise(text)) commentText = text;
    }
  }

  if (!username || !commentText) return null;
  return { username, text: commentText };
}

function findCommentRowFromLink(link) {
  let node = link.parentElement;
  for (let depth = 0; depth < 10 && node; depth += 1) {
    if (node.matches?.('li, [role="listitem"]')) return node;

    const textEl = node.querySelector(':scope > span[dir="auto"], :scope > [dir="auto"], span[dir="auto"]');
    if (textEl && node.contains(link) && node !== document.body) {
      const text = textEl.textContent.trim();
      if (text && !isNoise(text) && text.length < 2200) return node;
    }

    node = node.parentElement;
  }
  return null;
}

function scrapeCommentsByHeuristic(root) {
  let added = 0;
  const scope = root.getAttribute?.('role') === 'dialog'
    ? root
    : root.querySelector('div[role="dialog"]')
      || root.querySelector('article')
      || root;

  for (const link of scope.querySelectorAll('a[href^="/"]')) {
    const username = extractUsername(link);
    if (!username) continue;

    const row = findCommentRowFromLink(link);
    if (!row || row.closest('header, nav, [role="navigation"]')) continue;

    const textEl = row.querySelector('span[dir="auto"], [dir="auto"]');
    if (!textEl) continue;

    const text = textEl.textContent.trim();
    if (addComment(username, text)) added += 1;
  }

  return added;
}

function parseCommentLi(li) {
  return parseCommentRow(li);
}

function scoreCommentContainer(container) {
  const directItems = container.querySelectorAll(':scope > li, :scope > [role="listitem"]');
  if (directItems.length < 1) return 0;

  let score = directItems.length;
  const sample = directItems[0];
  if (sample?.querySelector('a[href^="/"], h2 a, h3 a') && sample?.querySelector('span[dir="auto"], [dir="auto"], h1, h2, span')) {
    score += 20;
  }

  let parsed = 0;
  const sampleSize = Math.min(directItems.length, 5);
  for (let i = 0; i < sampleSize; i += 1) {
    if (parseCommentRow(directItems[i])) parsed += 1;
  }
  score += parsed * 15;

  return score;
}

function findCommentSection() {
  const root = getScrapeRoot();

  let bestContainer = null;
  let bestScore = 0;

  for (const container of root.querySelectorAll('ul, [role="list"]')) {
    const directItems = container.querySelectorAll(':scope > li, :scope > [role="listitem"]');
    const score = scoreCommentContainer(container) + directItems.length * 3;
    if (score > bestScore) {
      bestScore = score;
      bestContainer = container;
    }
  }

  return bestContainer;
}

function scrapeAllCommentLists(root, forceFull = false) {
  let maxItems = 0;

  for (const container of root.querySelectorAll('ul, [role="list"]')) {
    if (scoreCommentContainer(container) < 1) continue;
    maxItems = Math.max(maxItems, scrapeCommentList(container, forceFull));
  }

  for (const item of root.querySelectorAll('[role="listitem"]')) {
    const parsed = parseCommentRow(item);
    if (parsed) {
      commentsMap.set(`${parsed.username.toLowerCase()}:${parsed.text}`, parsed);
    }
  }

  scrapeCommentsByHeuristic(root);

  return maxItems;
}

function scrapeCommentList(container, forceFull = false) {
  const items = container.querySelectorAll(':scope > li, :scope > [role="listitem"]');
  const startIndex = forceFull
    ? 0
    : Math.max(0, Math.min(lastParsedLiCount, items.length) - 1);

  for (let i = startIndex; i < items.length; i += 1) {
    const parsed = parseCommentRow(items[i]);
    if (parsed) {
      commentsMap.set(`${parsed.username.toLowerCase()}:${parsed.text}`, parsed);
    }
  }

  return items.length;
}

function findScrollContainer(element) {
  let parent = element?.parentElement;
  let best = null;
  let bestScroll = 0;

  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const canScroll =
      style.overflowY === 'auto' ||
      style.overflowY === 'scroll' ||
      style.overflowY === 'overlay';

    if (canScroll && parent.scrollHeight > parent.clientHeight + 20) {
      const scrollRoom = parent.scrollHeight - parent.clientHeight;
      if (scrollRoom > bestScroll) {
        bestScroll = scrollRoom;
        best = parent;
      }
    }
    parent = parent.parentElement;
  }

  return best;
}

function refreshCommentTargets() {
  const previousUl = commentUl;
  commentUl = findCommentSection();
  scrollContainer = commentUl
    ? findScrollContainer(commentUl) || findScrollContainer(commentUl.parentElement)
    : null;
  loadMoreRoot = document.querySelector('div[role="dialog"]')
    || commentUl?.closest('article')
    || document.querySelector('main')
    || document;
  if (commentUl !== previousUl) {
    lastParsedLiCount = 0;
  }
}

function scrapeVisibleComments(forceFull = false) {
  const now = Date.now();
  if (!forceFull && now - lastScrapeTime < SCRAPE_MIN_INTERVAL_MS) {
    return commentsMap.size;
  }
  lastScrapeTime = now;

  if (!commentUl || !commentUl.isConnected) refreshCommentTargets();

  const root = getScrapeRoot();
  const inDialog = root.getAttribute?.('role') === 'dialog';
  let maxItems = 0;

  if (inDialog || scrapingActive) {
    maxItems = scrapeAllCommentLists(root, forceFull);
  } else if (commentUl && commentUl.isConnected) {
    maxItems = scrapeCommentList(commentUl, forceFull);
  } else {
    maxItems = scrapeAllCommentLists(root, true);
  }

  scrapeEmbeddedPageData();
  lastParsedLiCount = maxItems;
  return commentsMap.size;
}

function notifyPopup(force = false) {
  const now = Date.now();
  if (!force && now - lastNotifyTime < NOTIFY_MIN_INTERVAL_MS) return;
  lastNotifyTime = now;

  let phase = 'loading';
  if (!scrapingActive) {
    phase = 'ready';
  } else if (shouldAutoFinish() && commentsMap.size > 0) {
    phase = 'ready';
  } else if (commentsMap.size > 0 && unchangedStepCount >= STALL_STEP_THRESHOLD) {
    phase = 'stalled';
  } else if (commentsMap.size > 0) {
    phase = 'scraping';
  }

  chrome.runtime.sendMessage({
    type: 'SCRAPE_UPDATE',
    count: commentsMap.size,
    phase,
    unchangedSteps: unchangedStepCount,
    expectedTotal: expectedCommentTotal,
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

function findScrollContainersInRoot(root) {
  const containers = [];
  const walk = (element) => {
    if (!(element instanceof Element)) return;
    const style = window.getComputedStyle(element);
    const canScroll =
      style.overflowY === 'auto'
      || style.overflowY === 'scroll'
      || style.overflowY === 'overlay';

    if (canScroll && element.scrollHeight > element.clientHeight + 20) {
      containers.push(element);
    }
    for (const child of element.children) walk(child);
  };
  walk(root);
  return containers;
}

function scrollCommentArea() {
  const root = getScrapeRoot();
  const targets = [];

  if (scrollContainer?.isConnected) targets.push(scrollContainer);
  for (const container of findScrollContainersInRoot(root)) {
    if (!targets.includes(container)) targets.push(container);
  }

  if (targets.length === 0 && commentUl) {
    commentUl.lastElementChild?.scrollIntoView({ block: 'end', behavior: 'instant' });
    return;
  }

  for (const container of targets.slice(0, 4)) {
    container.scrollTop += Math.max(450, container.clientHeight * 0.9);
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 10) {
      container.scrollTop = container.scrollHeight;
    }
    container.dispatchEvent(new WheelEvent('wheel', {
      deltaY: 900,
      bubbles: true,
      cancelable: true,
    }));
  }
}

function clearLoadMoreClickCache(keepOpenKeys = true) {
  if (!keepOpenKeys) {
    clickedLoadMoreKeys = new Set();
    return;
  }

  const next = new Set();
  for (const key of clickedLoadMoreKeys) {
    if (key.startsWith('open:') || key.startsWith('open-text:') || key.startsWith('open-svg:')) {
      next.add(key);
    }
  }
  clickedLoadMoreKeys = next;
}

function isInsideCommentRow(el) {
  if (!commentUl) return false;
  const row = el.closest('li, [role="listitem"]');
  if (!row) return false;
  const list = row.closest('ul, [role="list"]');
  return list === commentUl;
}

function findClickableAncestor(el) {
  if (!(el instanceof Element)) return null;
  return el.closest('button, a, [role="button"], [role="link"], [tabindex="0"]')
    || (el.getAttribute('tabindex') === '0' ? el : null)
    || el;
}

function getElementClickText(el) {
  if (!(el instanceof Element)) return '';

  const ownText = Array.from(el.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (ownText) return ownText;

  const full = (el.textContent || '').replace(/\s+/g, ' ').trim();
  return full.length <= 120 ? full : '';
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

function clickByVisibleText(root, matcher, keyPrefix) {
  for (const el of root.querySelectorAll('span, div, a, button, li, p')) {
    if (!(el instanceof Element)) continue;

    const text = getElementClickText(el);
    if (!text) continue;

    const label = text.toLowerCase();
    if (!matcher(label)) continue;

    const clickable = findClickableAncestor(el) || el;
    if (clickTrackedTarget(clickable, `${keyPrefix}:${label}`)) return true;
  }

  return false;
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
  if (!label || label.length > 120) return false;
  return (
    EXPAND_ALL_PATTERNS.some((pattern) => pattern.test(label)) ||
    LOAD_MORE_PATTERNS.some((pattern) => pattern.test(label))
  );
}

function matchesOpenCommentsLabel(label) {
  if (!label || label.length > 120) return false;
  return OPEN_COMMENTS_PATTERNS.some((pattern) => pattern.test(label));
}

function isInteractiveTarget(el) {
  if (!(el instanceof Element)) return false;
  if (el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement) return true;
  const role = el.getAttribute('role');
  return role === 'button' || role === 'link';
}

function isSafeLoadMoreTarget(el) {
  if (!isInteractiveTarget(el)) return false;
  if (isInsideCommentRow(el)) return false;
  if (hasBlockedAria(el)) return false;
  if (el.closest('[role="menu"], [role="menuitem"]')) return false;

  const label = getElementLabel(el);
  return matchesLoadMoreLabel(label);
}

function isSafeOpenCommentsTarget(el) {
  if (!isInteractiveTarget(el)) return false;
  if (isInsideCommentRow(el)) return false;
  if (hasBlockedAria(el)) return false;
  if (el.closest('[role="menu"], [role="menuitem"]')) return false;

  const label = getElementLabel(el);
  return matchesOpenCommentsLabel(label) || matchesLoadMoreLabel(label);
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

function clickTrackedTarget(el, key) {
  if (!key || clickedLoadMoreKeys.has(key)) return false;
  if (!dispatchClick(el)) return false;
  clickedLoadMoreKeys.add(key);
  return true;
}

function clickExpandCommentsLinks(force = false) {
  const root = document.querySelector('main') || document;
  const matcher = (label) => (
    EXPAND_ALL_PATTERNS.some((pattern) => pattern.test(label))
    || matchesOpenCommentsLabel(label)
    || matchesLoadMoreLabel(label)
  );

  if (force) {
    for (const key of [...clickedLoadMoreKeys]) {
      if (key.startsWith('open') || key.startsWith('expand')) {
        clickedLoadMoreKeys.delete(key);
      }
    }
  }

  if (clickByVisibleText(root, matcher, 'expand-text')) return true;

  for (const el of root.querySelectorAll('span, div, a, button, [role="button"], [tabindex="0"]')) {
    const text = getElementClickText(el).toLowerCase();
    if (!text || !matcher(text)) continue;
    if (hasBlockedAria(el)) continue;

    const clickable = findClickableAncestor(el) || el;
    if (clickTrackedTarget(clickable, `expand:${text}`)) return true;
  }

  return false;
}

function clickOpenCommentsPanel() {
  if (clickExpandCommentsLinks(false)) return true;

  const root = loadMoreRoot || getScrapeRoot();

  if (clickByVisibleText(root, (label) => (
    matchesOpenCommentsLabel(label) || matchesLoadMoreLabel(label)
  ), 'open-text')) {
    return true;
  }

  for (const el of root.querySelectorAll('button, a, [role="button"], [role="link"]')) {
    if (!isSafeOpenCommentsTarget(el)) continue;
    if (clickTrackedTarget(el, `open:${getElementLabel(el)}`)) return true;
  }

  for (const svg of root.querySelectorAll('svg[aria-label]')) {
    const label = (svg.getAttribute('aria-label') || '').trim().toLowerCase();
    if (!/comment|yorum/i.test(label) || /(add|ekle|write|yaz)/i.test(label)) continue;
    const btn = svg.closest('button, [role="button"], a');
    if (btn && clickTrackedTarget(btn, `open-svg:${label}`)) return true;
  }

  return false;
}

function clickLoadMoreButtons(forceRetry = false) {
  dismissAccidentalMenus();

  if (forceRetry) {
    clearLoadMoreClickCache(false);
  }

  const root = loadMoreRoot || getScrapeRoot();

  for (const el of root.querySelectorAll('button, a, [role="button"], [role="link"]')) {
    if (!isSafeLoadMoreTarget(el)) continue;
    clickTrackedTarget(el, getElementLabel(el));
  }

  for (const svg of root.querySelectorAll('svg[aria-label]')) {
    const label = (svg.getAttribute('aria-label') || '').trim().toLowerCase();
    const isLoadMore = SVG_LOAD_LABELS.has(label)
      || /load\s+more/i.test(label)
      || /daha\s+fazla/i.test(label);
    if (!isLoadMore) continue;
    if (isInsideCommentRow(svg)) continue;

    const btn = svg.closest('button, [role="button"]');
    if (!btn || clickedLoadMoreKeys.has(label)) continue;
    clickTrackedTarget(btn, label);
  }

  if (commentUl) {
    for (const btn of commentUl.querySelectorAll('button, [role="button"]')) {
      if (isInsideCommentRow(btn)) continue;
      const label = getElementLabel(btn);
      if (!label || hasBlockedAria(btn)) continue;
      if (!matchesLoadMoreLabel(label) && !btn.querySelector('svg')) continue;
      btn.scrollIntoView({ block: 'center', behavior: 'instant' });
      clickTrackedTarget(btn, `list:${label}`);
    }
  }
}

function finishScrapingAsReady() {
  const count = stopScraping();
  notifyPopup(true);
  return count;
}

function autoScrollStep() {
  scrollStepCount += 1;
  const countBefore = commentsMap.size;
  const stalled = unchangedStepCount >= 2;
  const needMore = hasMoreCommentsExpected();

  if (
    scrollStepCount === 1
    || scrollStepCount % OPEN_RETRY_STEP_INTERVAL === 0
    || (stalled && needMore)
  ) {
    clickExpandCommentsLinks(stalled && needMore);
    clickOpenCommentsPanel();
    refreshCommentTargets();
  }

  if (
    scrollStepCount === 1
    || stalled
    || (scrollStepCount % 6 === 0 && commentsMap.size === lastCountAtClick)
  ) {
    clickLoadMoreButtons(stalled && needMore);
    lastCountAtClick = commentsMap.size;
  }

  if (!commentUl || !commentUl.isConnected) refreshCommentTargets();
  ensureObserver();
  scrollCommentArea();

  const networkBefore = commentsMap.size;
  scrapeEmbeddedPageData();
  const count = scrapeVisibleComments(true);

  if (count === countBefore && count === networkBefore) {
    unchangedStepCount += 1;
    scrollIntervalMs = Math.min(SCROLL_INTERVAL_MAX_MS, scrollIntervalMs + 80);
  } else {
    unchangedStepCount = 0;
    scrollIntervalMs = SCROLL_INTERVAL_MIN_MS;
  }

  notifyPopup();

  if (shouldAutoFinish()) {
    finishScrapingAsReady();
    return count;
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

  const observeTarget = commentUl.closest('div[role="dialog"]') || commentUl;
  observer = new MutationObserver(() => {
    scheduleObserverScrape();
  });

  observer.observe(observeTarget, {
    childList: true,
    subtree: observeTarget !== commentUl,
  });
  observedCommentUl = commentUl;
}

function ensureObserver() {
  if (!commentUl || !commentUl.isConnected) refreshCommentTargets();
  if (!commentUl) {
    stopObserver();
    observedCommentUl = null;
    return;
  }
  if (observer && observedCommentUl === commentUl) return;
  startObserver();
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
  observedCommentUl = null;
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
  unchangedStepCount = 0;
  expectedCommentTotal = 0;
  lastNetworkIngestCount = 0;
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
    detectExpectedCommentTotal();
    refreshCommentTargets();
    clickExpandCommentsLinks(true);
    clickOpenCommentsPanel();
    clickLoadMoreButtons(true);
    scrapeVisibleComments(true);
    detectExpectedCommentTotal();
    notifyPopup(true);
    ensureObserver();

    scrapingActive = true;
    autoScrollStep();
    scheduleNextScrollStep();

    sendResponse({ status: 'started', count: commentsMap.size });
  } else if (request.type === 'STOP_SCRAPING') {
    const count = stopScraping();
    sendResponse({ status: 'stopped', count });
  } else if (request.type === 'GET_COMMENTS') {
    scrapeVisibleComments(true);
    scrapeEmbeddedPageData();
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
