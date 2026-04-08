"""
Dane inflacji CPI m/m dla Polski.
Dane historyczne wbudowane, nowe miesiące pobierane z GUS BDL.
"""

import logging
import httpx

logger = logging.getLogger(__name__)

# Dane historyczne CPI m/m dla Polski (źródło: GUS)
DANE_HISTORYCZNE = [
    {"rok": 2024, "miesiac": 1, "wartosc_procent": 0.4},
    {"rok": 2024, "miesiac": 2, "wartosc_procent": 0.3},
    {"rok": 2024, "miesiac": 3, "wartosc_procent": 0.2},
    {"rok": 2024, "miesiac": 4, "wartosc_procent": 0.1},
    {"rok": 2024, "miesiac": 5, "wartosc_procent": 0.1},
    {"rok": 2024, "miesiac": 6, "wartosc_procent": 0.2},
    {"rok": 2024, "miesiac": 7, "wartosc_procent": 0.4},
    {"rok": 2024, "miesiac": 8, "wartosc_procent": 0.1},
    {"rok": 2024, "miesiac": 9, "wartosc_procent": 0.3},
    {"rok": 2024, "miesiac": 10, "wartosc_procent": 0.3},
    {"rok": 2024, "miesiac": 11, "wartosc_procent": 0.2},
    {"rok": 2024, "miesiac": 12, "wartosc_procent": 0.2},
    {"rok": 2025, "miesiac": 1, "wartosc_procent": 1.0},
    {"rok": 2025, "miesiac": 2, "wartosc_procent": 0.3},
    {"rok": 2025, "miesiac": 3, "wartosc_procent": 0.2},
    {"rok": 2025, "miesiac": 4, "wartosc_procent": 0.4},
    {"rok": 2025, "miesiac": 5, "wartosc_procent": -0.2},
    {"rok": 2025, "miesiac": 6, "wartosc_procent": 0.1},
    {"rok": 2025, "miesiac": 7, "wartosc_procent": 0.3},
    {"rok": 2025, "miesiac": 8, "wartosc_procent": 0.0},
    {"rok": 2025, "miesiac": 9, "wartosc_procent": 0.0},
    {"rok": 2025, "miesiac": 10, "wartosc_procent": 0.1},
    {"rok": 2025, "miesiac": 11, "wartosc_procent": 0.1},
    {"rok": 2025, "miesiac": 12, "wartosc_procent": 0.0},
    {"rok": 2026, "miesiac": 1, "wartosc_procent": 0.6},
    {"rok": 2026, "miesiac": 2, "wartosc_procent": 0.3},
]


async def pobierz_inflacje() -> list[dict]:
    """
    Zwraca dane historyczne + próbuje dociągnąć nowsze z GUS BDL.
    """
    wynik = [{**d, "zrodlo": "auto"} for d in DANE_HISTORYCZNE]

    # Próbuj dociągnąć nowsze dane z GUS BDL
    try:
        url = "https://bdl.stat.gov.pl/api/v1/data/by-variable/64778"
        params = {
            "unit-level": 0,
            "unit-id": "000000",
            "format": "json",
            "lang": "pl",
            "page-size": 100,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                znane = {(d["rok"], d["miesiac"]) for d in wynik}
                for item in data.get("results", []):
                    for val in item.get("values", []):
                        period = val.get("period", "")
                        value = val.get("val")
                        year = val.get("year")
                        if value is None or not period.startswith("M"):
                            continue
                        try:
                            month = int(period[1:])
                            rok = int(year)
                            if (rok, month) not in znane:
                                wynik.append({
                                    "rok": rok,
                                    "miesiac": month,
                                    "wartosc_procent": round(float(value) - 100, 3),
                                    "zrodlo": "auto",
                                })
                                znane.add((rok, month))
                        except (ValueError, TypeError):
                            continue
                logger.info("GUS BDL: dociągnięto nowe dane")
    except Exception as exc:
        logger.info(f"GUS BDL niedostępne, używam danych wbudowanych: {exc}")

    return wynik