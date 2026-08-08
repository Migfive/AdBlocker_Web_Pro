#!/usr/bin/env python3
import sys
import os
import json
from colorama import Fore, Style, init

init(autoreset=True)

def show_help():
    print(f"{Fore.CYAN}=== AdBlocker Pro CLI Manager ==={Style.RESET_ALL}")
    print("Uso: ./venv/bin/python3 scripts/manage.py [comando]\n")
    print("Comandos disponibles:")
    print(f"  {Fore.GREEN}compile{Style.RESET_ALL}   - Compila rules.json desde los patrones de red de Manifest V3.")
    print(f"  {Fore.GREEN}status{Style.RESET_ALL}    - Verifica la integridad del manifest.json y reglas.")
    print(f"  {Fore.GREEN}analyze{Style.RESET_ALL}   - Simula la eliminación de parámetros de anuncios en YouTube.")
    print(f"  {Fore.GREEN}test{Style.RESET_ALL}      - Inicia el servidor de pruebas local en http://localhost:8085.")
    print(f"  {Fore.GREEN}help{Style.RESET_ALL}      - Muestra esta ayuda.")

def check_status():
    print(f"{Fore.CYAN}[Estado del Proyecto]{Style.RESET_ALL}")
    if os.path.exists("manifest.json"):
        with open("manifest.json", "r") as f:
            manifest = json.load(f)
            print(f" ✔ Manifest Version: {manifest.get('manifest_version')} ({manifest.get('name')} v{manifest.get('version')})")
    else:
        print(f" ❌ manifest.json no encontrado")

    if os.path.exists("rules.json"):
        with open("rules.json", "r") as f:
            rules = json.load(f)
            print(f" ✔ Rules declarativeNetRequest: {len(rules)} reglas activas en rules.json")
    else:
        print(f" ❌ rules.json no encontrado")

    if os.path.exists("venv"):
        print(f" ✔ Entorno Virtual Python: './venv' Activo")

def main():
    if len(sys.argv) < 2:
        show_help()
        return

    cmd = sys.argv[1].lower()
    if cmd == "compile":
        import compile_rules
        compile_rules.compile_rules()
    elif cmd == "status":
        check_status()
    elif cmd == "analyze":
        import youtube_analyzer
        youtube_analyzer.main()
    elif cmd == "test":
        import test_server
        test_server.run_server()
    else:
        show_help()

if __name__ == "__main__":
    main()
