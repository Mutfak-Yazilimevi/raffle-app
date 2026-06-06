// MAIN world — Instagram fetch/XHR yanıtlarını yakalar (document_start)
(function rafflePageNetworkHook() {
  if (window.__raffleIgNetworkHook) return;
  window.__raffleIgNetworkHook = true;

  function shouldCapture(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    if (!lower.includes('instagram.com') && !lower.includes('facebook.com')) return false;
    return (
      lower.includes('comment')
      || lower.includes('graphql')
      || lower.includes('/api/v1/media/')
    );
  }

  function publish(body) {
    if (!body || body.length < 40) return;
    window.postMessage({ type: 'RAFFLE_IG_NETWORK', body }, '*');
  }

  const originalFetch = window.fetch;
  window.fetch = function raffleFetchWrapper(...args) {
    const responsePromise = originalFetch.apply(this, args);
    responsePromise.then((response) => {
      try {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        if (!shouldCapture(url)) return;
        response.clone().text().then(publish).catch(function () {});
      } catch (_) {}
    }).catch(function () {});
    return responsePromise;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function raffleOpen(method, url, ...rest) {
    this.__raffleUrl = url;
    return originalOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function raffleSend(...args) {
    this.addEventListener('load', function () {
      try {
        if (shouldCapture(this.__raffleUrl || '')) {
          publish(this.responseText || '');
        }
      } catch (_) {}
    });
    return originalSend.apply(this, args);
  };
})();
