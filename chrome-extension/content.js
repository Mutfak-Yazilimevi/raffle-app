// Instagram Çekiliş Yardımcısı - Content Script
//
// DOM Selector Dayanıklılık Notu (Son doğrulama: 2026-06)
// Bu script Instagram'ın semantic HTML yapısına dayanır; obfuscated class adlarına değil.
// Kullanılan temel selector'lar:
//   - article                  → post konteyneri
//   - div[role="dialog"]       → expanded post / lightbox
//   - span[dir="auto"]         → yorum metni ve kullanıcı adı
//   - [aria-label]             → buton etiketleri (beğen, yanıtla, daha fazla yorum)
//   - a[href^="/"]             → kullanıcı profil linkleri
//   - ul, [role="list"]        → yorum listesi
//
// Instagram DOM değişiklik belirtileri:
//   - Yorumlar boş çıkıyorsa: span[dir="auto"] seçicisi değişmiş olabilir
//   - "Daha fazla yorum" butonu bulunamıyorsa: aria-label pattern'ları değişmiş olabilir
//   - Popup açılmıyorsa: article veya dialog role'ü farklılaşmış olabilir
//   - Kullanıcı adı boş geliyorsa: profil link yapısı (a[href^="/"]) değişmiş olabilir

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

const REPLY_BRANCH_KEYS = new Set([
  'child_comments',
  'edge_threaded_comments',
  'threaded_comments',
  'preview_child_comments',
  'preview_comments',
  'replies',
  'child_comment_count',
  'comment_replies',
]);

let scrapingActive = false;
let scrapingTimer = null;
let observer = null;
let observerFlushTimer = null;
let observedCommentUl = null;
let commentsList = [];
let seenCommentIds = new Set();
let seenDomKeys = new Set();
let repliesList = [];
let seenReplyIds = new Set();

// Post sahibini URL'den tespit et: instagram.com/username/reel/... veya /p/...
function getPostOwnerUsername() {
  const match = window.location.pathname.match(/^\/([^/]+)\/(?:reel|p|tv)\//i);
  return match ? match[1].toLowerCase() : null;
}
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
let pinnedExpectedTotal = 0;
let lastNetworkIngestCount = 0;
let commentPaginationState = {
  endCursor: null,
  hasNextPage: false,
  fetchedCursors: new Set(),
  pendingFetch: false,
  lastFetchAt: 0,
};

window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data?.type === 'RAFFLE_IG_NETWORK') {
    ingestCommentsFromNetworkPayload(event.data.body);
    updateCommentPaginationFromPayload(event.data.body);
    return;
  }

  if (event.data?.type === 'RAFFLE_FETCH_COMMENT_PAGE_DONE') {
    commentPaginationState.pendingFetch = false;
  }
});

function parseCountToken(raw) {
  if (!raw) return 0;
  const normalized = String(raw).replace(/[^\d]/g, '');
  const value = parseInt(normalized, 10);
  return Number.isFinite(value) ? value : 0;
}

function parseCountFromMetricsSpan(el) {
  if (!el) return 0;

  const text = `${el.textContent || ''} ${el.getAttribute('aria-label') || ''}`.replace(/\s+/g, ' ').trim();
  if (!text) return 0;

  const labeledMatch = text.match(/([\d.,\s]+)\s*(?:yorum|comments?)/iu);
  if (labeledMatch) return parseCountToken(labeledMatch[1]);

  if (/^[\d.,\s]+$/.test(text)) return parseCountToken(text);

  const looseMatch = text.match(/([\d.,\s]+)/);
  return looseMatch ? parseCountToken(looseMatch[1]) : 0;
}

