// Instagram Çekiliş Yardımcısı - Content Script
let scrapingInterval = null;
let collectedComments = [];

// Sayfadaki yorumları ayrıştıran fonksiyon
function scrapeInstagramComments() {
  const commentsMap = new Map(); // Mükerrerleri (aynı yorum satırını) geçici olarak önlemek için
  const listItems = document.querySelectorAll('ul li');

  listItems.forEach(li => {
    try {
      // Kullanıcı adını bul (Genellikle h2, h3 veya role="link" olan a etiketleri)
      const userEl = li.querySelector('h2 a, h3 a, a[role="link"], a[href^="/"]');
      if (!userEl) return;

      const username = userEl.textContent.trim().replace('@', '');
      if (!username || username === 'Instagram') return;

      // Yorum metnini bul
      const spans = li.querySelectorAll('span');
      let commentText = "";

      spans.forEach(span => {
        const text = span.textContent.trim();
        if (
          text &&
          text !== username &&
          !text.match(/^\d+[gsqd]$/) && // 2g, 5s, 10d vb. süre etiketleri
          !text.match(/^\d+\s*(gün|saat|dakika|hafta|g|s|d|h|yıl)/i) &&
          !text.includes('Yanıtla') &&
          !text.includes('Reply') &&
          !text.includes('Beğen') &&
          !text.includes('Like') &&
          !text.startsWith('Diğer yanıtları gör') &&
          !text.startsWith('View replies')
        ) {
          // En uzun anlamlı metni yorum metni olarak kabul et
          if (text.length > commentText.length) {
            commentText = text;
          }
        }
      });

      if (username && commentText) {
        // Benzersiz bir anahtar oluştur (kullanıcı ve yorum birleşimi)
        const key = `${username}:${commentText}`;
        commentsMap.set(key, { username, text: commentText });
      }
    } catch (err) {
      console.error('Yorum ayrıştırılamadı:', err);
    }
  });

  return Array.from(commentsMap.values());
}

// Otomatik kaydırma ve buton tıklama fonksiyonu
function autoScrollComments() {
  // Instagram'da yorumların bulunduğu scrollable div'i bul
  // Genelde gönderi modalında ul etiketinin üst veya 2 üst div'idir.
  const ul = document.querySelector('ul');
  let scrollContainer = window;

  if (ul) {
    let parent = ul.parentElement;
    // Scroll edilebilir ana container'ı bulana kadar yukarı çık
    while (parent && parent !== document.body) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (overflowY === 'scroll' || overflowY === 'auto') {
        scrollContainer = parent;
        break;
      }
      parent = parent.parentElement;
    }
  }

  // 1. Aşağı kaydır
  if (scrollContainer === window) {
    window.scrollTo(0, document.body.scrollHeight);
  } else {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }

  // 2. "Daha fazla yorum yükle" (Plus / Daire) butonunu bul ve tıkla
  // Instagram'da bu buton genellikle bir SVG barındırır (artı simgesi) veya role="button" dır.
  const buttons = document.querySelectorAll('button[type="button"], div[role="button"]');
  buttons.forEach(btn => {
    const text = btn.textContent.trim();
    const svg = btn.querySelector('svg');
    // Artı simgesini (load more) veya "Daha fazla yorum yükle" yazılarını yakalayalım
    if (
      text.includes('Daha fazla') ||
      text.includes('Yorum yükle') ||
      text.includes('Load more') ||
      (svg && svg.getAttribute('aria-label') === 'Daha fazla yorum yükle') ||
      (svg && svg.getAttribute('aria-label') === 'Load more comments')
    ) {
      btn.click();
    }
  });

  // 3. Yorumları çek ve güncelle
  collectedComments = scrapeInstagramComments();

  // Popup'a canlı sayıyı gönder
  chrome.runtime.sendMessage({
    type: 'SCRAPE_UPDATE',
    count: collectedComments.length
  });
}

// Mesaj dinleyici
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_SCRAPING') {
    if (scrapingInterval) clearInterval(scrapingInterval);
    
    collectedComments = scrapeInstagramComments();
    autoScrollComments();
    
    // Her 1.5 saniyede bir kaydır ve yeni yorumları tara
    scrapingInterval = setInterval(autoScrollComments, 1500);
    sendResponse({ status: 'started', count: collectedComments.length });
  } 
  
  else if (request.type === 'STOP_SCRAPING') {
    if (scrapingInterval) {
      clearInterval(scrapingInterval);
      scrapingInterval = null;
    }
    collectedComments = scrapeInstagramComments();
    sendResponse({ status: 'stopped', count: collectedComments.length });
  } 
  
  else if (request.type === 'GET_COMMENTS') {
    collectedComments = scrapeInstagramComments();
    sendResponse({ comments: collectedComments });
  }
  
  return true; // Asenkron yanıt için true dönüyoruz
});
