// MAIN world — Instagram fetch/XHR yanıtlarını yakalar (document_start)
(function rafflePageNetworkHook() {
  if (window.__raffleIgNetworkHook) return;
  window.__raffleIgNetworkHook = true;

  const COMMENT_HINT = /comment|xdt_api|edge_media_to_comment|threaded/i;

  function getRequestBody(args) {
    const init = typeof args[0] === 'object' && args[0] !== null && !(args[0] instanceof Request)
      ? args[0]
      : args[1];
    const body = init?.body;
    return typeof body === 'string' ? body : '';
  }

  function shouldCapture(url, method, requestBody) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    if (!lower.includes('instagram.com') && !lower.includes('facebook.com')) return false;
    if (lower.includes('comment')) return true;
    if (requestBody && COMMENT_HINT.test(requestBody)) return true;
    if (lower.includes('graphql') || lower.includes('/api/')) return true;
    return false;
  }

  function publish(body) {
    if (!body || body.length < 40) return;

    const hasComment = COMMENT_HINT.test(body) && /"edges"|"items"|"text"|comment_count/i.test(body);
    const hasFollowing = /following|follower|edge_follow|friendship/i.test(body) && /username|"edges"/i.test(body);

    if (!hasComment && !hasFollowing) return;

    window.postMessage({ type: 'RAFFLE_IG_NETWORK', body }, '*');
  }

  const originalFetch = window.fetch;
  window.fetch = function raffleFetchWrapper(...args) {
    const responsePromise = originalFetch.apply(this, args);
    responsePromise.then((response) => {
      try {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        const method = typeof args[0] === 'object' && args[0]?.method ? args[0].method : 'GET';
        const requestBody = getRequestBody(args);
        if (!shouldCapture(url, method, requestBody)) return;
        response.clone().text().then((body) => publish(body)).catch(function () {});
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
    const requestBody = typeof args[0] === 'string' ? args[0] : '';
    this.__raffleRequestBody = requestBody;
    this.addEventListener('load', function () {
      try {
        const url = this.__raffleUrl || '';
        if (shouldCapture(url, this.__raffleMethod, this.__raffleRequestBody || '')) {
          publish(this.responseText || '');
        }
      } catch (_) {}
    });
    return originalSend.apply(this, args);
  };
})();
