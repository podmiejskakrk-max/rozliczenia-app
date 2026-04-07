"""
Scraper danych inflacji CPI m/m dla Polski.

Źródła (w kolejności prób):
1. GUS BDL API (Bank Danych Lokalnych)
2. stat.gov.pl — scraping tabeli HTML
"""

import logging
import httpx
from datetime import date
from typing import Optional

logger = logging.getLogger(__name__)

# GUS BDL API — zmienna "Wskaźniki cen towarów i usług konsumpcyjnych miesiąc poprzedni=100"
# Szukamy jej po nazwie jeśli ID się zmieni
BDL_BASE = "https://bdl.stat.gov.pl/api/v1"
BDL_VARIABLE_ID = 64778  # CPI m/m ogółem, Polska
BDL_UNIT_ID = "000000"    # Polska ogółem

# Przeliczenie: BDL zwraca wartości jako indeks (np. 100.8 = +0.8%)
# wartosc_procent = wartość_z_BDL - 100


async def fetch_inflacja_z_gus() -> list[dict]:
    """
    Pobiera dane CPI m/m z GUS BDL API.
    Zwraca listę {'rok': int, 'miesiac': int, 'wartosc_procent': float, 'zrodlo': 'auto'}.
    """
    url = f"{BDL_BASE}/data/by-variable/{BDL_VARIABLE_ID}"
    params = {
        "unit-level": 0,
        "unit-id": BDL_UNIT_ID,
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
            period = val.get("period")  # np. "M01", "M12"
            value = val.get("val")

            if value is None:
                continue

            if isinstance(period, str) and period.startswith("M"):
                try:
                    month = int(period[1:])
                    rok = int(year_month) if year_month else None
                    if rok and 1 <= month <= 12:
                        wartosc = round(float(value) - 100, 3)
                        results.append({
                            "rok": rok,
                            "miesiac": month,
                            "wartosc_procent": wartosc,
                            "zrodlo": "auto",
                        })
                except (ValueError, TypeError):
                    continue

    logger.info(f"GUS BDL: pobrano {len(results)} rekordów inflacji")
    return results


async def fetch_inflacja_fallback() -> list[dict]:
    """
    Fallback: scraping tabeli stat.gov.pl/obszary-tematyczne/ceny-handel/wskazniki-cen/...
    Parsuje nagłówki kolumn (miesiące) i wiersze (lata).
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
    tables = soup.find_all("table")

    for table in tables:
        headers = []
        rows = table.find_all("tr")
        if not rows:
            continue

        for cell in rows[0].find_all(["th", "td"]):
            headers.append(cell.get_text(strip=True))

        # Szukamy kolumny "miesiąc poprzedni = 100"
        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            if len(cells) < 2:
                continue

            year_text = cells[0].get_text(strip=True)
            try:
                rok = int(year_text)
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
    Próbuje pobrać dane z GUS BDL, przy niepowodzeniu używa scrapingu stat.gov.pl.
    """
    results = await fetch_inflacja_z_gus()
    if not results:
        results = await fetch_inflacja_fallback()
    return results
