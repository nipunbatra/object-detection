"""Serve the lecture locally without caching, so edits to content.js show on reload.

    python3 scripts/serve.py            # http://127.0.0.1:8780/
    python3 scripts/serve.py --port 9000
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8780)
    a = ap.parse_args()
    print(f'http://127.0.0.1:{a.port}/')
    ThreadingHTTPServer(('127.0.0.1', a.port), partial(NoCache, directory=str(ROOT))).serve_forever()
