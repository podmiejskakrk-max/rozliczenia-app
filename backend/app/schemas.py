from pydantic import BaseModel, field_validator, model_validator
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Any

OSOBY_VALID = {"mateusz", "jan", "wojciech"}


# ─── Wydatki ────────────────────────────────────────────────────────────────


class WydatekBase(BaseModel):
    data: date
    opis: str
    fundator: str
    udzial_mateusz: Optional[Decimal] = Decimal("0")
    udzial_jan: Optional[Decimal] = Decimal("0")
    udzial_wojciech: Optional[Decimal] = Decimal("0")

    @field_validator("fundator")
    @classmethod
    def normalize_fundator(cls, v: str) -> str:
        normalized = v.strip().lower()
        if normalized not in OSOBY_VALID:
            raise ValueError(f"Fundator musi być jedną z osób: Mateusz, Jan, Wojciech")
        return normalized.capitalize()

    @model_validator(mode="after")
    def check_suma(self) -> "WydatekBase":
        total = (self.udzial_mateusz or 0) + (self.udzial_jan or 0) + (self.udzial_wojciech or 0)
        if total <= 0:
            raise ValueError("Suma udziałów musi być większa od zera")
        return self


class WydatekCreate(WydatekBase):
    pass


class WydatekUpdate(WydatekBase):
    pass


class WydatekOut(WydatekBase):
    id: int
    razem: Optional[Decimal] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def compute_razem(self) -> "WydatekOut":
        self.razem = (self.udzial_mateusz or 0) + (self.udzial_jan or 0) + (self.udzial_wojciech or 0)
        return self


# ─── Spłaty ─────────────────────────────────────────────────────────────────


class SplataBase(BaseModel):
    data: date
    kto: str
    kwota: Decimal

    @field_validator("kto")
    @classmethod
    def normalize_kto(cls, v: str) -> str:
        normalized = v.strip().lower()
        if normalized not in OSOBY_VALID:
            raise ValueError(f"Kto musi być jedną z osób: Mateusz, Jan, Wojciech")
        return normalized.capitalize()

    @field_validator("kwota")
    @classmethod
    def positive_kwota(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Kwota musi być większa od zera")
        return v


class SplataCreate(SplataBase):
    pass


class SplataUpdate(SplataBase):
    pass


class SplataOut(SplataBase):
    id: int

    model_config = {"from_attributes": True}


# ─── Inflacja ────────────────────────────────────────────────────────────────


class InflacjaBase(BaseModel):
    rok: int
    miesiac: int
    wartosc_procent: Optional[Decimal] = None
    zrodlo: str = "manual"

    @field_validator("miesiac")
    @classmethod
    def valid_month(cls, v: int) -> int:
        if not 1 <= v <= 12:
            raise ValueError("Miesiąc musi być w zakresie 1–12")
        return v

    @field_validator("rok")
    @classmethod
    def valid_year(cls, v: int) -> int:
        if not 2000 <= v <= 2100:
            raise ValueError("Rok musi być w zakresie 2000–2100")
        return v


class InflacjaCreate(InflacjaBase):
    pass


class InflacjaOut(InflacjaBase):
    id: int
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Przelicz ────────────────────────────────────────────────────────────────


class Rozliczenie(BaseModel):
    dluznik: str
    wierzyciel: str
    kwota: float


class HistoriaPrzelewu(BaseModel):
    splata_id: int
    data_splaty: Optional[str]
    kto: str
    komu: str
    kwota_splaty: float
    kwota_pokryta: float
    pozostaly_dług: float


class Podsumowanie(BaseModel):
    wydatki_nominalne: float
    wydatki_zwaloryzowane: float
    efekt_inflacji_zl: float
    efekt_inflacji_procent: float
    laczne_splaty: float


class SaldoMiesiac(BaseModel):
    miesiac: str
    mateusz: float
    jan: float
    wojciech: float


class PrzeliczResponse(BaseModel):
    rozliczenia: List[Rozliczenie]
    historia_przelewow: List[HistoriaPrzelewu]
    podsumowanie: Podsumowanie
    saldo_w_czasie: List[SaldoMiesiac]
    ostrzezenia: List[str]


# ─── Misc ────────────────────────────────────────────────────────────────────


class MessageResponse(BaseModel):
    message: str
    details: Optional[Any] = None
