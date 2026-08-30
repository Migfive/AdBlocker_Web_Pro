(() => {
  'use strict';

  if (window.__youtubeFastForwardInstalled) return;
  window.__youtubeFastForwardInstalled = true;

  const config = {
    enabled: true,
    playbackRate: 16.0,
    pollMs: 180,
    maxAdDuration: 600
  };

  function resetVideoState(video) {
    if (!video) return;
    video.muted = false;
    video.playbackRate = 1.0;
  }

  function getPlayer() {
    return document.getElementById('movie_player') || document.querySelector('.html5-video-player');
  }

  function getVideo() {
    const player = getPlayer();
    if (!player) return null;

    const videoFromPlayer = player.querySelector('video');
    if (videoFromPlayer) return videoFromPlayer;

    return document.querySelector('video.html5-main-video, video');
  }

  function findActiveSkipButton(player) {
    if (!player) return null;

    const skipContainers = player.querySelectorAll('.ytp-ad-skip-button-container, .ytp-ad-skip-button-modern');

    for (const container of skipContainers) {
      const directButton = container.querySelector('button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern');
      if (directButton && typeof directButton.click === 'function') {
        return directButton;
      }

      if (container.matches('button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern') && typeof container.click === 'function') {
        return container;
      }
    }

    const adSkipButton = player.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern');
    if (adSkipButton && typeof adSkipButton.click === 'function') {
      return adSkipButton;
    }

    return null;
  }

  function isActualAdState(player) {
    if (!player) return false;

    const hasAdInterrupting = player.classList.contains('ad-interrupting');
    const hasHtml5AdSpace = player.querySelector('.html5-ad-space');
    const hasYtpAdOverlay = player.querySelector('.ytp-ad-player-overlay');

    return Boolean(hasAdInterrupting || hasHtml5AdSpace || hasYtpAdOverlay);
  }

  function applyFastForward() {
    if (!config.enabled) return;

    const player = getPlayer();
    const video = getVideo();

    if (!player || !video) return;

    const isAd = isActualAdState(player);

    if (!isAd) {
      if (player.classList.contains('ad-interrupting')) {
        resetVideoState(video);
        return;
      }

      if (video.playbackRate !== 1.0) {
        video.playbackRate = 1.0;
      }

      if (video.muted) {
        video.muted = false;
      }

      return;
    }

    const skipButton = findActiveSkipButton(player);
    if (skipButton && typeof skipButton.click === 'function') {
      skipButton.click();
    }

    video.muted = true;
    video.playbackRate = config.playbackRate;

    if (Number.isFinite(video.duration) && video.duration > 0 && video.duration < config.maxAdDuration) {
      const target = Math.max(0, video.duration - 0.15);
      if (video.currentTime < target) {
        video.currentTime = target;
      }
    }
  }

  function observerCallback() {
    const player = getPlayer();
    const video = getVideo();

    if (!player || !video) return;

    if (!isActualAdState(player)) {
      resetVideoState(video);
      return;
    }

    applyFastForward();
  }

  const observer = new MutationObserver(() => {
    observerCallback();
  });

  function startMonitoring() {
    const root = document.documentElement || document.body;
    if (root) {
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    observerCallback();
    window.setInterval(observerCallback, config.pollMs);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMonitoring, { once: true });
  } else {
    startMonitoring();
  }
})();
