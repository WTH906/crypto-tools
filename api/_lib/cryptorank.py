import httpx
from datetime import datetime, timezone


class CryptoRankScraper:
    API_URL = "https://api.cryptorank.io/v0/funding-rounds-v2/exclusive"
    PAGE_SIZE = 20

    def __init__(self, bearer_token: str):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "*/*",
            "Content-Type": "application/json",
            "Origin": "https://cryptorank.io",
            "Referer": "https://cryptorank.io/",
            "Authorization": f"Bearer {bearer_token}",
        }

    async def fetch_funding_rounds_stream(self, date_from, date_to, max_pages=10):
        dt_from = datetime.strptime(date_from, "%Y-%m-%d")
        dt_to = datetime.strptime(date_to, "%Y-%m-%d")
        skip = 0

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            for page in range(1, max_pages + 1):
                payload = {
                    "limit": self.PAGE_SIZE,
                    "filters": {},
                    "skip": skip,
                    "sortingColumn": "date",
                    "sortingDirection": "DESC",
                }

                resp = await client.post(self.API_URL, headers=self.headers, json=payload)

                if resp.status_code == 401:
                    raise Exception("Token expired or invalid.")
                if resp.status_code not in (200, 201):
                    raise Exception(f"HTTP {resp.status_code}: {resp.text[:300]}")

                body = resp.json()
                items = body.get("data", [])
                total = body.get("total", 0)

                if not items:
                    break

                page_projects = []
                oldest_on_page = None
                for item in items:
                    project = self._normalize(item)
                    p_date = project.pop("_parsed_date", None)
                    if p_date is not None:
                        if oldest_on_page is None or p_date < oldest_on_page:
                            oldest_on_page = p_date
                        if p_date < dt_from or p_date > dt_to:
                            continue
                    page_projects.append(project)

                if page_projects:
                    yield page_projects

                if oldest_on_page and oldest_on_page < dt_from:
                    break
                if skip + self.PAGE_SIZE >= total:
                    break
                skip += self.PAGE_SIZE

    def _normalize(self, item):
        key = item.get("key", item.get("slug", ""))
        name = item.get("name", key)

        parsed_date = None
        funding_date_str = None
        date_val = item.get("date") or item.get("fundingDate")
        if date_val:
            if isinstance(date_val, (int, float)):
                try:
                    parsed_date = datetime.fromtimestamp(date_val / 1000, tz=timezone.utc).replace(tzinfo=None)
                    funding_date_str = parsed_date.strftime("%Y-%m-%d")
                except (OSError, ValueError, OverflowError):
                    pass
            elif isinstance(date_val, str):
                funding_date_str = date_val[:10]
                try:
                    parsed_date = datetime.strptime(funding_date_str, "%Y-%m-%d")
                except ValueError:
                    pass

        funds = []
        raw_funds = item.get("funds") or item.get("investors") or []
        if isinstance(raw_funds, list):
            for f in raw_funds:
                if isinstance(f, dict):
                    funds.append({
                        "id": f.get("id") or f.get("key", ""),
                        "key": f.get("key", f.get("slug", "")),
                        "name": f.get("name", ""),
                        "tier": f.get("tier"),
                        "isLead": f.get("isLead", False),
                        "logo": f.get("logo"),
                    })

        tags = []
        raw_tags = item.get("tagNames") or item.get("tags") or item.get("tagIds") or []
        if isinstance(raw_tags, list):
            tags = [t if isinstance(t, str) else str(t) for t in raw_tags]

        funding_round = {}
        stage = item.get("fundingRound", {}).get("stage") if isinstance(item.get("fundingRound"), dict) else None
        stage = stage or item.get("stage")
        if isinstance(stage, dict):
            stage = stage.get("name") or stage.get("value") or str(stage)
        if stage:
            funding_round["stage"] = str(stage)

        raise_val = item.get("raise")
        if isinstance(raise_val, dict):
            raise_val = raise_val.get("value") or raise_val.get("amount")
        if raise_val is not None:
            try:
                funding_round["raise"] = float(raise_val)
            except (ValueError, TypeError):
                pass

        val = item.get("valuation")
        if isinstance(val, dict):
            val = val.get("value") or val.get("amount")
        if val is not None:
            try:
                funding_round["valuation"] = float(val)
            except (ValueError, TypeError):
                pass

        if funding_date_str:
            funding_round["date"] = funding_date_str

        return {
            "key": key,
            "name": name,
            "symbol": item.get("symbol"),
            "type": item.get("type", "no-token"),
            "lifeCycle": item.get("lifeCycle", "funding"),
            "categoryName": item.get("categoryName") or item.get("category", ""),
            "tagNames": tags,
            "fundingRound": funding_round,
            "funds": funds,
            "logo": item.get("logo") or item.get("icon") or item.get("image"),
            "_parsed_date": parsed_date,
        }
