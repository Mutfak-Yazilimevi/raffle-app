// Popup ile content script arasında oturum yönetimi.
// Popup kapanınca port kopar ve aktif taramayı durdurur.

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'raffle-popup') return;

  let scrapingTabId = null;

  port.onMessage.addListener((message) => {
    if (message.type === 'SCRAPING_STARTED' && message.tabId) {
      scrapingTabId = message.tabId;
    }
    if (message.type === 'SCRAPING_STOPPED') {
      scrapingTabId = null;
    }
  });

  port.onDisconnect.addListener(() => {
    if (!scrapingTabId) return;

    chrome.tabs.sendMessage(scrapingTabId, { type: 'STOP_SCRAPING' }).catch(() => {});
    scrapingTabId = null;
  });
});
