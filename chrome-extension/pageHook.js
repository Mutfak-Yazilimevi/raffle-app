// MAIN world — Instagram fetch/XHR yanıtlarını yakalar (document_start)
(function rafflePageNetworkHook() {
  if (window.__raffleIgNetworkHook) return;
  window.__raffleIgNetworkHook = true;

  const COMMENT_HINT = /comment|xdt_api|edge_media_to_comment|threaded/i;
  let lastCommentGraphqlTemplate = null;
  let activePaginationFetch = false;

  function getRequestBody(args) {
    const init = typeof args[0] === 'object' && args[0] !== null && !(args[0] instanceof Request)
      ? args[0]
      : args[1];
    const body = init?.body;
    return typeof body === 'string' ? body : '';
  }

  function getRequestUrl(args) {
    if (typeof args[0] === 'string') return args[0];
    return args[0]?.url || '';
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

  function isCommentGraphqlRequest(url, requestBody) {
    if (!requestBody || !COMMENT_HINT.test(requestBody)) return false;
    return /graphql|\/api\//i.test(url);
  }

  function parseRequestPayload(rawBody) {
    if (!rawBody) return null;

    const trimmed = rawBody.trim();
    if (trimmed.startsWith('{')) {
      try {
        const data = JSON.parse(trimmed);
        return { kind: 'json', rawBody, data, variables: data.variables || {} };
      } catch (_) {
        return null;
      }
    }

    try {
      const params = new URLSearchParams(rawBody);
      const variablesRaw = params.get('variables');
      if (!variablesRaw) return null;
      return {
        kind: 'form',
        rawBody,
        params,
        variables: JSON.parse(variablesRaw),
        docId: params.get('doc_id') || params.get('query_id') || '',
      };
    } catch (_) {
      return null;
    }
  }

  function rememberCommentRequest(url, method, requestBody) {
    if (!isCommentGraphqlRequest(url, requestBody)) return;
    const parsed = parseRequestPayload(requestBody);
    if (!parsed) return;

    lastCommentGraphqlTemplate = {
      url,
      method: method || 'POST',
      parsed,
    };
  }

  function setCursorOnVariables(variables, cursor) {
    const next = { ...variables };
    const cursorKeys = ['after', 'cursor', 'min_id', 'max_id', 'page_token', 'next_min_id'];

    for (const key of cursorKeys) {
      if (Object.prototype.hasOwnProperty.call(variables, key)) {
        next[key] = cursor;
        return next;
      }
    }

    next.after = cursor;
    return next;
  }

  function buildRequestBody(template, variables) {
    if (template.parsed.kind === 'json') {
      return JSON.stringify({ ...template.parsed.data, variables });
    }

    const params = new URLSearchParams(template.parsed.params);
    params.set('variables', JSON.stringify(variables));
    return params.toString();
  }

  function publish(body) {
    if (!body || body.length < 40) return;

    const hasComment = COMMENT_HINT.test(body) && /"edges"|"items"|"text"|comment_count/i.test(body);
    const hasFollowing = /following|follower|edge_follow|friendship/i.test(body) && /username|"edges"/i.test(body);

    if (!hasComment && !hasFollowing) return;

    window.postMessage({ type: 'RAFFLE_IG_NETWORK', body }, '*');
  }

  function fetchCommentPageWithCursor(cursor) {
    if (!lastCommentGraphqlTemplate || !cursor || activePaginationFetch) {
      return Promise.resolve(false);
    }

    activePaginationFetch = true;
    const template = lastCommentGraphqlTemplate;
    const variables = setCursorOnVariables(template.parsed.variables, cursor);
    const body = buildRequestBody(template, variables);
    const headers = template.parsed.kind === 'json'
      ? { 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/x-www-form-urlencoded' };

    return fetch(template.url, {
      method: template.method,
      credentials: 'include',
      headers,
      body,
    })
      .then((response) => response.text())
      .then((text) => {
        publish(text);
        return true;
      })
      .catch(function () {
        return false;
      })
      .finally(function () {
        activePaginationFetch = false;
        window.postMessage({ type: 'RAFFLE_FETCH_COMMENT_PAGE_DONE', cursor }, '*');
      });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.type !== 'RAFFLE_FETCH_COMMENT_PAGE') return;
    fetchCommentPageWithCursor(event.data.cursor);
  });

  const originalFetch = window.fetch;
  window.fetch = function raffleFetchWrapper(...args) {
    const responsePromise = originalFetch.apply(this, args);
    responsePromise.then((response) => {
      try {
        const url = getRequestUrl(args);
        const method = typeof args[0] === 'object' && args[0]?.method ? args[0].method : 'POST';
        const requestBody = getRequestBody(args);
        if (!shouldCapture(url, method, requestBody)) return;
        rememberCommentRequest(url, method, requestBody);
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
          rememberCommentRequest(url, this.__raffleMethod, this.__raffleRequestBody || '');
          publish(this.responseText || '');
        }
      } catch (_) {}
    });
    return originalSend.apply(this, args);
  };
})();
