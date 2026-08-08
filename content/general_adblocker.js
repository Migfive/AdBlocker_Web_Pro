(function() {
  'use strict';

  let config = {
    enabled: true,
    cosmeticFiltering: true,
    antiAdblockBypass: true,
    whitelist: [],
    customRules: []
  };

  const hostname = window.location.hostname;

  // Load config
  function loadConfig() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['enabled', 'cosmeticFiltering', 'antiAdblockBypass', 'whitelist', 'customRules'], (res) => {
        if (res.enabled !== undefined) config.enabled = res.enabled;
        if (res.cosmeticFiltering !== undefined) config.cosmeticFiltering = res.cosmeticFiltering;
        if (res.antiAdblockBypass !== undefined) config.antiAdblockBypass = res.antiAdblockBypass;
        if (res.whitelist && Array.isArray(res.whitelist)) config.whitelist = res.whitelist;
        if (res.customRules && Array.isArray(res.customRules)) config.customRules = res.customRules;

        if (config.whitelist.some(domain => domain && hostname.includes(domain))) {
          config.enabled = false;
        }

        applyCosmeticFilters();
      });
    }
  }

  loadConfig();

  // Listen for config updates
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'SETTINGS_UPDATED') {
        loadConfig();
      } else if (msg.type === 'START_ELEMENT_PICKER') {
        initElementPicker();
        sendResponse({ status: 'started' });
      }
    });
  }

  // Common Ad Selectors
  const adSelectors = [
    '.adsbygoogle',
    'ins.adsbygoogle',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googleads"]',
    'iframe[src*="googlesyndication"]',
    'div[id^="google_ads_iframe"]',
    'div[id^="div-gpt-ad"]',
    'div[class*="ad-container"]',
    'div[class*="ad-wrapper"]',
    'div[class*="ad-banner"]',
    'div[class*="sponsor-container"]',
    'div[id*="ad-slot"]',
    '.taboola-placeholder',
    '.outbrain-template',
    '#ezoic-pub-ad-placeholder',
    'div[data-ad-client]'
  ];

  function applyCosmeticFilters() {
    if (!config.enabled || !config.cosmeticFiltering) return;

    let styleEl = document.getElementById('adblocker-pro-cosmetic');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'adblocker-pro-cosmetic';
      (document.head || document.documentElement).appendChild(styleEl);
    }

    let css = adSelectors.join(',\n') + ' { display: none !important; visibility: hidden !important; height: 0 !important; opacity: 0 !important; pointer-events: none !important; }\n';

    // Apply custom rules for current domain or global
    if (config.customRules && config.customRules.length > 0) {
      config.customRules.forEach(rule => {
        if (rule.type === 'hide') {
          if (!rule.domain || hostname.includes(rule.domain)) {
            css += `${rule.selector} { display: none !important; visibility: hidden !important; }\n`;
          }
        }
      });
    }

    styleEl.textContent = css;
  }

  // Anti-Adblock Overlay Remover
  function removeAntiAdblockPopups() {
    if (!config.enabled || !config.antiAdblockBypass) return;

    const modalKeywords = ['adblock', 'bloqueador', 'desactiva', 'disable adblock', 'ad blocker'];
    const popups = document.querySelectorAll('div[class*="modal"], div[class*="overlay"], div[class*="popup"], div[id*="adblock"]');

    popups.forEach(el => {
      const text = el.innerText ? el.innerText.toLowerCase() : '';
      if (modalKeywords.some(kw => text.includes(kw)) && text.length < 1000) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        document.body.style.setProperty('overflow', 'auto', 'important');
        document.documentElement.style.setProperty('overflow', 'auto', 'important');
      }
    });
  }

  setInterval(removeAntiAdblockPopups, 1000);

  // Element Picker Tool Implementation
  let pickerActive = false;
  let highlightedEl = null;
  let overlayEl = null;

  function initElementPicker() {
    if (pickerActive) return;
    pickerActive = true;

    // Create selection badge notification
    overlayEl = document.createElement('div');
    overlayEl.id = 'adblocker-picker-banner';
    overlayEl.innerHTML = `
      <div style="position:fixed; top:12px; left:50%; transform:translateX(-50%); z-index:2147483647; background:#0f172a; color:#38bdf8; border:2px solid #38bdf8; border-radius:12px; padding:10px 20px; font-family:sans-serif; font-size:14px; font-weight:600; box-shadow:0 10px 25px rgba(0,0,0,0.5); display:flex; align-items:center; gap:12px;">
        <span>🎯 Selector de Elementos: Haz clic en cualquier anuncio para bloquearlo.</span>
        <button id="adblocker-cancel-picker" style="background:#ef4444; color:#fff; border:none; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px;">Cancelar (Esc)</button>
      </div>
    `;
    document.body.appendChild(overlayEl);

    document.getElementById('adblocker-cancel-picker').addEventListener('click', stopElementPicker);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
  }

  function handleMouseMove(e) {
    if (!pickerActive) return;
    const target = e.target;
    if (target.closest('#adblocker-picker-banner')) return;

    if (highlightedEl && highlightedEl !== target) {
      highlightedEl.style.outline = highlightedEl.dataset.prevOutline || '';
    }

    highlightedEl = target;
    highlightedEl.dataset.prevOutline = highlightedEl.style.outline || '';
    highlightedEl.style.outline = '3px solid #ef4444';
  }

  function handleClick(e) {
    if (!pickerActive || !highlightedEl) return;
    if (e.target.closest('#adblocker-picker-banner')) return;

    e.preventDefault();
    e.stopPropagation();

    const selector = generateSelector(highlightedEl);
    
    // Save to custom rules
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['customRules'], (res) => {
        const rules = res.customRules || [];
        rules.push({
          domain: hostname,
          selector: selector,
          type: 'hide',
          date: new Date().toISOString()
        });
        chrome.storage.local.set({ customRules: rules }, () => {
          loadConfig();
          stopElementPicker();
          alert(`¡Elemento bloqueado!\nRegla añadida: ${selector}`);
        });
      });
    } else {
      stopElementPicker();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      stopElementPicker();
    }
  }

  function stopElementPicker() {
    pickerActive = false;
    if (highlightedEl) {
      highlightedEl.style.outline = highlightedEl.dataset.prevOutline || '';
    }
    if (overlayEl) {
      overlayEl.remove();
    }
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
  }

  function generateSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).filter(c => c && !c.includes(':')).slice(0, 2);
      if (classes.length > 0) return `${el.tagName.toLowerCase()}.${classes.join('.')}`;
    }
    return el.tagName.toLowerCase();
  }

  console.log('[AdBlocker Pro] General Cosmetic Engine Active');
})();
