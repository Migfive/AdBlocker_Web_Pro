(() => {
  'use strict';

  const AD_KEYS = new Set(['adPlacements', 'playerAds', 'adSlots']);

  function deepSanitize(value) {
    if (Array.isArray(value)) {
      return value.map(deepSanitize);
    }

    if (value && typeof value === 'object') {
      const cleaned = {};
      for (const [key, child] of Object.entries(value)) {
        if (AD_KEYS.has(key)) continue;
        cleaned[key] = deepSanitize(child);
      }
      return cleaned;
    }

    return value;
  }

  function sanitizePlayerResponse(payload) {
    if (!payload || typeof payload !== 'object') return payload;

    if (payload.adPlacements) delete payload.adPlacements;
    if (payload.playerAds) delete payload.playerAds;
    if (payload.adSlots) delete payload.adSlots;

    if (payload.playerConfig && payload.playerConfig.adPlacements) {
      delete payload.playerConfig.adPlacements;
    }

    if (payload.playerResponse) {
      sanitizePlayerResponse(payload.playerResponse);
    }

    if (payload.response) {
      sanitizePlayerResponse(payload.response);
    }

    return payload;
  }

  let currentPlayerResponse = window.ytInitialPlayerResponse;

  Object.defineProperty(window, 'ytInitialPlayerResponse', {
    configurable: true,
    enumerable: true,
    get() {
      return currentPlayerResponse;
    },
    set(nextValue) {
      currentPlayerResponse = sanitizePlayerResponse(nextValue);
    }
  });

  if (currentPlayerResponse) {
    currentPlayerResponse = sanitizePlayerResponse(currentPlayerResponse);
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function patchedFetch(input, init) {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input && typeof input === 'object' && input.url
          ? input.url
          : '';

    if (String(url).includes('/youtubei/v1/player')) {
      try {
        const response = await originalFetch(input, init);
        const contentType = response.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
          return response;
        }

        const clone = response.clone();
        const parsed = await clone.json().catch(() => null);
        if (parsed && typeof parsed === 'object') {
          const cleaned = sanitizePlayerResponse(parsed);
          const body = JSON.stringify(cleaned);

          return new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }

        return response;
      } catch (_) {
        return originalFetch(input, init);
      }
    }

    return originalFetch(input, init);
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function patchedOpen(method, url, async, user, password) {
    this.__ytBypassRequestUrl = String(url || '');
    return originalOpen.call(this, method, url, async, user, password);
  };

  XMLHttpRequest.prototype.send = function patchedSend(body) {
    const xhr = this;
    const requestUrl = xhr.__ytBypassRequestUrl || '';

    if (requestUrl.includes('/youtubei/v1/player')) {
      const applyCleanup = function () {
        try {
          const text = xhr.responseText;
          if (typeof text !== 'string' || !text.trim().startsWith('{')) return;

          const parsed = JSON.parse(text);
          const cleaned = sanitizePlayerResponse(parsed);
          const serialized = JSON.stringify(cleaned);

          Object.defineProperty(xhr, 'responseText', {
            configurable: true,
            get() {
              return serialized;
            }
          });

          Object.defineProperty(xhr, 'response', {
            configurable: true,
            get() {
              return serialized;
            }
          });
        } catch (_) {
          // ignored
        }
      };

      xhr.addEventListener('load', applyCleanup, { once: true });
      xhr.addEventListener('readystatechange', applyCleanup, { once: true });
    }

    return originalSend.call(this, body);
  };

  if (window.ytInitialPlayerResponse) {
    window.ytInitialPlayerResponse = sanitizePlayerResponse(window.ytInitialPlayerResponse);
  }
})();
