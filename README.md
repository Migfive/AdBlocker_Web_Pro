# WSL AdBlocker

## Description

`WSL AdBlocker` is a Chrome/Edge extension built with Manifest V3 to block ads on YouTube and across the web. It offers video ad detection and removal, fast YouTube ad skipping, automatic muting, and cosmetic filters to hide banners and popups.

## Key Features

- YouTube ad blocking with fast skip and automatic mute.
- Overlay and anti-adblock popup removal on websites.
- Cosmetic filters to hide ad banners and intrusive elements.
- Domain whitelist support to pause blocking on trusted sites.
- Element picker tool for manual ad blocking.
- Internal statistics for blocked ads per day and YouTube.

## Project Structure

### `manifest.json`
Defines the extension permissions, background service worker, content scripts, and accessible resources. It includes:
- Declarative network request permissions (`declarativeNetRequest`).
- Tabs, storage, scripting, and context menu access.
- Content scripts for YouTube and global pages.

### `background.js`
The service worker that:
- Initializes settings and defaults on install.
- Manages the whitelist and reloads tabs when changed.
- Handles messages from content scripts to update statistics and apply settings.
- Creates context menu items for blocking elements and toggling site whitelist.

### `content/yt_adblocker.js`
YouTube-focused content script:
- Applies CSS rules to hide overlays and visual ad elements.
- Detects ads using player classes and skip button selectors.
- Skips ads only on actual playback pages like `/watch` and `/shorts`.
- Automatically mutes and restores audio after ads.
- Sends ad block events to the background script.

### `content/yt_injector.js`
Intercepts YouTube API responses to remove ad-related payloads before the player processes them. This helps prevent the player from receiving ad data.

### `content/general_adblocker.js`
Global content script for any website:
- Applies cosmetic filters to hide common ad containers.
- Detects and removes anti-adblock popups.
- Provides an element picker tool for manual blocking.
- Loads saved custom rules by domain.

### `rules.json`
Initial `declarativeNetRequest` rule set for blocking ad resources on multiple websites.

### `popup/` and `options/`
User interface components:
- `popup/popup.html`, `popup/popup.js`, `popup/popup.css`: quick status panel and toggles.
- `options/options.html`, `options/options.js`, `options/options.css`: advanced settings page.

### `scripts/`
Development and asset generation utilities:
- `compile_rules.py`: likely compiles adblock rules into compatible formats.
- `generate_icons.py`: creates project icons.
- `manage.py`, `test_server.py`, `youtube_analyzer.py`: additional development tools.

## Installation

1. Open Chrome or Edge and go to `chrome://extensions` or `edge://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked" and select the `wsl_adblocker` folder.
4. Make sure the extension has permission to run on YouTube and the desired sites.

## Usage

- On YouTube, the extension blocks ads during actual playback pages.
- On other websites, it hides banners and removes anti-adblock popups.
- Use the context menu to block a selected element or pause blocking on the current domain.
- Adjust settings from the options page.

## Notes

- This project uses `Manifest V3`, so the background script runs as a `service_worker`.
- YouTube selectors may change over time, which could require updates.
- For testing, enable Developer mode and inspect the extension console.

## License

Add a license if you want to publish this repository. Otherwise, note that this is personal or experimental software.

