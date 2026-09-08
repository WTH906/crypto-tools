import os
import sys
import json
import asyncio
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '_lib'))
from icoanalytics import ICOAnalyticsScraper
from database import Database


def get_db():
    url = os.environ.get('SUPABASE_URL') or os.environ.get('VITE_SUPABASE_URL', '')
    key = os.environ.get('SUPABASE_ANON_KEY') or os.environ.get('VITE_SUPABASE_ANON_KEY', '')
    if not url or not key:
        return None
    return Database(url, key)


async def run_scan(db, date_from, date_to, page=1):
    scraper = ICOAnalyticsScraper()
    inserted = updated = merged = errors = fetched = 0

    try:
        projects, has_more = await scraper.fetch_page(date_from, date_to, page=page)
        fetched = len(projects)
        for project in projects:
            try:
                match_key = db.find_matching_project(project.get("name", ""))
                if match_key:
                    db.merge_project(match_key, project)
                    merged += 1
                elif db.upsert_project(project):
                    inserted += 1
                else:
                    updated += 1
            except Exception:
                errors += 1
    except Exception as e:
        return {
            "fetched": fetched, "inserted": inserted, "updated": updated,
            "merged": merged, "errors": errors, "has_more": False,
            "warning": str(e),
        }

    return {
        "fetched": fetched, "inserted": inserted, "updated": updated,
        "merged": merged, "errors": errors, "has_more": has_more,
    }


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(content_length))

        db = get_db()
        if not db:
            self._json(500, {"error": "Supabase not configured"})
            return

        result = asyncio.run(run_scan(
            db,
            body.get('date_from', '2024-01-01'),
            body.get('date_to', '2099-12-31'),
            page=body.get('page', 1),
        ))

        self._json(200, result)

    def _json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        pass
