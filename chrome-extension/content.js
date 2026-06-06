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

let scrapingInterval = null;
let observer = null;
let commentsMap = new Map();
let commentUl = null;
let scrollContainer = null;
let lastNotifyTime = 0;
let lastScrapeTime = 0;

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

function clickLoadMoreButtons() {
  const root = document.querySelector('div[role="dialog"]') || document;
  const selectors = 'button, div[role="button"], span[role="button"], a[role="button"]';

  for (const el of root.querySelectorAll(selectors)) {
    const text = (el.textContent || '').trim().toLowerCase();
    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
    const combined = `${text} ${aria}`;

    const isCommentLoader =
      (combined.includes('yorum') && (
        combined.includes('daha fazla') ||
        combined.includes('tüm') ||
        combined.includes('view') ||
        combined.includes('load')
      )) ||
      combined.includes('more comment') ||
      combined.includes('view all') ||
      combined.includes('view replies') ||
      combined.includes('yanıtları gör');

    if (isCommentLoader) {
      try { el.click(); } catch (_) { /* ignore */ }
    }
  }

  for (const svg of root.querySelectorAll('svg[aria-label]')) {
    const label = (svg.getAttribute('aria-label') || '').toLowerCase();
    if (label.includes('yorum') || label.includes('comment')) {
      const btn = svg.closest('button, div[role="button"]');
      if (btn) {
        try { btn.click(); } catch (_) { /* ignore */ }
      }
    }
  }
}

function autoScrollStep() {
  clickLoadMoreButtons();

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
    clickLoadMoreButtons();
    refreshCommentTargets();
    scrapeVisibleComments();
    startObserver();

    autoScrollStep();
    scrapingInterval = setInterval(autoScrollStep, 700);

    sendResponse({ status: 'started', count: commentsMap.size });
  } else if (request.type === 'STOP_SCRAPING') {
    if (scrapingInterval) {
      clearInterval(scrapingInterval);
      scrapingInterval = null;
    }
    stopObserver();
    scrapeVisibleComments();
    sendResponse({ status: 'stopped', count: commentsMap.size });
  } else if (request.type === 'GET_COMMENTS') {
    scrapeVisibleComments();
    sendResponse({ comments: getCommentsArray() });
  }

  return true;
});
