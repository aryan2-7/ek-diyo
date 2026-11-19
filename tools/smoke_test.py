"""Boots every scene of the production build in a headless browser and fails on any console error.

    npm run build
    pip install playwright && playwright install chromium
    npm run smoke

It uses software WebGL, so it is slow (about 10 s per scene) but needs no GPU. Run it after editing scenes.
"""
import functools
import http.server
import socketserver
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

DIST = Path(__file__).resolve().parent.parent / 'dist'
PORT = 4199
WAIT_MS = 9000
SCENES = (
    ['?quality=low']
    + [f'?quality=low&night={n}' for n in range(1, 6)]
    + [f'?quality=low&card={n}' for n in range(0, 6)]
    + ['?quality=low&scene=Ending']
)
IGNORE = ('GPU stall', 'GL Driver Message', 'Phaser v3', 'favicon', 'AudioContext was not allowed')  # harmless software-GL noise and the Phaser banner


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    if not (DIST / 'index.html').exists():
        sys.exit('dist/ not found: run "npm run build" first')
    handler = functools.partial(Quiet, directory=str(DIST))
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    failures = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for q in SCENES:
            page = browser.new_page(viewport={'width': 1280, 'height': 720})
            errors = []
            page.on('console', lambda m, e=errors: m.type in ('error', 'warning') and not any(s in m.text for s in IGNORE) and e.append(f'[{m.type}] {m.text}'))
            page.on('pageerror', lambda err, e=errors: e.append(f'[pageerror] {err}'))
            page.on('requestfailed', lambda r, e=errors: e.append(f'[request failed] {r.url}'))
            page.goto(f'http://127.0.0.1:{PORT}/{q}', wait_until='load')
            page.wait_for_timeout(WAIT_MS)
            page.close()
            print(('FAIL ' if errors else 'ok   ') + q)
            for e in errors:
                print('      ' + e)
            failures += bool(errors)
        browser.close()
    httpd.shutdown()
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
