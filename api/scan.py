import os
import sys
import json
import asyncio
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '_lib'))
from cryptorank import CryptoRankScraper
from database import Database


def get_db():
    url = os.environ.get('SUPABASE_URL') or os.environ.get('VITE_SUPABASE_URL', '')
    key = os.environ.get('SUPABASE_ANON_KEY') or os.environ.get('VITE_SUPABASE_ANON_KEY', '')
    if not url or not key:
        return None
    return Database(url, key)


async def run_scan(db, bearer_token, date_from, date_to, skip=0):
    scraper = CryptoRankScraper(bearer_token)
    inserted = updated = errors = fetched = 0

    scanned = 0
    try:
        projects, has_more, next_skip, scanned = await scraper.fetch_page(date_from, date_to, skip=skip)
        fetched = len(projects)
        for project in projects:
            try:
                if db.upsert_project(project):
                    inserted += 1
                else:
                    updated += 1
            except Exception:
                errors += 1
    except Exception as e:
        return {
            "fetched": fetched, "inserted": inserted, "updated": updated,
            "errors": errors, "has_more": False, "next_skip": skip,
            "scanned": scanned, "warning": str(e),
        }

    return {
        "fetched": fetched, "inserted": inserted, "updated": updated,
        "errors": errors, "has_more": has_more, "next_skip": next_skip,
        "scanned": scanned,
    }


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(content_length))

        db = get_db()
        if not db:
            self._json(500, {"error": "Supabase not configured"})
            return

        token = body.get('bearer_token', '')
        if not token:
            self._json(400, {"error": "bearer_token required"})
            return

        result = asyncio.run(run_scan(
            db, token,
            body.get('date_from', '2024-01-01'),
            body.get('date_to', '2099-12-31'),
            skip=body.get('skip', 0),
        ))

        self._json(200, result)

    def _json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass
