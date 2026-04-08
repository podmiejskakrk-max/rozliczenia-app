"""
Scraper danych inflacji CPI m/m dla Polski.

Źródła (w kolejności prób):
1. Trading Economics API
2. GUS BDL API
3. stat.gov.pl scraping
"""

import logging
import httpx

logger = logging.getLogger(__name__)


async def fetch_inflacja_trading_economics() -> list[dict]:
    """
    Pobiera dane CPI m/m z Trading Economics.
    """
    url = "https://api.tradingeconomics.com/historical/country/poland/indicator/inflation-rate-mom"
    params = {
        "c": "guest:guest",
        "f": "json",
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.warning(f"Trading Economics niedostępne: {exc}")
        return []

    results = []
    for item in data:
        try:
            date_str = item.get("DateTime") or item.get("date") or ""
            value = item.get("Value") or item.get("value")
            if not date_str or value is None:
                continue
            year = int(date_str[:4])
            month = int(date_str[5:7])
            results.append({
                "rok": year,
                "miesiac": month,
                "wartosc_procent": round(float(value), 3),
                "zrodlo": "auto",
            })
        except (ValueError, TypeError):
            continue

    logger.info(f"Trading Economics: pobrano {len(results)} rekordów")
    return results


async def fetch_inflacja_z_gus() -> list[dict]:
    """
    Pobiera dane CPI m/m z GUS BDL API.
    """
    url = "https://bdl.stat.gov.pl/api/v1/data/by-variable/64778"
    params = {
        "unit-level": 0,
        "unit-id": "000000",
        "format": "json",
        "lang": "pl",
        "page-size": 200,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.warning(f"GUS BDL API niedostępne: {exc}")
        return []

    results = []
    for item in data.get("results", []):
        for val in item.get("values", []):
            year_month = val.get("year")
            period = val.get("period")
            value = val.get("val")
            if value is None:
                continue
            if isinstance(period, str) and period.startswith("M"):
                try:
                    month = int(period[1:])
                    rok = int(year_month)
                    if 1 <= month <= 12:
                        results.append({
                            "rok": rok,
                            "miesiac": month,
                            "wartosc_procent": round(float(value) - 100, 3),
                            "zrodlo": "auto",
                        })
                except (ValueError, TypeError):
                    continue

    logger.info(f"GUS BDL: pobrano {len(results)} rekordów")
    return results


async def fetch_inflacja_fallback() -> list[dict]:
    """
    Fallback: scraping stat.gov.pl
    """
    url = (
        "https://stat.gov.pl/obszary-tematyczne/ceny-handel/wskazniki-cen/"
        "wskazniki-cen-towarow-i-uslug-konsumpcyjnych-pot-inflacja-/miesieczne-wskazniki-cen-"
        "towarow-i-uslug-konsumpcyjnych-od-1982-roku,2,1.html"
    )
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text
    except Exception as exc:
        logger.warning(f"stat.gov.pl scraping nieudane: {exc}")
        return []

    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")
    results = []

    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if not rows:
            continue
        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if len(cells) < 2:
                continue
            try:
                rok = int(cells[0].get_text(strip=True))
            except ValueError:
                continue
            for col_idx, cell in enumerate(cells[1:], 1):
                text = cell.get_text(strip=True).replace(",", ".")
                if not text or text == "-":
                    continue
                try:
                    val = float(text) - 100
                    if col_idx <= 12:
                        results.append({
                            "rok": rok,
                            "miesiac": col_idx,
                            "wartosc_procent": round(val, 3),
                            "zrodlo": "auto",
                        })
                except ValueError:
                    continue

    logger.info(f"stat.gov.pl fallback: pobrano {len(results)} rekordów")
    return results


async def pobierz_inflacje() -> list[dict]:
    """
    Próbuje kolejno: Trading Economics → GUS BDL → stat.gov.pl scraping.
    """
    results = await fetch_inflacja_trading_economics()
    if results:
        return results

    results = await fetch_inflacja_z_gus()
    if results:
        return results

    return await fetch_inflacja_fallback()