document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  const navItems = document.querySelectorAll('.nav-item');
  const tabPages = document.querySelectorAll('.tab-page');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      navItems.forEach(n => n.classList.remove('active'));
      tabPages.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // UI Elements
  const dashToday = document.getElementById('dashToday');
  const dashYouTube = document.getElementById('dashYouTube');
  const dashTotal = document.getElementById('dashTotal');
  const dashTime = document.getElementById('dashTime');

  const optYtTurbo = document.getElementById('optYtTurbo');
  const optYtMute = document.getElementById('optYtMute');
  const optYtOverlays = document.getElementById('optYtOverlays');
  const optCosmetic = document.getElementById('optCosmetic');
  const optAntiAdblock = document.getElementById('optAntiAdblock');

  const inputWhitelist = document.getElementById('inputWhitelist');
  const btnAddWhitelist = document.getElementById('btnAddWhitelist');
  const whitelistContainer = document.getElementById('whitelistContainer');
  const customRulesList = document.getElementById('customRulesList');

  // Load Settings and Stats
  function loadSettings() {
    chrome.storage.local.get([
      'enabled', 'ytTurboSkip', 'ytAutoMute', 'ytRemoveOverlays',
      'cosmeticFiltering', 'antiAdblockBypass', 'blockedToday',
      'blockedTotal', 'blockedYouTube', 'whitelist', 'customRules'
    ], (res) => {
      const today = res.blockedToday || 0;
      const yt = res.blockedYouTube || 0;
      const total = res.blockedTotal || 0;
      const timeSecs = (yt * 6) + (today * 2);

      dashToday.textContent = today.toLocaleString();
      dashYouTube.textContent = yt.toLocaleString();
      dashTotal.textContent = total.toLocaleString();
      dashTime.textContent = `${Math.floor(timeSecs / 60)} min`;

      optYtTurbo.checked = res.ytTurboSkip !== undefined ? res.ytTurboSkip : true;
      optYtMute.checked = res.ytAutoMute !== undefined ? res.ytAutoMute : true;
      optYtOverlays.checked = res.ytRemoveOverlays !== undefined ? res.ytRemoveOverlays : true;
      optCosmetic.checked = res.cosmeticFiltering !== undefined ? res.cosmeticFiltering : true;
      optAntiAdblock.checked = res.antiAdblockBypass !== undefined ? res.antiAdblockBypass : true;

      renderWhitelist(res.whitelist || []);
      renderCustomRules(res.customRules || []);
    });
  }

  // Save option changes helper
  function saveOption(key, value) {
    const data = {};
    data[key] = value;
    chrome.storage.local.set(data, () => {
      chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });
  }

  optYtTurbo.addEventListener('change', () => saveOption('ytTurboSkip', optYtTurbo.checked));
  optYtMute.addEventListener('change', () => saveOption('ytAutoMute', optYtMute.checked));
  optYtOverlays.addEventListener('change', () => saveOption('ytRemoveOverlays', optYtOverlays.checked));
  optCosmetic.addEventListener('change', () => saveOption('cosmeticFiltering', optCosmetic.checked));
  optAntiAdblock.addEventListener('change', () => saveOption('antiAdblockBypass', optAntiAdblock.checked));

  // Whitelist Logic
  function renderWhitelist(list) {
    whitelistContainer.innerHTML = '';
    if (list.length === 0) {
      whitelistContainer.innerHTML = '<span style="color:var(--text-muted); font-size:13px;">No hay dominios en la lista blanca.</span>';
      return;
    }

    list.forEach(domain => {
      const tag = document.createElement('div');
      tag.className = 'whitelist-tag';
      tag.innerHTML = `
        <span>${domain}</span>
        <span class="remove-btn" title="Eliminar">&times;</span>
      `;
      tag.querySelector('.remove-btn').addEventListener('click', () => {
        removeWhitelistDomain(domain);
      });
      whitelistContainer.appendChild(tag);
    });
  }

  function addWhitelistDomain() {
    const domain = inputWhitelist.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain) return;

    chrome.storage.local.get(['whitelist'], (res) => {
      const whitelist = res.whitelist || [];
      if (!whitelist.includes(domain)) {
        whitelist.push(domain);
        chrome.storage.local.set({ whitelist: whitelist }, () => {
          inputWhitelist.value = '';
          loadSettings();
          chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
        });
      }
    });
  }

  function removeWhitelistDomain(domain) {
    chrome.storage.local.get(['whitelist'], (res) => {
      let whitelist = res.whitelist || [];
      whitelist = whitelist.filter(d => d !== domain);
      chrome.storage.local.set({ whitelist: whitelist }, () => {
        loadSettings();
        chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
      });
    });
  }

  btnAddWhitelist.addEventListener('click', addWhitelistDomain);
  inputWhitelist.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addWhitelistDomain();
  });

  // Custom Rules Logic
  function renderCustomRules(rules) {
    customRulesList.innerHTML = '';
    if (rules.length === 0) {
      customRulesList.innerHTML = '<span style="color:var(--text-muted); font-size:13px;">No se han añadido reglas personalizadas con el selector de elementos.</span>';
      return;
    }

    rules.forEach((rule, idx) => {
      const item = document.createElement('div');
      item.className = 'rule-item';
      item.innerHTML = `
        <div>
          <strong style="color:var(--accent-cyan)">[${rule.domain}]</strong> ${rule.selector}
        </div>
        <span class="remove-btn" style="color:var(--accent-red); cursor:pointer; font-weight:bold;" title="Eliminar">&times;</span>
      `;
      item.querySelector('.remove-btn').addEventListener('click', () => {
        rules.splice(idx, 1);
        chrome.storage.local.set({ customRules: rules }, () => {
          loadSettings();
          chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
        });
      });
      customRulesList.appendChild(item);
    });
  }

  loadSettings();
});
