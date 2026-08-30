document.addEventListener('DOMContentLoaded', () => {
  const masterToggle = document.getElementById('masterToggle');
  const ytTurboToggle = document.getElementById('ytTurboToggle');
  const ytMuteToggle = document.getElementById('ytMuteToggle');
  const statusBanner = document.getElementById('statusBanner');
  const statusText = document.getElementById('statusText');
  const statToday = document.getElementById('statToday');
  const statYouTube = document.getElementById('statYouTube');
  const adsBlockedCount = document.getElementById('ads-blocked-count');
  const statTimeSaved = document.getElementById('statTimeSaved');
  const btnElementPicker = document.getElementById('btnElementPicker');
  const btnToggleWhitelist = document.getElementById('btnToggleWhitelist');
  const whitelistBtnText = document.getElementById('whitelistBtnText');
  const btnOpenOptions = document.getElementById('btnOpenOptions');

  let currentDomain = '';
  let currentTabId = null;

  // Format time saved helper
  function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }

  // Load state and statistics
  function refreshUI() {
    chrome.storage.local.get([
      'enabled', 'ytTurboSkip', 'ytAutoMute', 'blockedToday',
      'blockedYouTube', 'whitelist'
    ], (res) => {
      const isEnabled = res.enabled !== undefined ? res.enabled : true;
      masterToggle.checked = isEnabled;
      ytTurboToggle.checked = res.ytTurboSkip !== undefined ? res.ytTurboSkip : true;
      ytMuteToggle.checked = res.ytAutoMute !== undefined ? res.ytAutoMute : true;

      const today = res.blockedToday || 0;
      const ytCount = res.blockedYouTube || 0;
      const totalCount = res.blockedTotal || 0;
      statToday.textContent = today.toLocaleString();
      statYouTube.textContent = ytCount.toLocaleString();
      if (adsBlockedCount) adsBlockedCount.textContent = totalCount.toLocaleString();

      // Estimated time saved: 6s per YouTube ad skipped + 2s per standard ad
      const totalTimeSecs = (ytCount * 6) + (today * 2);
      statTimeSaved.textContent = formatTime(totalTimeSecs);

      const whitelist = res.whitelist || [];
      const isWhitelisted = currentDomain && whitelist.some(d => currentDomain.includes(d));

      if (!isEnabled) {
        statusBanner.className = 'status-banner disabled';
        statusText.textContent = 'AdBlocker Desactivado Globalmente';
      } else if (isWhitelisted) {
        statusBanner.className = 'status-banner disabled';
        statusText.textContent = `Pausado en ${currentDomain}`;
      } else {
        statusBanner.className = 'status-banner';
        if (currentDomain.includes('youtube.com')) {
          statusText.textContent = 'Protección Activa en YouTube (Turbo)';
        } else {
          statusText.textContent = currentDomain ? `Protección Activa en ${currentDomain}` : 'Protección Activa';
        }
      }

      if (whitelistBtnText) {
        if (isWhitelisted) {
          whitelistBtnText.textContent = `Reactivar en ${currentDomain || 'este sitio'}`;
        } else {
          whitelistBtnText.textContent = `Desactivar en ${currentDomain || 'este sitio'}`;
        }
      }
    });
  }

  // Get active tab details
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      currentTabId = tabs[0].id;
      try {
        const url = new URL(tabs[0].url);
        currentDomain = url.hostname;
      } catch (e) {
        currentDomain = '';
      }
    }
    refreshUI();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.blockedTotal || changes.blockedToday || changes.blockedYouTube)) {
      refreshUI();
    }
  });

  // Toggle Master Switch
  masterToggle.addEventListener('change', () => {
    const val = masterToggle.checked;
    chrome.storage.local.set({ enabled: val }, () => {
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
      refreshUI();
    });
  });

  // Toggle YouTube Turbo
  ytTurboToggle.addEventListener('change', () => {
    chrome.storage.local.set({ ytTurboSkip: ytTurboToggle.checked }, () => {
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  });

  // Toggle YouTube Auto Mute
  ytMuteToggle.addEventListener('change', () => {
    chrome.storage.local.set({ ytAutoMute: ytMuteToggle.checked }, () => {
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  });

  // Toggle Site Whitelist Button
  btnToggleWhitelist.addEventListener('click', () => {
    if (!currentDomain) return;
    chrome.runtime.sendMessage({ type: 'TOGGLE_WHITELIST_DOMAIN', domain: currentDomain }, () => {
      refreshUI();
    });
  });

  // Element Picker Launcher
  btnElementPicker.addEventListener('click', () => {
    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, { type: 'START_ELEMENT_PICKER' }, (res) => {
        window.close();
      });
    }
  });

  // Open Options Dashboard
  btnOpenOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
