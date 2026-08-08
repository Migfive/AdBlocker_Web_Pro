#!/usr/bin/env python3
import http.server
import socketserver
from colorama import Fore, Style, init

init(autoreset=True)

PORT = 8085

HTML_CONTENT = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Página de Pruebas de AdBlocker Pro & YouTube Skip</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #fff; padding: 40px; text-align: center; }
    .card { background: #1e293b; border-radius: 16px; padding: 24px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .ad-banner { background: #ef4444; color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .adsbygoogle { background: #f59e0b; color: #000; padding: 15px; border-radius: 8px; margin: 15px 0; }
    h1 { color: #38bdf8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎯 Servidor de Pruebas de AdBlocker Pro</h1>
    <p>Esta página simula elementos publicitarios y reproductores para probar la extensión.</p>

    <!-- Ad Unit 1 -->
    <div class="adsbygoogle">
      [Anuncio Simulado Google AdSense (.adsbygoogle)]
    </div>

    <!-- Ad Unit 2 -->
    <div class="ad-banner">
      [Banner Publicitario Estándar (.ad-banner)]
    </div>

    <p style="color: #94a3b8; font-size: 14px;">Si la extensión está activa, los contenedores publicitarios superiores deben ser ocultados automáticamente mediante filtros cosméticos.</p>
  </div>
</body>
</html>
"""

class TestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(HTML_CONTENT.encode("utf-8"))

def run_server():
    print(f"{Fore.CYAN}=== AdBlocker Pro Test Server ==={Style.RESET_ALL}")
    print(f"{Fore.GREEN}Iniciando servidor local en: http://localhost:{PORT}{Style.RESET_ALL}")
    print("Presiona Ctrl+C para detener el servidor.\n")
    
    with socketserver.TCPServer(("", PORT), TestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n{Fore.YELLOW}Servidor detenido.{Style.RESET_ALL}")

if __name__ == "__main__":
    run_server()
