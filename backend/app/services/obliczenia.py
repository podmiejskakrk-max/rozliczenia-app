"""
Logika obliczeń — wierne odwzorowanie makra VBA RozliczeniaFIFO_DziennikSplaty.

Kluczowe zasady zgodne z VBA:
1. Inflacja: zakres >= dataWyd AND <= aktualnyMiesiac (łącznie z miesiącem wydatku)
2. fifoSaldo[dłużnik][wierzyciel] = suma udziałów × inflacja
3. Spłaty redukują FIFO wg kolejności wierzycieli: 0=Mateusz, 1=Jan, 2=Wojciech
4. Netowanie parami (i, k) gdzie i < k
"""

from datetime import date, timedelta
from collections import defaultdict
from dateutil.relativedelta import relativedelta
from typing import Optional


OSOBY = ["Mateusz", "Jan", "Wojciech"]
OSOBY_LOWER = ["mateusz", "jan", "wojciech"]


def _get_idx(name: str) -> int:
    return OSOBY_LOWER.index(name.strip().lower())


def _calc_inflation_sum(
    data_wyd_miesiac: date,
    aktualny_miesiac: date,
    inflacja_map: dict,
    missing_months: set,
) -> float:
    """
    Oblicza skumulowany współczynnik inflacji.
    Zakres: od miesiąca wydatku do bieżącego miesiąca włącznie.
    Brakujące miesiące → 0% (inflVal = 0, jak w VBA).
    """
    inflacja_sum = 1.0
    d = data_wyd_miesiac.replace(day=1)
    end = aktualny_miesiac.replace(day=1)

    while d <= end:
        key = (d.year, d.month)
        if key in inflacja_map and inflacja_map[key] is not None:
            inflacja_sum *= 1 + float(inflacja_map[key]) / 100
        else:
            missing_months.add(f"{d.month:02d}.{d.year}")
            # inflVal = 0 → mnożymy przez 1 (brak efektu)

        d = d + relativedelta(months=1)

    return inflacja_sum


def przelicz_wszystko(wydatki, splaty, inflacja_map: dict, today: Optional[date] = None) -> dict:
    """
    Główna funkcja przeliczeniowa — odwzorowanie makra VBA.

    Parametry:
        wydatki:      lista obiektów Wydatek z bazy danych
        splaty:       lista obiektów Splata z bazy danych (posortowane po dacie)
        inflacja_map: dict {(rok, miesiac): wartosc_procent}
        today:        data "bieżąca" (domyślnie date.today())

    Zwraca dict zgodny ze schematem PrzeliczResponse.
    """
    if today is None:
        today = date.today()

    aktualny_miesiac = today.replace(day=1)

    # ── Inicjalizacja macierzy 3×3 ──────────────────────────────────────────
    # fifo_saldo[dłużnik_idx][wierzyciel_idx]
    fifo_saldo = [[0.0] * 3 for _ in range(3)]

    missing_infl: set = set()
    future_ids: list = []

    wydatki_nominalne = 0.0
    wydatki_zwaloryzowane = 0.0

    # ── Przetwarzanie wydatków ───────────────────────────────────────────────
    for w in wydatki:
        if not w.data or not w.fundator:
            continue

        data_wyd = w.data if isinstance(w.data, date) else w.data.date()
        data_wyd_m = data_wyd.replace(day=1)

        if data_wyd_m > aktualny_miesiac:
            future_ids.append(w.id)
            continue

        try:
            f_idx = _get_idx(w.fundator)
        except ValueError:
            continue

        infl = _calc_inflation_sum(data_wyd_m, aktualny_miesiac, inflacja_map, missing_infl)

        udzialy = [
            float(w.udzial_mateusz or 0),
            float(w.udzial_jan or 0),
            float(w.udzial_wojciech or 0),
        ]

        suma = sum(udzialy)
        wydatki_nominalne += suma
        wydatki_zwaloryzowane += suma * infl

        for k in range(3):
            if k != f_idx and udzialy[k] > 0:
                fifo_saldo[k][f_idx] += udzialy[k] * infl

    # ── Przetwarzanie spłat FIFO ─────────────────────────────────────────────
    # Spłaty posortowane chronologicznie (jak w VBA: iteracja od góry tabeli)
    splaty_sorted = sorted(splaty, key=lambda s: s.data if s.data else date.min)

    historia = []

    for s in splaty_sorted:
        if not s.kto:
            continue

        try:
            kto_idx = _get_idx(s.kto)
        except ValueError:
            continue

        ile = float(s.kwota)
        data_str = s.data.isoformat() if s.data else None

        for k in range(3):
            if kto_idx == k:
                continue
            if fifo_saldo[kto_idx][k] <= 0.005:
                continue

            # Ile pokrywamy z tego długu
            if fifo_saldo[kto_idx][k] >= ile:
                kwota_pokryta = ile
                fifo_saldo[kto_idx][k] -= ile
                ile = 0
            else:
                kwota_pokryta = fifo_saldo[kto_idx][k]
                ile -= fifo_saldo[kto_idx][k]
                fifo_saldo[kto_idx][k] = 0

            historia.append(
                {
                    "splata_id": s.id,
                    "data_splaty": data_str,
                    "kto": OSOBY[kto_idx],
                    "komu": OSOBY[k],
                    "kwota_splaty": float(s.kwota),
                    "kwota_pokryta": round(kwota_pokryta, 2),
                    "pozostaly_dług": round(fifo_saldo[kto_idx][k], 2),
                }
            )

            if ile < 0.005:
                break

    # ── Netowanie (jak w VBA: pętle i < k) ──────────────────────────────────
    for i in range(3):
        for k in range(i + 1, 3):
            a = fifo_saldo[i][k]
            b = fifo_saldo[k][i]
            if a > 0 and b > 0:
                if a >= b:
                    fifo_saldo[i][k] = a - b
                    fifo_saldo[k][i] = 0
                else:
                    fifo_saldo[k][i] = b - a
                    fifo_saldo[i][k] = 0

    # ── Budowanie listy rozliczeń ────────────────────────────────────────────
    rozliczenia = []
    for i in range(3):
        for k in range(3):
            if i != k and fifo_saldo[i][k] > 0.01:
                rozliczenia.append(
                    {
                        "dluznik": OSOBY[i],
                        "wierzyciel": OSOBY[k],
                        "kwota": round(fifo_saldo[i][k], 2),
                    }
                )

    # ── Saldo w czasie ───────────────────────────────────────────────────────
    saldo_w_czasie = _calc_saldo_w_czasie(wydatki, splaty_sorted, inflacja_map, today)

    # ── Podsumowanie ─────────────────────────────────────────────────────────
    laczne_splaty = sum(float(s.kwota) for s in splaty)
    efekt = wydatki_zwaloryzowane - wydatki_nominalne
    efekt_proc = (efekt / wydatki_nominalne * 100) if wydatki_nominalne > 0 else 0.0

    # ── Ostrzeżenia ──────────────────────────────────────────────────────────
    ostrzezenia = []
    if missing_infl:
        sorted_missing = sorted(
            missing_infl,
            key=lambda x: (int(x.split(".")[1]), int(x.split(".")[0])),
        )
        ostrzezenia.append(f"Brak danych inflacji za: {', '.join(sorted_missing)}")
    if future_ids:
        ostrzezenia.append(
            f"Pominięto wydatki z datą w przyszłości (ID: {', '.join(map(str, future_ids))})"
        )

    return {
        "rozliczenia": rozliczenia,
        "historia_przelewow": historia,
        "podsumowanie": {
            "wydatki_nominalne": round(wydatki_nominalne, 2),
            "wydatki_zwaloryzowane": round(wydatki_zwaloryzowane, 2),
            "efekt_inflacji_zl": round(efekt, 2),
            "efekt_inflacji_procent": round(efekt_proc, 2),
            "laczne_splaty": round(laczne_splaty, 2),
        },
        "saldo_w_czasie": saldo_w_czasie,
        "ostrzezenia": ostrzezenia,
    }


