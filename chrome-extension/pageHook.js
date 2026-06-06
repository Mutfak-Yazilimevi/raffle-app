// MAIN world — Instagram fetch/XHR yanıtlarını yakalar (document_start)
(function rafflePageNetworkHook() {
  if (window.__raffleIgNetworkHook) return;
  window.__raffleIgNetworkHook = true;

  function shouldCapture(url, method) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    if (!lower.includes('instagram.com') && !lower.includes('facebook.com')) return false;
    if (lower.includes('comment') || lower.includes('graphql') || lower.includes('/api/')) {
      return true;
    }
    if ((method || 'GET').toUpperCase() === 'POST' && lower.includes('instagram.com')) {
      return true;
    }
    return false;
  }

  function publish(body, url) {
    if (!body || body.length < 40) return;
    if (!/comment|"text"|edges|xdt_api/i.test(body)) return;
    window.postMessage({ type: 'RAFFLE_IG_NETWORK', body, url: url || '' }, '*');
  }

  const originalFetch = window.fetch;
  window.fetch = function raffleFetchWrapper(...args) {
    const responsePromise = originalFetch.apply(this, args);
    responsePromise.then((response) => {
      try {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        const method = typeof args[0] === 'object' && args[0]?.method ? args[0].method : 'GET';
        if (!shouldCapture(url, method)) return;
        response.clone().text().then((body) => publish(body, url)).catch(function () {});
      } catch (_) {}
    }).catch(function () {});
    return responsePromise;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function raffleOpen(method, url, ...rest) {
    this.__raffleUrl = url;
    this.__raffleMethod = method;
    return originalOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function raffleSend(...args) {
    this.addEventListener('load', function () {
      try {
        const url = this.__raffleUrl || '';
        if (shouldCapture(url, this.__raffleMethod)) {
          publish(this.responseText || '', url);
        }
      } catch (_) {}
    });
    return originalSend.apply(this, args);
  };
})();
