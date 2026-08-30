(function() {
  'use strict';

  function installAntiAdblockTrackingProtection() {
    const telemetryKeyFragments = ['ad', 'yt-player-ad', 'enforcement', 'yt-remote'];

    function isTelemetryKey(key) {
      const normalizedKey = String(key).toLowerCase();
      return telemetryKeyFragments.some(fragment => normalizedKey.includes(fragment));
    }

    try {
      const storage = window.localStorage;
      const originalSetItem = storage.setItem;

      if (typeof originalSetItem === 'function' && !originalSetItem.__adblockerPatched) {
        function protectedSetItem(key, value) {
          if (isTelemetryKey(key)) return;
          return originalSetItem.call(this, key, value);
        }

        Object.defineProperty(protectedSetItem, '__adblockerPatched', { value: true });
        Object.defineProperty(storage, 'setItem', {
          configurable: true,
          value: protectedSetItem
        });
      }

      Object.keys(storage).forEach(key => {
        if (isTelemetryKey(key)) storage.removeItem(key);
      });
    } catch (error) {
      // Storage may be unavailable in private or restricted browsing contexts.
    }

    const originalSendBeacon = navigator.sendBeacon;
    if (typeof originalSendBeacon === 'function' && !originalSendBeacon.__adblockerPatched) {
      function protectedSendBeacon(url, data) {
        const normalizedUrl = String(url).toLowerCase();
        if (normalizedUrl.includes('yt-attribution') || normalizedUrl.includes('pagead')) {
          return true;
        }
        return originalSendBeacon.call(this, url, data);
      }

      Object.defineProperty(protectedSendBeacon, '__adblockerPatched', { value: true });
      navigator.sendBeacon = protectedSendBeacon;
    }
  }

  installAntiAdblockTrackingProtection();

  // Helper to sanitize player response object
  function sanitizePlayerResponse(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    // Delete ad placements and ad parameters
    if (obj.adPlacements) delete obj.adPlacements;
    if (obj.playerAds) delete obj.playerAds;
    if (obj.adSlots) delete obj.adSlots;
    if (obj.ad3dp) delete obj.ad3dp;

    if (obj.playerConfig && obj.playerConfig.adPlacements) {
      delete obj.playerConfig.adPlacements;
    }

    // Process nested playability and response objects
    if (obj.playerResponse) {
      sanitizePlayerResponse(obj.playerResponse);
    }

    return obj;
  }

  // Intercept window.ytInitialPlayerResponse
  let rawPlayerResponse = window.ytInitialPlayerResponse;
  Object.defineProperty(window, 'ytInitialPlayerResponse', {
    get: function() {
      return rawPlayerResponse;
    },
    set: function(val) {
      rawPlayerResponse = sanitizePlayerResponse(val);
    },
    configurable: true,
    enumerable: true
  });

  if (window.ytInitialPlayerResponse) {
    sanitizePlayerResponse(window.ytInitialPlayerResponse);
  }

  // Intercept JSON.parse to remove ad payload objects on the fly
  const originalJSONParse = JSON.parse;
  JSON.parse = function(text, reviver) {
    const res = originalJSONParse.call(this, text, reviver);
    if (res && typeof res === 'object') {
      if (res.adPlacements || res.playerAds || res.adSlots || (res.playerResponse && res.playerResponse.adPlacements)) {
        sanitizePlayerResponse(res);
      }
    }
    return res;
  };

  // Intercept fetch API calls to YouTube API endpoints
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');

    if (url && (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next'))) {
      try {
        const clone = response.clone();
        const json = await clone.json();
        if (json && (json.adPlacements || json.playerAds || json.adSlots)) {
          sanitizePlayerResponse(json);
          const modifiedBlob = new Blob([JSON.stringify(json)], { type: 'application/json' });
          return new Response(modifiedBlob, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
      } catch (e) {
        // Fallback to original response on parse error
      }
    }
    return response;
  };

  console.log('[AdBlocker Pro] YouTube Player Injected Sanitizer Active');
})();