def _calc_saldo_w_czasie(wydatki, splaty_sorted, inflacja_map: dict, today: date) -> list:
    """
    Oblicza saldo każdej osoby miesiąc po miesiącu.
    Dla każdego miesiąca M uruchamia uproszczoną wersję przeliczenia
    (bez netowania — pokazuje surowe pozycje dłużnicze/wierzycielskie).
    """
    valid = [w for w in wydatki if w.data and w.data.replace(day=1) <= today.replace(day=1)]
    if not valid:
        return []

    min_m = min(w.data.replace(day=1) for w in valid)
    cur_m = today.replace(day=1)

    months = []
    d = min_m
    while d <= cur_m:
        months.append(d)
        d = d + relativedelta(months=1)

    result = []

    for m_start in months:
        fifo = [[0.0] * 3 for _ in range(3)]
        dummy_missing: set = set()

        for w in valid:
            data_wyd_m = w.data.replace(day=1)
            if data_wyd_m > m_start:
                continue

            try:
                f_idx = _get_idx(w.fundator)
            except (ValueError, AttributeError):
                continue

            infl = _calc_inflation_sum(data_wyd_m, m_start, inflacja_map, dummy_missing)
            udzialy = [
                float(w.udzial_mateusz or 0),
                float(w.udzial_jan or 0),
                float(w.udzial_wojciech or 0),
            ]
            for k in range(3):
                if k != f_idx and udzialy[k] > 0:
                    fifo[k][f_idx] += udzialy[k] * infl

        # Zastosuj spłaty do tego miesiąca
        for s in splaty_sorted:
            if not s.data or s.data.replace(day=1) > m_start:
                continue
            try:
                kto_idx = _get_idx(s.kto)
            except (ValueError, AttributeError):
                continue

            ile = float(s.kwota)
            for k in range(3):
                if kto_idx == k:
                    continue
                if fifo[kto_idx][k] <= 0.005:
                    continue
                if fifo[kto_idx][k] >= ile:
                    fifo[kto_idx][k] -= ile
                    ile = 0
                else:
                    ile -= fifo[kto_idx][k]
                    fifo[kto_idx][k] = 0
                if ile < 0.005:
                    break

        # Saldo netto per osoba: owed_to_me - i_owe
        saldo = {}
        for p_idx, p_name in enumerate(OSOBY):
            owed_to_me = sum(fifo[other][p_idx] for other in range(3) if other != p_idx)
            i_owe = sum(fifo[p_idx][other] for other in range(3) if other != p_idx)
            saldo[p_name.lower()] = round(owed_to_me - i_owe, 2)

        result.append({"miesiac": m_start.strftime("%Y-%m"), **saldo})

    return result
