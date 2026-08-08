#!/usr/bin/env python3
import json
import os
import re
import sys
from colorama import Fore, Style, init

init(autoreset=True)

# Common Ad & Tracker domains for network ruleset
BASE_RULES_PATTERNS = [
    ("youtube.com/pagead/*", ["script", "xmlhttprequest", "image", "other", "sub_frame"]),
    ("youtube.com/ptracking*", ["script", "xmlhttprequest", "other"]),
    ("youtube.com/api/stats/ads*", ["script", "xmlhttprequest", "other"]),
    ("youtube.com/get_midroll_info*", ["xmlhttprequest", "other"]),
    ("doubleclick.net/*", ["script", "xmlhttprequest", "image", "sub_frame", "other"]),
    ("googlesyndication.com/*", ["script", "xmlhttprequest", "image", "sub_frame", "other"]),
    ("googleadservices.com/*", ["script", "xmlhttprequest", "image", "sub_frame", "other"]),
    ("adnxs.com/*", ["script", "xmlhttprequest", "image", "sub_frame"]),
    ("popads.net/*", ["script", "xmlhttprequest", "sub_frame"]),
    ("popcash.net/*", ["script", "xmlhttprequest", "sub_frame"]),
    ("taboola.com/*", ["script", "xmlhttprequest", "image", "sub_frame"]),
    ("outbrain.com/*", ["script", "xmlhttprequest", "image", "sub_frame"]),
    ("criteo.com/*", ["script", "xmlhttprequest", "image", "sub_frame"]),
    ("rubiconproject.com/*", ["script", "xmlhttprequest", "image", "sub_frame"]),
    ("pubmatic.com/*", ["script", "xmlhttprequest", "image", "sub_frame"]),
    ("openx.net/*", ["script", "xmlhttprequest", "image", "sub_frame"]),
    ("exoclick.com/*", ["script", "xmlhttprequest", "sub_frame"]),
    ("trafficjunkie.com/*", ["script", "xmlhttprequest", "sub_frame"])
]

def compile_rules(output_path="rules.json"):
    print(f"{Fore.CYAN}[AdBlocker Pro Compiler]{Style.RESET_ALL} Compilando reglas para Manifest V3 declarativeNetRequest...")
    
    rules = []
    for idx, (pattern, resource_types) in enumerate(BASE_RULES_PATTERNS, start=1):
        rule = {
            "id": idx,
            "priority": 1,
            "action": { "type": "block" },
            "condition": {
                "urlFilter": f"||{pattern}",
                "resourceTypes": resource_types
            }
        }
        rules.append(rule)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(rules, f, indent=2)

    print(f"{Fore.GREEN}✔ Se generaron {len(rules)} reglas en '{output_path}' correctamente.{Style.RESET_ALL}")

if __name__ == "__main__":
    compile_rules()