/** main > … > section > section > div > span:nth-child(4) — sınıflar değişken, kırılım sabit. */
function collectPostMetricsCommentCandidates() {
  const main = document.querySelector('main');
  if (!main) return [];

  const candidates = [];

  for (const outerSection of main.querySelectorAll('section')) {
    if (outerSection.closest('[role="dialog"]')) continue;

    const innerSections = outerSection.querySelectorAll(':scope section');
    const metricSections = innerSections.length > 0 ? innerSections : [outerSection];

    for (const metricSection of metricSections) {
      for (const metricsDiv of metricSection.querySelectorAll(':scope > div')) {
        const spans = metricsDiv.querySelectorAll(':scope > span');
        if (spans.length < 4) continue;

        const commentSpan = spans[3];
        const count = parseCountFromMetricsSpan(commentSpan);
        if (count <= 0) continue;

        let score = 20;
        if (spans.length === 4) score += 25;
        if (innerSections.length > 0) score += 15;
        if (commentSpan.closest('a, button, [role="button"], [role="link"]')) score += 10;
        if (/yorum|comment/i.test(`${commentSpan.textContent || ''} ${commentSpan.getAttribute('aria-label') || ''}`)) {
          score += 20;
        }

        candidates.push({ commentSpan, count, score });
      }
    }
  }

  return candidates;
}

function findPostMetricsCommentSpan() {
  const candidates = collectPostMetricsCommentCandidates();
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score || b.count - a.count);
  return candidates[0].commentSpan;
}

