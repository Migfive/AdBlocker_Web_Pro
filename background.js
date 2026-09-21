// Service Worker - Background Script (Manifest V3)

// Initialize Default Settings on Install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get([
    'enabled', 'ytTurboSkip', 'ytAutoMute', 'ytRemoveOverlays',
    'cosmeticFiltering', 'antiAdblockBypass', 'whitelist', 'customRules'
  ], (res) => {
    const defaults = {
      enabled: res.enabled !== undefined ? res.enabled : true,
      ytTurboSkip: res.ytTurboSkip !== undefined ? res.ytTurboSkip : true,
      ytAutoMute: res.ytAutoMute !== undefined ? res.ytAutoMute : true,
      ytRemoveOverlays: res.ytRemoveOverlays !== undefined ? res.ytRemoveOverlays : true,
      cosmeticFiltering: res.cosmeticFiltering !== undefined ? res.cosmeticFiltering : true,
      antiAdblockBypass: res.antiAdblockBypass !== undefined ? res.antiAdblockBypass : true,
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_WHITELIST_DOMAIN') {
    toggleWhitelistDomain(message.domain, sender.tab ? sender.tab.id : null);
    sendResponse({ status: 'toggled' });
  } else if (message.type === 'SETTINGS_UPDATED') {
    notifyAllTabs();
    sendResponse({ status: 'notified' });
  }
  return true;
});

console.log('[AdBlocker Pro] Background Service Worker Loaded.');
 