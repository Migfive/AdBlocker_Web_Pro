// Service Worker - Background Script (Manifest V3)

// Initialize Default Settings on Install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get([
    'enabled', 'ytTurboSkip', 'ytAutoMute', 'ytRemoveOverlays',
    'cosmeticFiltering', 'antiAdblockBypass', 'blockedToday',
    'blockedTotal', 'blockedYouTube', 'whitelist', 'customRules', 'lastResetDate'
  ], (res) => {
    const today = new Date().toISOString().split('T')[0];
    const defaults = {
      enabled: res.enabled !== undefined ? res.enabled : true,
      ytTurboSkip: res.ytTurboSkip !== undefined ? res.ytTurboSkip : true,
      ytAutoMute: res.ytAutoMute !== undefined ? res.ytAutoMute : true,
      ytRemoveOverlays: res.ytRemoveOverlays !== undefined ? res.ytRemoveOverlays : true,
      cosmeticFiltering: res.cosmeticFiltering !== undefined ? res.cosmeticFiltering : true,
      antiAdblockBypass: res.antiAdblockBypass !== undefined ? res.antiAdblockBypass : true,
      blockedToday: res.lastResetDate === today ? (res.blockedToday || 0) : 0,
      blockedTotal: res.blockedTotal || 0,
      blockedYouTube: res.blockedYouTube || 0,
      lastResetDate: today,
      whitelist: res.whitelist || [],
      customRules: res.customRules || []
    };
    chrome.storage.local.set(defaults);
  });

  // Create Context Menus
  chrome.contextMenus.create({
    id: 'block_element',
    title: '🎯 Bloquear elemento con AdBlocker',
    contexts: ['all']
  });

  chrome.contextMenus.create({
    id: 'toggle_site_whitelist',
    title: '🛡️ Pausar AdBlocker en este sitio',
    contexts: ['all']
  });
});

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'block_element' && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'START_ELEMENT_PICKER' });
  } else if (info.menuItemId === 'toggle_site_whitelist' && tab && tab.url) {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      toggleWhitelistDomain(domain, tab.id);
    } catch (e) {
      console.error('Invalid URL for context menu whitelist toggle:', e);
    }
  }
});

// Toggle domain whitelist helper
function toggleWhitelistDomain(domain, tabId) {
  chrome.storage.local.get(['whitelist'], (res) => {
    let whitelist = res.whitelist || [];
    if (whitelist.includes(domain)) {
      whitelist = whitelist.filter(d => d !== domain);
    } else {
      whitelist.push(domain);
    }
    chrome.storage.local.set({ whitelist: whitelist }, () => {
      notifyAllTabs();
      if (tabId) {
        chrome.tabs.reload(tabId);
      }
    });
  });
}

// Notify Content Scripts of setting changes
function notifyAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }).catch(() => {});
      }
    });
  });
}

// Handle Messages from Content Scripts and Popup
let statsUpdateQueue = Promise.resolve();

function recordBlockedAd(category, tabId, sendResponse) {
  statsUpdateQueue = statsUpdateQueue.then(() => new Promise((resolve) => {
    const today = new Date().toISOString().split('T')[0];
    chrome.storage.local.get(['blockedToday', 'blockedTotal', 'blockedYouTube', 'lastResetDate'], (res) => {
      const isNewDay = res.lastResetDate !== today;
      const newToday = isNewDay ? 1 : (res.blockedToday || 0) + 1;
      const newTotal = (res.blockedTotal || 0) + 1;
      const newYT = category === 'youtube' ? ((res.blockedYouTube || 0) + 1) : (res.blockedYouTube || 0);

      chrome.storage.local.set({
        blockedToday: newToday,
        blockedTotal: newTotal,
        blockedYouTube: newYT,
        lastResetDate: today
      }, () => {
        if (tabId) updateBadge(tabId, newToday);
        sendResponse({ status: 'updated', blockedTotal: newTotal });
        resolve();
      });
    });
  })).catch(() => {
    sendResponse({ status: 'error' });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AD_BLOCKED') {
    recordBlockedAd(message.category, sender.tab ? sender.tab.id : null, sendResponse);
  } else if (message.type === 'TOGGLE_WHITELIST_DOMAIN') {
    toggleWhitelistDomain(message.domain, sender.tab ? sender.tab.id : null);
    sendResponse({ status: 'toggled' });
  } else if (message.type === 'SETTINGS_UPDATED') {
    notifyAllTabs();
    sendResponse({ status: 'notified' });
  }
  return true;
});

// Badge update helper
function updateBadge(tabId, count) {
  chrome.action.setBadgeBackgroundColor({ color: '#0284c7', tabId: tabId });
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '', tabId: tabId });
}

console.log('[AdBlocker Pro] Background Service Worker Loaded.');
 