function detectCommentCountFromPostMetrics() {
  const candidates = collectPostMetricsCommentCandidates();
  if (candidates.length === 0) return 0;

  candidates.sort((a, b) => b.score - a.score || b.count - a.count);
  return candidates[0].count;
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

function pinExpectedCommentTotal(value) {
  if (!Number.isFinite(value) || value <= 0) return;
  pinnedExpectedTotal = Math.max(pinnedExpectedTotal, value);
  expectedCommentTotal = pinnedExpectedTotal;
}

function getTargetCommentTotal() {
  return Math.max(pinnedExpectedTotal, expectedCommentTotal, detectCommentCountFromPostMetrics());
}

function detectExpectedCommentTotal() {
  let expandBest = pinnedExpectedTotal || expectedCommentTotal;
  let genericBest = 0;
  const metricsBest = detectCommentCountFromPostMetrics();
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
      if (value > 20 || value > commentsList.length + 8) {
        genericBest = Math.max(genericBest, value);
      }
    }
  }

  if (metricsBest > 0) pinExpectedCommentTotal(metricsBest);
  if (expandBest > 0) pinExpectedCommentTotal(expandBest);
  if (embeddedBest > 0) pinExpectedCommentTotal(embeddedBest);
  if (genericBest > 0) pinExpectedCommentTotal(genericBest);

  if (pinnedExpectedTotal > 0) {
    expectedCommentTotal = pinnedExpectedTotal;
    return expectedCommentTotal;
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
  const target = getTargetCommentTotal();
  if (target > getFinalizedCommentCount() + 5) {
    return Math.min(
      MAX_IDLE_STEPS_CAP,
      Math.max(AUTO_FINISH_IDLE_STEPS_LONG, Math.ceil(target / 3)),
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
  const target = getTargetCommentTotal();
  const collected = getFinalizedCommentCount();

  if (target > 0 && collected + 3 < target) {
    return true;
  }

  if (collected >= 10 && collected <= 20 && unchangedStepCount < getMaxIdleSteps()) {
    const root = getScrapeRoot();
    if (countRowsInRoot(root) > collected + 2) return true;
    if (findExpandCommentsControl()) return true;
    if (target > collected + 3) return true;
  }

  return false;
}

function shouldAutoFinish() {
  detectExpectedCommentTotal();
  const target = getTargetCommentTotal();
  const collected = getFinalizedCommentCount();

  if (hasMoreCommentsExpected()) {
    return unchangedStepCount >= getMaxIdleSteps();
  }

  if (target > 0 && collected >= target) {
    return unchangedStepCount >= 4;
  }

  return unchangedStepCount >= AUTO_FINISH_IDLE_STEPS;
}

function countRowsInRoot(root) {
  if (commentUl && commentUl.isConnected) {
    return commentUl.querySelectorAll(':scope > li, :scope > [role="listitem"]').length;
  }

  let count = 0;
  for (const container of root.querySelectorAll('ul, [role="list"]')) {
    if (scoreCommentContainer(container) < 1) continue;
    count += container.querySelectorAll(':scope > li, :scope > [role="listitem"]').length;
  }
  return count;
}

function getCommentsPanelRoot() {
  return document.querySelector('div[role="dialog"]')
    || document.querySelector('[aria-modal="true"]')
    || document.querySelector('main')
    || document;
}

function getScrapeRoot() {
  return getCommentsPanelRoot();
}

function getFinalizedCommentCount() {
  return finalizeCommentsList().length;
}

function getStoredCommentCount() {
  return getFinalizedCommentCount();
}

function addReply(username, text, { commentId = null, parentCommentId = null } = {}) {
  const trimmed = (text || '').trim();
  if (!username || !trimmed || isNoise(trimmed)) return false;
  if (username.toLowerCase() === getPostOwnerUsername()) return false;
  const id = commentId ? String(commentId) : null;
  if (id) {
    if (seenReplyIds.has(id)) return false;
    seenReplyIds.add(id);
  }
  repliesList.push({ username: username.toLowerCase(), text: trimmed, id: id || undefined, parentCommentId: parentCommentId ? String(parentCommentId) : null });
  return true;
}

function addComment(username, text, options = {}) {
  if (options.isReply) return false;

  const trimmed = (text || '').trim();
  if (!username || !trimmed || isNoise(trimmed)) return false;
  if (username.toLowerCase() === getPostOwnerUsername()) return false;

  const commentId = options.commentId ? String(options.commentId) : null;
  if (commentId) {
    if (seenCommentIds.has(commentId)) return false;
    seenCommentIds.add(commentId);
  } else if (options.domKey) {
    if (seenDomKeys.has(options.domKey)) return false;
    seenDomKeys.add(options.domKey);
  } else {
    return false;
  }

  commentsList.push({
    username,
    text: trimmed,
    id: commentId || undefined,
    isReply: false,
  });
  return true;
}

function finalizeCommentsList(rawList = commentsList) {
  const byId = new Map();
  const withoutId = [];

  for (const comment of rawList) {
    if (comment.id) {
      const id = String(comment.id);
      if (!byId.has(id)) byId.set(id, comment);
    } else {
      withoutId.push(comment);
    }
  }

  const coveredById = new Set(
    [...byId.values()].map((comment) => `${comment.username.toLowerCase()}\0${comment.text}`),
  );

  const finalized = [...byId.values()];
  for (const comment of withoutId) {
    const contentKey = `${comment.username.toLowerCase()}\0${comment.text}`;
    if (coveredById.has(contentKey)) continue;
    finalized.push(comment);
  }

  return finalized;
}

function ingestCommentsFromNetworkPayload(payload) {
  if (!payload) return;

  const before = getStoredCommentCount();
  try {
    walkForNetworkComments(JSON.parse(payload));
  } catch (_) {
    /* ignore invalid JSON */
  }

  if (getStoredCommentCount() > before) {
    unchangedStepCount = 0;
    notifyPopup();
  }
}

function updateCommentPaginationFromPayload(payload) {
  if (!payload) return;

  try {
    const info = extractCommentPaginationInfo(JSON.parse(payload));
    if (info.endCursor) {
      commentPaginationState.endCursor = info.endCursor;
      commentPaginationState.hasNextPage = info.hasNextPage;
    }
  } catch (_) {
    /* ignore invalid JSON */
  }
}

function extractCommentPaginationInfo(value, depth = 0, result = { endCursor: null, hasNextPage: false }) {
  if (!value || depth > 24) return result;

  if (Array.isArray(value)) {
    for (const item of value) extractCommentPaginationInfo(item, depth + 1, result);
    return result;
  }

  if (typeof value !== 'object') return result;

  if (value.page_info && typeof value.page_info === 'object') {
    const pageInfo = value.page_info;
    if (pageInfo.end_cursor) {
      result.endCursor = pageInfo.end_cursor;
      result.hasNextPage = pageInfo.has_next_page !== false;
    }
  }

  for (const key of Object.keys(value)) {
    if (REPLY_BRANCH_KEYS.has(key)) continue;
    extractCommentPaginationInfo(value[key], depth + 1, result);
  }

  return result;
}

function requestNextCommentPageIfNeeded(force = false) {
  const target = getTargetCommentTotal();
  const collected = getFinalizedCommentCount();

  if (target > 0 && collected + 2 >= target) return false;
  if (!commentPaginationState.hasNextPage || !commentPaginationState.endCursor) return false;
  if (commentPaginationState.pendingFetch) return false;

  const cursor = commentPaginationState.endCursor;
  if (!force && commentPaginationState.fetchedCursors.has(cursor)) return false;
  if (Date.now() - commentPaginationState.lastFetchAt < 350) return false;

  commentPaginationState.pendingFetch = true;
  commentPaginationState.lastFetchAt = Date.now();
  commentPaginationState.fetchedCursors.add(cursor);

  window.postMessage({ type: 'RAFFLE_FETCH_COMMENT_PAGE', cursor }, '*');
  return true;
}

function isReplyCommentNode(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.parent_comment_id || node.parent_id || node.replied_to_comment_id) return true;
  if (node.is_reply === true || node.is_child === true) return true;
  const typeName = String(node.__typename || '');
  return /child|reply|subcomment/i.test(typeName) && /comment/i.test(typeName);
}

function ingestCommentNode(node, isFromReplyBranch = false) {
  const username =
    node?.user?.username
    || node?.owner?.username
    || node?.commenter?.username
    || node?.from?.username;
  const text = node?.text || node?.comment_text || node?.content;
  const commentId = node?.pk || node?.id;

  if (isReplyCommentNode(node) || isFromReplyBranch) {
    const parentCommentId =
      node?.parent_comment_id
      || node?.parent_id
      || node?.replied_to_comment_id
      || null;
    addReply(username, text, { commentId, parentCommentId });
    return;
  }

  if (addComment(username, text, { commentId, isReply: false })) notifyPopup();
}

function walkForNetworkComments(value, depth = 0, parentKey = '', inReplyBranch = false) {
  if (!value || depth > 25) return;

  if (REPLY_BRANCH_KEYS.has(parentKey)) {
    inReplyBranch = true;
  }

  if (Array.isArray(value)) {
    for (const item of value) walkForNetworkComments(item, depth + 1, parentKey, inReplyBranch);
    return;
  }

  if (typeof value !== 'object') return;

  if (value.node) ingestCommentNode(value.node, inReplyBranch);

  if (Array.isArray(value.edges)) {
    for (const edge of value.edges) {
      if (edge?.node) ingestCommentNode(edge.node, inReplyBranch);
    }
  }

  if (Array.isArray(value.items)) {
    for (const item of value.items) ingestCommentNode(item, inReplyBranch);
  }

  for (const key of Object.keys(value)) {
    if (key === '__typename' || key === 'page_info') continue;
    walkForNetworkComments(
      value[key],
      depth + 1,
      key,
      inReplyBranch || REPLY_BRANCH_KEYS.has(key),
    );
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

function extractCommentIdFromRow(row) {
  for (const link of row.querySelectorAll('a[href*="/c/"]')) {
    const match = (link.getAttribute('href') || '').match(/\/c\/([^/?#]+)/);
    if (match) return match[1];
  }
  return null;
}

function isReplyCommentRow(row) {
  const item = row.matches?.('li, [role="listitem"]') ? row : row.closest('li, [role="listitem"]');
  if (!item) return false;

  if (commentUl && commentUl.isConnected) {
    const directItems = commentUl.querySelectorAll(':scope > li, :scope > [role="listitem"]');
    if (!Array.from(directItems).includes(item)) return true;
  }

  const listParent = item.parentElement;
  if (listParent) {
    const ownerRow = listParent.closest('li, [role="listitem"]');
    if (ownerRow && ownerRow !== item) return true;
  }

  return false;
}

function parseCommentRow(row) {
  if (!row || !(row instanceof Element)) return null;
  if (isReplyCommentRow(row)) return null;

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
  return {
    username,
    text: commentText,
    commentId: extractCommentIdFromRow(row),
  };
}

function findCommentRowFromLink(link) {
  let node = link.parentElement;
  for (let depth = 0; depth < 10 && node; depth += 1) {
    if (node.matches?.('li, [role="listitem"]')) {
      return isReplyCommentRow(node) ? null : node;
    }

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
    if (!text) continue;

    if (isReplyCommentRow(row)) {
      const item = row.matches('li, [role="listitem"]') ? row : row.closest('li, [role="listitem"]');
      const parentItem = item?.parentElement?.closest('li, [role="listitem"]');
      const parentCommentId = parentItem ? extractCommentIdFromRow(parentItem) : null;
      addReply(username, text, { commentId: extractCommentIdFromRow(row), parentCommentId });
      continue;
    }

    const commentId = extractCommentIdFromRow(row);
    addComment(username, text, {
      commentId,
      domKey: commentId ? null : `heur:${username.toLowerCase()}:${link.getAttribute('href') || text.length}:${text.slice(0, 48)}`,
    });
  }
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

function findCommentSection(root = getCommentsPanelRoot()) {
  let bestContainer = null;
  let bestScore = 0;

  for (const container of root.querySelectorAll('ul, [role="list"]')) {
    const directItems = container.querySelectorAll(':scope > li, :scope > [role="listitem"]');
    const score = scoreCommentContainer(container) + directItems.length * 12;
    if (score > bestScore) {
      bestScore = score;
      bestContainer = container;
    }
  }

  return bestContainer;
}

function findBestScrollContainer(root) {
  if (!(root instanceof Element)) return null;

  let best = null;
  let bestRoom = 0;

  for (const el of root.querySelectorAll('div, section, ul, main, article')) {
    const style = window.getComputedStyle(el);
    if (!['auto', 'scroll', 'overlay'].includes(style.overflowY)) continue;
    const room = el.scrollHeight - el.clientHeight;
    if (room > 80 && room > bestRoom) {
      bestRoom = room;
      best = el;
    }
  }

  return best;
}

function refreshCommentTargets() {
  const previousUl = commentUl;
  const panelRoot = getCommentsPanelRoot();
  const dialog = document.querySelector('div[role="dialog"], [aria-modal="true"]');
  const nextUl = dialog ? findCommentSection(dialog) : findCommentSection(panelRoot);

  if (nextUl) {
    commentUl = nextUl;
  } else if (!commentUl?.isConnected) {
    commentUl = findCommentSection(panelRoot);
  }

  const scrollRoot = dialog || panelRoot;
  scrollContainer = commentUl
    ? findScrollContainer(commentUl) || findScrollContainer(commentUl.parentElement)
    : null;
  scrollContainer = findBestScrollContainer(scrollRoot) || scrollContainer;

  loadMoreRoot = dialog
    || commentUl?.closest('article')
    || document.querySelector('main')
    || document;
  if (commentUl !== previousUl) {
    lastParsedLiCount = 0;
  }
}

function scrapeAllCommentLists(root, forceFull = false) {
  refreshCommentTargets();

  if (commentUl && commentUl.isConnected) {
    return scrapeCommentList(commentUl, forceFull, 0);
  }

  let maxItems = 0;
  let listIndex = 0;
  let bestContainer = null;
  let bestScore = 0;

  for (const container of root.querySelectorAll('ul, [role="list"]')) {
    const score = scoreCommentContainer(container);
    if (score < 1) continue;
    if (score > bestScore) {
      bestScore = score;
      bestContainer = container;
    }
  }

  if (bestContainer) {
    maxItems = scrapeCommentList(bestContainer, forceFull, listIndex);
  } else {
    scrapeCommentsByHeuristic(root);
  }

  return maxItems;
}

function scrapeCommentList(container, forceFull = false, listSlot = 0) {
  const items = container.querySelectorAll(':scope > li, :scope > [role="listitem"]');
  const startIndex = forceFull
    ? 0
    : Math.max(0, Math.min(lastParsedLiCount, items.length) - 1);

  for (let i = startIndex; i < items.length; i += 1) {
    const parsed = parseCommentRow(items[i]);
    if (!parsed) continue;
    addComment(parsed.username, parsed.text, {
      commentId: parsed.commentId,
      domKey: parsed.commentId ? null : `dom:${listSlot}:${i}:${parsed.username.toLowerCase()}`,
    });
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

function scrapeVisibleComments(forceFull = false) {
  const now = Date.now();
  if (!forceFull && now - lastScrapeTime < SCRAPE_MIN_INTERVAL_MS) {
    return getFinalizedCommentCount();
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

  const dialog = document.querySelector('div[role="dialog"], [aria-modal="true"]');
  const main = document.querySelector('main');
  scrapeCommentsByHeuristic(root);
  if (dialog && dialog !== root) scrapeCommentsByHeuristic(dialog);
  if (main && main !== root && main !== dialog) scrapeCommentsByHeuristic(main);

  lastParsedLiCount = maxItems;
  return getFinalizedCommentCount();
}

function notifyPopup(force = false) {
  const now = Date.now();
  if (!force && now - lastNotifyTime < NOTIFY_MIN_INTERVAL_MS) return;
  lastNotifyTime = now;

  let phase = 'loading';
  if (!scrapingActive) {
    phase = 'ready';
  } else if (shouldAutoFinish() && getFinalizedCommentCount() > 0) {
    phase = 'ready';
  } else if (getFinalizedCommentCount() > 0 && unchangedStepCount >= STALL_STEP_THRESHOLD) {
    phase = getTargetCommentTotal() > getFinalizedCommentCount() + 3 ? 'recovering' : 'stalled';
  } else if (getFinalizedCommentCount() > 0) {
    phase = 'scraping';
  }

  chrome.runtime.sendMessage({
    type: 'SCRAPE_UPDATE',
    count: getFinalizedCommentCount(),
    phase,
    unchangedSteps: unchangedStepCount,
    expectedTotal: getTargetCommentTotal(),
    metricsTotal: detectCommentCountFromPostMetrics(),
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
  const root = getCommentsPanelRoot();
  const targets = [];

  if (scrollContainer?.isConnected) targets.push(scrollContainer);
  const best = findBestScrollContainer(root);
  if (best && !targets.includes(best)) targets.push(best);
  for (const container of findScrollContainersInRoot(root)) {
    if (!targets.includes(container)) targets.push(container);
  }

  if (commentUl?.lastElementChild) {
    commentUl.lastElementChild.scrollIntoView({ block: 'end', behavior: 'instant' });
  }

  if (targets.length === 0) return;

  for (const container of targets.slice(0, 5)) {
    container.scrollTop += Math.max(500, container.clientHeight * 0.95);
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 8) {
      container.scrollTop = container.scrollHeight;
    }
    container.dispatchEvent(new WheelEvent('wheel', {
      deltaY: 1200,
      bubbles: true,
      cancelable: true,
    }));
    container.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'End',
      code: 'End',
      bubbles: true,
    }));
  }
}

function clearOpenCommentsClickCache() {
  for (const key of [...clickedLoadMoreKeys]) {
    if (
      key.startsWith('open')
      || key.startsWith('expand')
      || key.startsWith('metrics-comment')
      || key.startsWith('preview-expand')
      || key.startsWith('view-all-count')
      || key.startsWith('post-comment-btn')
    ) {
      clickedLoadMoreKeys.delete(key);
    }
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

function getCompactElementText(el) {
  if (!(el instanceof Element)) return '';
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function getElementContextText(el, depth = 2) {
  if (!(el instanceof Element)) return '';
  let node = el;
  for (let i = 0; i <= depth && node; i += 1) {
    const text = getCompactElementText(node);
    if (text && text.length <= 180) return text;
    node = node.parentElement;
  }
  return getCompactElementText(el);
}

function clickViewAllNearPreviewList() {
  const article = document.querySelector('article') || document.querySelector('main');
  if (!article) return false;

  for (const list of article.querySelectorAll('ul, [role="list"]')) {
    const items = list.querySelectorAll(':scope > li, :scope > [role="listitem"]');
    if (items.length < 3 || items.length > 25) continue;

    let node = list;
    for (let depth = 0; depth < 5 && node; depth += 1) {
      for (const el of node.querySelectorAll('button, a, span, div, [role="button"], [role="link"], [tabindex="0"]')) {
        const text = getElementContextText(el, 1);
        if (!text || text.length > 180) continue;
        if (!/yorum|comment/i.test(text)) continue;
        if (!/tüm|all|view|see|gör|more/i.test(text)) continue;

        const clickable = findClickableAncestor(el) || el;
        if (clickTrackedTarget(clickable, `preview-expand:${text.slice(0, 48)}`)) return true;
      }
      node = node.parentElement;
    }
  }

  return false;
}

function clickPostCommentButton() {
  const main = document.querySelector('main');
  if (!main) return false;

  for (const svg of main.querySelectorAll('svg[aria-label]')) {
    const label = (svg.getAttribute('aria-label') || '').trim().toLowerCase();
    if (!/(^comment$|^comments$|^yorum$|^yorumlar$|comment on|yorum yap)/i.test(label)) continue;
    if (/(add|write|ekle|yaz)/i.test(label)) continue;

    const btn = svg.closest('button, [role="button"], a, div[tabindex="0"]');
    if (btn && clickTrackedTarget(btn, `post-comment-btn:${label}`)) return true;
  }

  return false;
}

function clickViewAllCommentsByCount() {
  const target = getTargetCommentTotal();
  const roots = [
    document.querySelector('main'),
    document.querySelector('article'),
    document,
  ].filter(Boolean);
  const seen = new Set();

  for (const root of roots) {
    for (const el of root.querySelectorAll('a, button, span, div, [role="button"], [role="link"], [tabindex="0"]')) {
      if (!(el instanceof Element) || seen.has(el)) continue;
      seen.add(el);

      const text = getElementContextText(el, 2);
      if (!text || text.length > 180) continue;

      const hasCount = target > 0
        ? new RegExp(`\\b${target}\\b`).test(text)
        : /\d[\d.,\s]*\s*(?:yorum|comments?)/iu.test(text);
      if (!hasCount || !/yorum|comment/i.test(text)) continue;

      const isViewAll = /tüm|all|view|see|gör|more|yükle/i.test(text)
        || /^\d[\d.,\s]*\s+(?:yorum|comments?)\b/i.test(text);
      if (!isViewAll) continue;

      const clickable = findClickableAncestor(el) || el;
      if (clickTrackedTarget(clickable, `view-all-count:${target}:${text.slice(0, 48)}`)) return true;
    }
  }

  return false;
}

function forceOpenFullCommentsPanel(force = false) {
  if (force) clearOpenCommentsClickCache();
  if (clickViewAllNearPreviewList()) return true;
  if (clickViewAllCommentsByCount()) return true;
  if (clickPostCommentButton()) return true;
  if (clickExpandCommentsLinks(force)) return true;
  if (clickOpenCommentsPanel()) return true;
  return clickPostMetricsCommentControl();
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
    const text = getCompactElementText(el).toLowerCase();
    if (!text || text.length > 180 || !matcher(text)) continue;
    if (hasBlockedAria(el)) continue;

    const clickable = findClickableAncestor(el) || el;
    if (clickTrackedTarget(clickable, `expand:${text.slice(0, 48)}`)) return true;
  }

  return false;
}

function clickPostMetricsCommentControl() {
  const commentSpan = findPostMetricsCommentSpan();
  if (!commentSpan) return false;

  const clickable =
    commentSpan.closest('a, button, [role="button"], [role="link"]')
    || commentSpan.parentElement?.closest('a, button, [role="button"], [role="link"]')
    || commentSpan.parentElement
    || commentSpan;

  return clickTrackedTarget(clickable, 'metrics-comment-count');
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

  return clickPostMetricsCommentControl();
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
  const countBefore = getFinalizedCommentCount();
  const stalled = unchangedStepCount >= 2;
  const needMore = hasMoreCommentsExpected();
  const forcePanel = needMore && countBefore <= 20;

  if (forcePanel && (stalled || scrollStepCount === 1 || scrollStepCount % OPEN_RETRY_STEP_INTERVAL === 0)) {
    clearOpenCommentsClickCache();
    if (stalled) clearLoadMoreClickCache(false);
    forceOpenFullCommentsPanel(true);
    refreshCommentTargets();
  } else if (
    scrollStepCount === 1
    || scrollStepCount % OPEN_RETRY_STEP_INTERVAL === 0
    || (stalled && needMore)
  ) {
    forceOpenFullCommentsPanel(stalled && needMore);
    refreshCommentTargets();
  }

  if (
    scrollStepCount === 1
    || stalled
    || needMore
    || (scrollStepCount % 3 === 0 && getFinalizedCommentCount() === lastCountAtClick)
  ) {
    clickLoadMoreButtons(stalled || needMore);
    lastCountAtClick = getFinalizedCommentCount();
  }

  if (!commentUl || !commentUl.isConnected) refreshCommentTargets();
  ensureObserver();
  scrollCommentArea();
  requestNextCommentPageIfNeeded(stalled || needMore);

  const networkBefore = getFinalizedCommentCount();
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

  const observeTarget = commentUl.closest('div[role="dialog"], [aria-modal="true"]') || commentUl;
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
  return getFinalizedCommentCount();
}

function resetState() {
  commentsList = [];
  seenCommentIds = new Set();
  seenDomKeys = new Set();
  repliesList = [];
  seenReplyIds = new Set();
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
  pinnedExpectedTotal = 0;
  lastNetworkIngestCount = 0;
  commentPaginationState = {
    endCursor: null,
    hasNextPage: false,
    fetchedCursors: new Set(),
    pendingFetch: false,
    lastFetchAt: 0,
  };
  clickedLoadMoreKeys = new Set();
}

function getCommentsArray() {
  return finalizeCommentsList().map(({ username, text, id, isReply }) => ({
    username,
    text,
    id,
    isReply: Boolean(isReply),
  }));
}

function getRepliesArray() {
  return repliesList.map(({ username, text, id, parentCommentId }) => ({
    username,
    text,
    id,
    parentCommentId: parentCommentId || null,
    isReply: true,
  }));
}

function shortcodeToMediaId(shortcode) {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let n = BigInt(0);
  for (const c of shortcode) {
    const idx = ALPHABET.indexOf(c);
    if (idx < 0) return null;
    n = n * 64n + BigInt(idx);
  }
  return n.toString();
}

function getPostShortcode() {
  const m = location.pathname.match(/\/(?:p|reel|tv)\/([^/?#]+)/);
  return m ? m[1] : null;
}

async function fetchLikers() {
  const shortcode = getPostShortcode();
  if (!shortcode) return [];
  const mediaId = shortcodeToMediaId(shortcode);
  if (!mediaId) return [];

  const likers = [];
  let nextMaxId = null;

  for (let page = 0; page < 30; page++) {
    const qs = nextMaxId ? `?max_id=${encodeURIComponent(nextMaxId)}` : '';
    try {
      const resp = await fetch(`https://i.instagram.com/api/v1/media/${mediaId}/likers/${qs}`, {
        credentials: 'include',
        headers: { 'X-IG-App-ID': '936619743392459', Accept: 'application/json' },
      });
      if (!resp.ok) break;
      const data = await resp.json();
      for (const user of data.users || []) {
        if (user.username) likers.push(user.username.toLowerCase());
      }
      nextMaxId = data.next_max_id || null;
      if (!nextMaxId) break;
    } catch (_) {
      break;
    }
  }

  return likers;
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
    forceOpenFullCommentsPanel(true);
    clickLoadMoreButtons(true);
    scrapeVisibleComments(true);
    detectExpectedCommentTotal();
    notifyPopup(true);
    ensureObserver();

    scrapingActive = true;
    autoScrollStep();
    scheduleNextScrollStep();

    sendResponse({ status: 'started', count: getFinalizedCommentCount() });
  } else if (request.type === 'STOP_SCRAPING') {
    const count = stopScraping();
    sendResponse({ status: 'stopped', count });
  } else if (request.type === 'GET_COMMENTS') {
    scrapeVisibleComments(true);
    scrapeEmbeddedPageData();
    fetchLikers()
      .then((likers) => sendResponse({ comments: getCommentsArray(), replies: getRepliesArray(), likers, postOwner: getPostOwnerUsername() }))
      .catch(() => sendResponse({ comments: getCommentsArray(), replies: getRepliesArray(), likers: [], postOwner: getPostOwnerUsername() }));
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
      verifyFn(
        request.requiredFollowAccounts,
        request.minRequiredFollows,
        {
          phase: request.phase,
          priorFollowed: request.priorFollowed,
        },
      )
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
  } else if (request.type === 'SCAN_FOLLOWERS_FOR_PARTICIPANTS') {
    const scanFn = window.__raffleFollowVerify?.scanAccountFollowersForParticipants;
    if (!scanFn) {
      sendResponse({
        ok: false,
        error: 'bulk_follow_verify_unavailable',
        matched: [],
      });
    } else {
      scanFn(
        request.targetAccount,
        request.participants,
        { maxRounds: request.maxRounds },
      )
        .then(sendResponse)
        .catch((err) => {
          sendResponse({
            ok: false,
            error: err?.message || 'bulk_scan_failed',
            matched: [],
          });
        });
    }
  }

  return true;
});
