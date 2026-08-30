import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / "manifest.json"
JS_FILES = [
    ROOT / "background.js",
    ROOT / "content" / "yt_adblocker.js",
    ROOT / "content" / "yt_injector.js",
    ROOT / "content" / "general_adblocker.js",
    ROOT / "popup" / "popup.js",
    ROOT / "options" / "options.js",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


class ManifestSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        cls.permissions = cls.manifest.get("permissions", [])
        cls.host_permissions = cls.manifest.get("host_permissions", [])

    def test_manifest_has_minimal_permissions(self):
        forbidden_permissions = {
            "scripting",
            "activeTab",
            "declarativeNetRequestWithHostAccess",
        }
        forbidden_host_permissions = {"<all_urls>"}

        self.assertTrue(set(self.permissions).isdisjoint(forbidden_permissions))
        self.assertTrue(set(self.host_permissions).isdisjoint(forbidden_host_permissions))

    def test_manifest_version_is_updated(self):
        self.assertGreaterEqual(self.manifest.get("version", "0.0.0"), "1.0.1")


class CodeSecurityTests(unittest.TestCase):
    def test_no_dynamic_script_injection_api_is_used(self):
        patterns = [
            r"chrome\.scripting",
            r"browser\.scripting",
            r"executeScript\s*\(",
            r"insertCSS\s*\(",
            r"registerContentScripts\s*\(",
        ]
        combined = "\n".join(read_text(path) for path in JS_FILES)
        for pattern in patterns:
            self.assertNotRegex(combined, pattern, msg=f"Dynamic script injection pattern detected: {pattern}")

    def test_no_dangerous_code_execution_vectors(self):
        dangerous_patterns = [
            r"eval\s*\(",
            r"new\s+Function\s*\(",
            r"document\.write\s*\(",
            r"innerHTML\s*=\s*.*(chrome|fetch|localStorage|sessionStorage|document\.|window\.)",
        ]
        combined = "\n".join(read_text(path) for path in JS_FILES)
        for pattern in dangerous_patterns:
            self.assertNotRegex(combined, pattern, msg=f"Dangerous execution pattern detected: {pattern}")

    def test_no_browser_storage_exfiltration_vectors(self):
        combined = "\n".join(read_text(path) for path in JS_FILES)
        self.assertNotIn("sessionStorage", combined)
        self.assertNotIn("chrome.cookies", combined)

    def test_main_world_tracking_protection_does_not_touch_cookies(self):
        injector = read_text(ROOT / "content" / "yt_injector.js")

        self.assertIn("installAntiAdblockTrackingProtection", injector)
        self.assertIn("Object.defineProperty(storage, 'setItem'", injector)
        self.assertIn("storage.removeItem(key)", injector)
        self.assertIn("navigator.sendBeacon", injector)
        self.assertNotIn("document.cookie", injector)

    def test_no_direct_user_data_transmission_to_external_services(self):
        combined = "\n".join(read_text(path) for path in JS_FILES)
        suspicious = [
            "fetch('https",
            "fetch(\"https",
            "XMLHttpRequest",
        ]
        for item in suspicious:
            self.assertNotIn(item, combined)

    def test_content_scripts_do_not_overreach_into_external_browser_state(self):
        combined = "\n".join(read_text(path) for path in JS_FILES)
        # This extension intentionally reads local storage and tabs state only; it must not capture tokens or cookies.
        self.assertNotIn("document.cookie", combined)
        self.assertNotIn("chrome.cookies", combined)


class CounterIntegrationTests(unittest.TestCase):
    def test_content_scripts_report_blocked_ads_by_category(self):
        youtube = read_text(ROOT / "content" / "yt_adblocker.js")
        web = read_text(ROOT / "content" / "general_adblocker.js")

        self.assertIn("type: 'AD_BLOCKED', category: 'youtube'", youtube)
        self.assertIn("type: 'AD_BLOCKED', category: 'web'", web)
        self.assertIn("element.dataset.adblockerCounted", web)

    def test_background_persists_total_and_popup_reads_it(self):
        background = read_text(ROOT / "background.js")
        popup = read_text(ROOT / "popup" / "popup.js")
        popup_html = read_text(ROOT / "popup" / "popup.html")

        self.assertIn("blockedTotal: newTotal", background)
        self.assertIn("res.blockedTotal", popup)
        self.assertIn('id="ads-blocked-count"', popup_html)

    def test_youtube_enforcement_modal_fallback_is_present(self):
        youtube = read_text(ROOT / "content" / "yt_adblocker.js")

        self.assertIn("ytd-enforcement-message-view-model", youtube)
        self.assertIn("tp-yt-paper-dialog", youtube)
        self.assertIn("new MutationObserver", youtube)
        self.assertIn("modal.remove()", youtube)
        self.assertIn("video.play().catch", youtube)


if __name__ == "__main__":
    unittest.main(verbosity=2)
