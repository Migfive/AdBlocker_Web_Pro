(function() {
  'use strict';

  let config = {
    enabled: true,
    ytTurboSkip: true,
    ytAutoMute: true,
    ytRemoveOverlays: true
  };

  // Track if we auto-muted the video so we don't unmute if user muted it manually
  let wasAutoMutedByScript = false;

  // Load configuration from storage
  function loadConfig() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['enabled', 'ytTurboSkip', 'ytAutoMute', 'ytRemoveOverlays', 'whitelist'], (res) => {
        if (res.enabled !== undefined) config.enabled = res.enabled;
        if (res.ytTurboSkip !== undefined) config.ytTurboSkip = res.ytTurboSkip;
        if (res.ytAutoMute !== undefined) config.ytAutoMute = res.ytAutoMute;
        if (res.ytRemoveOverlays !== undefined) config.ytRemoveOverlays = res.ytRemoveOverlays;

        const hostname = window.location.hostname;
        if (res.whitelist && Array.isArray(res.whitelist)) {
          if (res.whitelist.some(domain => hostname.includes(domain))) {
            config.enabled = false;
          }
        }
      });
    }
  }

  loadConfig();

  // Listen for configuration updates
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'SETTINGS_UPDATED') {
        loadConfig();
      }
    });
  }

  // Inject CSS rules for hiding banner ads instantly
  const styleEl = document.createElement('style');
  styleEl.id = 'yt-adblocker-pro-styles';
  styleEl.textContent = `
    #player-ads,
    .ytp-ad-overlay-container,
    .ytp-ad-text-overlay,
    .ytp-ad-image-overlay,
    ytd-promoted-sparkles-web-renderer,
    ytd-promoted-video-renderer,
    ytd-display-ad-renderer,
    #masthead-ad,
    ytd-banner-promo-renderer,
    ytd-statement-banner-renderer,
    ytd-in-feed-ad-layout-renderer,
    ytd-ad-slot-renderer,
    yt-smart-banner,
    .ytd-mealbar-promo-renderer,
    ytd-compact-promoted-item-renderer,
    ytd-companion-slot-renderer,
    .ytp-ad-action-interstitial,
    .ytp-ad-overlay-slot {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      width: 0 !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;

  function ensureStyles() {
    if (!document.getElementById('yt-adblocker-pro-styles')) {
      const target = document.head || document.documentElement;
      if (target) target.appendChild(styleEl);
    }
  }

  ensureStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureStyles);
  }

  // Skip ad state tracker
  let lastAdSkippedTime = 0;

  function reportAdBlocked() {
    const now = Date.now();
    if (now - lastAdSkippedTime > 1500) {
      lastAdSkippedTime = now;
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'AD_BLOCKED', category: 'youtube' }, () => {
          if (chrome.runtime.lastError) { /* ignore */ }
        });
      }
    }
  }

  // YouTube Fast Skip & Mute Logic
  function handleYouTubeAds() {
    if (!config.enabled || !config.ytTurboSkip) return;
    const path = window.location.pathname || '';
    if (!path.startsWith('/watch') && !path.startsWith('/shorts')) return;

    const moviePlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
    const video = moviePlayer ? moviePlayer.querySelector('video') : document.querySelector('video.html5-main-video');

    if (!video || !moviePlayer) return;

    // Check skip buttons
    const skipSelectors = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button-slot button',
      '.ytp-ad-skip-button-container button',
      'button.ytp-ad-skip-button-modern'
    ];

    let visibleSkipBtn = null;
    for (const selector of skipSelectors) {
      const btn = document.querySelector(selector);
      if (btn && btn.offsetParent !== null) {
        visibleSkipBtn = btn;
        break;
      }
    }

    // Accurate ad detection
    const hasAdClass = moviePlayer && (
      moviePlayer.classList.contains('ad-showing') ||
      moviePlayer.classList.contains('ad-interrupting')
    );

    const hasActiveAdOverlay = Boolean(
      document.querySelector('.ytp-ad-player-overlay') ||
      document.querySelector('.ytp-ad-preview-container')
    );

    const isAdShowing = hasAdClass || visibleSkipBtn !== null || hasActiveAdOverlay;

    if (!isAdShowing) {
      if (video.playbackRate > 4.0) {
        video.playbackRate = 1.0;
      }
      if (wasAutoMutedByScript && video.muted) {
        video.muted = false;
        wasAutoMutedByScript = false;
      }
      return;
    }

    // 1. Mute ad immediately
    if (config.ytAutoMute && !video.muted) {
      video.muted = true;
      wasAutoMutedByScript = true;
    }

    // 2. Fast-forward ad to end instantly only when ad overlay state is confirmed
    if (video.duration && isFinite(video.duration) && video.currentTime < video.duration) {
      video.playbackRate = 16.0;
      video.currentTime = Math.max(0, video.duration - 0.1);
    } else if (!isFinite(video.duration)) {
      video.playbackRate = 16.0;
      video.currentTime = 9999;
    }

    // 3. Auto click skip buttons
    if (visibleSkipBtn && typeof visibleSkipBtn.click === 'function') {
      visibleSkipBtn.click();
      reportAdBlocked();
    } else {
      for (const selector of skipSelectors) {
        const skipBtn = document.querySelector(selector);
        if (skipBtn && skipBtn.offsetParent !== null && typeof skipBtn.click === 'function') {
          skipBtn.click();
          reportAdBlocked();
          break;
        }
      }
    }

    // 4. Remove anti-adblock popup overlays if YouTube shows enforcement notice
    const dismissBtn = document.querySelector('ytd-popup-container #dismiss-button, tp-yt-paper-dialog #dismiss-button, .yt-spec-button-shape-next--call-to-action');
    const enforcementPopup = document.querySelector('ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(.yt-playability-error-supported-renderers)');

    if (enforcementPopup) {
      enforcementPopup.remove();
      if (dismissBtn) dismissBtn.click();
      if (video.paused) {
        video.play().catch(() => {});
      }
    }
  }

  // Run on MutationObserver and fast interval loop
  const observer = new MutationObserver(() => {
    handleYouTubeAds();
  });

  function startMonitoring() {
    ensureStyles();
    handleYouTubeAds();

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    setInterval(handleYouTubeAds, 150);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    startMonitoring();
  } else {
    document.addEventListener('DOMContentLoaded', startMonitoring);
  }

  console.log('[AdBlocker Pro] YouTube Auto-Skip Engine Active (Fixed)');
})();
