(() => {
  'use strict';

  if (window.__youtubeFastForwardInstalled) return;
  window.__youtubeFastForwardInstalled = true;

  const config = {
    enabled: true,
    muteAds: true,
    playbackRate: 16,
    pollMs: 180,
    selectors: [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button-slot button',
      '.ytp-ad-skip-button-container button',
      'button.ytp-ad-skip-button-modern',
      'button[aria-label*="Skip ad"]',
      'button[aria-label*="Skip"]',
      '[role="button"][aria-label*="Skip"]',
      '[data-layer*="skip-ad"]'
    ]
  };

  function getPlayer() {
    const directPlayer = document.querySelector('#movie_player');
    if (directPlayer) return directPlayer;

    const html5Player = document.querySelector('.html5-video-player');
    if (html5Player) return html5Player;

    const videoEl = document.querySelector('video');
    return videoEl ? videoEl.closest('.html5-video-player') : null;
  }

  function getVideo() {
    const player = getPlayer();
    if (!player) return null;

    const directVideo = player.querySelector('video');
    if (directVideo) return directVideo;

    return document.querySelector('video.html5-main-video');
  }

  function getSkipCandidates() {
    const results = new Set();

    config.selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (node instanceof HTMLElement && node.offsetParent !== null) {
          results.add(node);
        }
      });
    });

    document.querySelectorAll('button, [role="button"]').forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.offsetParent === null) return;

      const text = (node.textContent || '').toLowerCase();
      const aria = (node.getAttribute('aria-label') || '').toLowerCase();

      if ((text.includes('skip') || aria.includes('skip')) && (text.includes('ad') || aria.includes('ad'))) {
        results.add(node);
      }
    });

    return [...results];
  }

  function isAdActive(player, video) {
    if (!player || !video) return false;

    const hasAdClass =
      player.classList.contains('ad-showing') ||
      player.classList.contains('ad-interrupting') ||
      player.classList.contains('ytp-ad-module');

    const hasOverlay = Boolean(
      document.querySelector('.ytp-ad-player-overlay') ||
      document.querySelector('.ytp-ad-module') ||
      document.querySelector('.ytp-ad-preview-container')
    );

    return Boolean(hasAdClass || hasOverlay || getSkipCandidates().length > 0);
  }

  function clickSkipButton() {
    const candidates = getSkipCandidates();

    for (const candidate of candidates) {
      try {
        candidate.click();
        return true;
      } catch (_) {
        try {
          candidate.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        } catch (_) {
          // ignored
        }
      }
    }

    return false;
  }

  function applyFastForward() {
    if (!config.enabled) return;

    const player = getPlayer();
    const video = getVideo();

    if (!player || !video) return;

    const adActive = isAdActive(player, video);

    if (!adActive) {
      if (video.playbackRate > 4) {
        video.playbackRate = 1;
      }

      if (window.__ytBypassAutoMuted && video.muted) {
        video.muted = false;
        window.__ytBypassAutoMuted = false;
      }

      return;
    }

    if (config.muteAds) {
      video.muted = true;
      window.__ytBypassAutoMuted = true;
    }

    video.playbackRate = config.playbackRate;

    if (Number.isFinite(video.duration) && video.duration > 0) {
      const target = Math.max(0, video.duration - 0.15);
      if (video.currentTime < target) {
        video.currentTime = target;
      }
    } else {
      video.currentTime = Number.MAX_SAFE_INTEGER;
    }

    clickSkipButton();
  }

  const observer = new MutationObserver(() => {
    applyFastForward();
  });

  function startMonitoring() {
    applyFastForward();

    const root = document.documentElement || document.body;
    if (root) {
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'aria-label']
      });
    }

    window.setInterval(applyFastForward, config.pollMs);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMonitoring, { once: true });
  } else {
    startMonitoring();
  }
})();
