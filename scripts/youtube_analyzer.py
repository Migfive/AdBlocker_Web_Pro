#!/usr/bin/env python3
import json
from colorama import Fore, Style, init

init(autoreset=True)

MOCK_YOUTUBE_PLAYER_RESPONSE = {
    "responseContext": {
        "visitorData": "CgtWR1ZTWlRReTFxSSi..."
    },
    "playabilityStatus": {
        "status": "OK"
    },
    "adPlacements": [
        {
            "adPlacementRenderer": {
                "config": { "adTimeOffsetMilliseconds": "0" }
            }
        }
    ],
    "playerAds": [
        {
            "playerLegacyDesktopWatchAdsRenderer": {
                "playerAdParams": { "showCompanion": "true" }
            }
        }
    ],
    "videoDetails": {
        "videoId": "dQw4w9WgXcQ",
        "title": "AdBlocker Test Video"
    }
}

def sanitize_ad_keys(data):
    """Demuestra cómo el inyector de JS en Python elimina los objetos de anuncios."""
    if isinstance(data, dict):
        cleaned = {}
        for k, v in data.items():
            if k in ["adPlacements", "playerAds", "adSlots", "ad3dp"]:
                print(f"{Fore.YELLOW}[FILTRADO] Eliminando clave de anuncios: {k}{Style.RESET_ALL}")
                continue
            cleaned[k] = sanitize_ad_keys(v)
        return cleaned
    elif isinstance(data, list):
        return [sanitize_ad_keys(item) for item in data]
    return data

def main():
    print(f"{Fore.CYAN}=== YouTube Ad Response Analyzer (Python Tool) ==={Style.RESET_ALL}\n")
    print(f"{Fore.WHITE}Objeto Original (Simulado de YouTube):{Style.RESET_ALL}")
    print(json.dumps(MOCK_YOUTUBE_PLAYER_RESPONSE, indent=2))
    
    print("\n--- Ejecutando Limpieza de Anuncios ---\n")
    result = sanitize_ad_keys(MOCK_YOUTUBE_PLAYER_RESPONSE)
    
    print(f"\n{Fore.GREEN}Resultado Sanitizado (Sin Anuncios):{Style.RESET_ALL}")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
