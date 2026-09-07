import httpx
import re
from datetime import datetime
from bs4 import BeautifulSoup


class ICOAnalyticsScraper:
    BASE_URL = "https://icoanalytics.org/deal-flow/"
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    async def fetch_funding_rounds_stream(self, date_from, date_to, max_pages=10):
        dt_from = datetime.strptime(date_from, "%Y-%m-%d")
        dt_to = datetime.strptime(date_to, "%Y-%m-%d")

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            for page in range(1, max_pages + 1):
                url = self.BASE_URL if page == 1 else f"{self.BASE_URL}page/{page}/"
                resp = await client.get(url, headers=self.HEADERS)

                if resp.status_code == 404:
                    break
                if resp.status_code != 200:
                    raise Exception(f"HTTP {resp.status_code} on page {page}")

                projects = self._parse_page(resp.text)
                if not projects:
                    break

                page_projects = []
                oldest_on_page = None
                for p in projects:
                    p_date = p.pop("_parsed_date", None)
                    if p_date is not None:
                        if oldest_on_page is None or p_date < oldest_on_page:
                            oldest_on_page = p_date
                        if p_date < dt_from or p_date > dt_to:
                            continue
                    page_projects.append(p)

                if page_projects:
                    yield page_projects

                if oldest_on_page and oldest_on_page < dt_from:
                    break

    def _parse_page(self, html):
        soup = BeautifulSoup(html, "html.parser")
        results = []
        rows = soup.select("div.hp-table-row")

        for row in rows:
            if "hpt-header" in (row.get("class") or []):
                continue

            link = row.select_one('a[href*="/projects/"]')
            if not link:
                continue

            href = link.get("href", "")
            key_match = re.search(r"/projects/([^/]+)", href)
            if not key_match:
                continue
            key = key_match.group(1).strip().rstrip("/")

            raw_name = link.get_text(strip=True)
            if not raw_name:
                continue

            name = raw_name
            symbol = None
            sym_match = re.search(r'^(.+?)([A-Z][A-Z0-9]{1,8})$', raw_name)
            if sym_match:
                candidate_name = sym_match.group(1)
                candidate_sym = sym_match.group(2)
                if len(candidate_sym) >= 2 and len(candidate_name) >= 2 and candidate_sym != "UP":
                    name = candidate_name
                    symbol = candidate_sym

            row_text = row.get_text(" ", strip=True)

            project = {
                "key": key, "name": name, "symbol": symbol,
                "type": "no-token", "lifeCycle": "funding",
                "categoryName": "", "tagNames": [], "fundingRound": {},
                "funds": [], "logo": None, "_parsed_date": None,
                "_source": "icoanalytics",
            }

            stage_match = re.search(
                r'(Pre-[Ss]eed|Seed|Pre-Series\s*[A-Z]|Series\s*[A-Z]|Strategic|'
                r'Undisclosed|Grant|M&A|Bridge|Debt|Private|Public\s*sale|Unknown|Extended\s*Seed)',
                row_text, re.IGNORECASE
            )
            if stage_match:
                project["fundingRound"]["stage"] = stage_match.group(1).strip().upper()

            date_match = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(20\d{2})', row_text)
            if date_match:
                try:
                    parsed = datetime.strptime(f"{date_match.group(1)} 1 {date_match.group(2)}", "%b %d %Y")
                    project["fundingRound"]["date"] = parsed.strftime("%Y-%m-%d")
                    project["_parsed_date"] = parsed
                except ValueError:
                    pass

            raise_match = re.search(r'(?:Raised|raised)\s*([\d,]+)', row_text)
            if not raise_match:
                nums = re.findall(r'\b(\d{5,})\b', row_text)
                for n in nums:
                    val = int(n)
                    if 10000 < val < 100_000_000_000:
                        project["fundingRound"]["raise"] = float(val)
                        break
            else:
                try:
                    project["fundingRound"]["raise"] = float(raise_match.group(1).replace(",", ""))
                except ValueError:
                    pass

            val_match = re.search(r'(?:valuation)[:\s]*([\d,]+)', row_text, re.IGNORECASE)
            if val_match:
                try:
                    project["fundingRound"]["valuation"] = float(val_match.group(1).replace(",", ""))
                except ValueError:
                    pass

            cat_items = row.select(".catitem")
            tags = [ci.get_text(strip=True) for ci in cat_items if ci.get_text(strip=True)]

            if not tags:
                known_cats = [
                    "AI", "DeFi", "DePIN", "NFT", "Gaming", "L1", "L2", "L3",
                    "Infrastructure", "Payment", "Wallet", "Identity", "Security",
                    "Analytics", "Oracle", "DEX", "CEX", "Lending/Borrowing",
                    "Stablecoin", "Yield Aggregator", "Staking", "Privacy",
                    "Real-World Assets", "Social Network", "Prediction Markets",
                    "Derivatives", "Trading", "Asset Management", "Insurance",
                    "Interoperability", "Storage", "Zero-knowledge", "Blockchain",
                    "Smart Contract Platform", "Data Service", "Media",
                    "Finance/Banking", "Tax & Accounting",
                ]
                row_lower = row_text.lower()
                for cat in known_cats:
                    if re.search(r'\b' + re.escape(cat.lower()) + r'\b', row_lower):
                        tags.append(cat)

            if tags:
                project["tagNames"] = list(dict.fromkeys(tags))
                project["categoryName"] = tags[0]

            fund_links = row.select('a[href*="/funds/"]')
            seen_funds = set()
            for fl in fund_links:
                fund_href = fl.get("href", "")
                fm = re.search(r"/funds/([^/]+)", fund_href)
                if not fm:
                    continue
                fund_key = fm.group(1).strip().rstrip("/")
                fund_name = ""
                is_lead = False
                logo = None
                img = fl.select_one("img")
                if img:
                    title = img.get("title", "")
                    logo = img.get("src")
                    if "Lead investor" in title:
                        is_lead = True
                        fund_name = title.replace("| Lead investor", "").strip()
                    else:
                        fund_name = title.strip()
                if not fund_name:
                    fund_name = fl.get_text(strip=True)
                if not fund_name:
                    fund_name = fund_key.replace("-", " ").title()
                if fund_key not in seen_funds and fund_name:
                    seen_funds.add(fund_key)
                    project["funds"].append({
                        "id": fund_key, "key": fund_key, "name": fund_name,
                        "tier": None, "isLead": is_lead, "logo": logo,
                    })

            results.append(project)

        return results
