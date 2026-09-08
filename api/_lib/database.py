import json
import httpx
from datetime import datetime, timezone
from urllib.parse import quote


class Database:
    def __init__(self, supabase_url, supabase_key):
        self.base = supabase_url.rstrip("/")
        self.headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
        }
        self.table = f"{self.base}/rest/v1/scraper_projects"

    def _get(self, params=None):
        resp = httpx.get(self.table, headers=self.headers, params=params or {}, timeout=15)
        resp.raise_for_status()
        return resp.json()

    def _post(self, data):
        headers = {**self.headers, "Prefer": "return=representation"}
        resp = httpx.post(self.table, headers=headers, json=data, timeout=15)
        resp.raise_for_status()
        return resp

    def _patch(self, key, data):
        headers = {**self.headers, "Prefer": "return=representation"}
        resp = httpx.patch(
            self.table, headers=headers, json=data,
            params={"key": f"eq.{key}"}, timeout=15,
        )
        resp.raise_for_status()
        return resp

    def upsert_project(self, data):
        now = datetime.now(timezone.utc).isoformat()
        key = data.get("key", "")
        if not key:
            return False

        existing = self._get({"key": f"eq.{key}", "select": "key"})

        investors = data.get("funds", [])
        original_tags = data.get("tagNames", data.get("tags", []))
        funding = data.get("fundingRound") or data.get("lastFundingRound") or {}

        def safe_str(val):
            if val is None:
                return None
            if isinstance(val, dict):
                return val.get("name") or val.get("value") or json.dumps(val)
            return str(val)

        def safe_num(val):
            if val is None:
                return None
            if isinstance(val, dict):
                val = val.get("value") or val.get("amount") or val.get("usd")
            try:
                return float(val)
            except (ValueError, TypeError):
                return None

        funding_stage = safe_str(funding.get("stage"))
        funding_raise = safe_num(funding.get("raise"))
        funding_valuation = safe_num(funding.get("valuation"))

        fd = funding.get("date")
        funding_date = None
        if fd:
            if isinstance(fd, (int, float)):
                funding_date = datetime.fromtimestamp(fd / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
            elif isinstance(fd, str):
                funding_date = fd[:10]

        if existing:
            self._patch(key, {
                "name": data.get("name", ""),
                "symbol": data.get("symbol"),
                "type": data.get("type"),
                "life_cycle": data.get("lifeCycle"),
                "category": data.get("categoryName", data.get("category", "")),
                "original_tags": original_tags,
                "funding_stage": funding_stage,
                "funding_date": funding_date,
                "funding_raise": funding_raise,
                "funding_valuation": funding_valuation,
                "investors": investors,
                "logo_url": data.get("logo"),
                "raw_data": data,
                "last_modified": now,
            })
            return False
        else:
            source = data.get("_source", "")
            if source == "icoanalytics":
                cr_url = f"https://icoanalytics.org/projects/{key}/"
            else:
                cr_url = f"https://www.google.com/search?q=site:cryptorank.io+{quote(key)}"

            self._post({
                "key": key,
                "name": data.get("name", ""),
                "symbol": data.get("symbol"),
                "type": data.get("type"),
                "life_cycle": data.get("lifeCycle"),
                "category": data.get("categoryName", data.get("category", "")),
                "original_tags": original_tags,
                "custom_tags": [],
                "funding_stage": funding_stage,
                "funding_date": funding_date,
                "funding_raise": funding_raise,
                "funding_valuation": funding_valuation,
                "investors": investors,
                "logo_url": data.get("logo"),
                "cryptorank_url": cr_url,
                "notes": "",
                "deleted": False,
                "raw_data": data,
                "first_seen": now,
                "last_modified": now,
            })
            return True

    def merge_project(self, existing_key, new_data):
        now = datetime.now(timezone.utc).isoformat()
        rows = self._get({"key": f"eq.{existing_key}", "select": "*"})
        if not rows:
            return
        row = rows[0]
        updates = {}

        funding = new_data.get("fundingRound") or {}
        new_raise = funding.get("raise")
        if isinstance(new_raise, dict):
            new_raise = new_raise.get("value") or new_raise.get("amount")
        if new_raise and not row.get("funding_raise"):
            try:
                updates["funding_raise"] = float(new_raise)
            except (ValueError, TypeError):
                pass

        new_stage = funding.get("stage")
        if isinstance(new_stage, dict):
            new_stage = new_stage.get("name") or str(new_stage)
        if new_stage and not row.get("funding_stage"):
            updates["funding_stage"] = str(new_stage)

        existing_tags = row.get("original_tags") or []
        new_tags = new_data.get("tagNames", [])
        if new_tags:
            merged_tags = list(dict.fromkeys(existing_tags + new_tags))
            if merged_tags != existing_tags:
                updates["original_tags"] = merged_tags

        new_cat = new_data.get("categoryName", "")
        if isinstance(new_cat, dict):
            new_cat = new_cat.get("name", "")
        if new_cat and not row.get("category"):
            updates["category"] = str(new_cat)

        existing_investors = row.get("investors") or []
        new_funds = new_data.get("funds", [])
        if new_funds:
            existing_names = {inv.get("name", "").lower() for inv in existing_investors}
            for fund in new_funds:
                if fund.get("name", "").lower() not in existing_names:
                    existing_investors.append(fund)
            updates["investors"] = existing_investors

        if updates:
            updates["last_modified"] = now
            self._patch(existing_key, updates)

    def find_matching_project(self, name):
        import re
        if not name:
            return None
        target = re.sub(r'[^a-z0-9\s]', '', name.lower().strip())
        target = re.sub(r'\s+', ' ', target)
        if not target:
            return None
        rows = self._get({"select": "key,name"})
        for row in rows:
            n = re.sub(r'[^a-z0-9\s]', '', row["name"].lower().strip())
            n = re.sub(r'\s+', ' ', n)
            if n == target:
                return row["key"]
        return None
