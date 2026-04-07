import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Inflacja
from ..schemas import InflacjaCreate, InflacjaOut, MessageResponse
from ..auth import verify_password

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inflacja", tags=["inflacja"])


@router.get("", response_model=List[InflacjaOut])
def get_inflacja(db: Session = Depends(get_db), _: str = Depends(verify_password)):
    return db.query(Inflacja).order_by(Inflacja.rok.desc(), Inflacja.miesiac.desc()).all()


@router.post("", response_model=InflacjaOut)
def upsert_inflacja(
    body: InflacjaCreate,
    db: Session = Depends(get_db),
    _: str = Depends(verify_password),
):
    existing = (
        db.query(Inflacja)
        .filter(Inflacja.rok == body.rok, Inflacja.miesiac == body.miesiac)
        .first()
    )
    if existing:
        for field, value in body.model_dump().items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        record = Inflacja(**body.model_dump())
        db.add(record)
        db.commit()
        db.refresh(record)
        return record


@router.post("/odswiez", response_model=MessageResponse)
async def odswiez_inflacje(
    db: Session = Depends(get_db),
    _: str = Depends(verify_password),
):
    from ..services.inflacja_scraper import pobierz_inflacje

    try:
        records = await pobierz_inflacje()
    except Exception as exc:
        logger.error(f"Błąd pobierania inflacji: {exc}")
        raise HTTPException(status_code=502, detail=f"Błąd pobierania danych: {exc}")

    if not records:
        raise HTTPException(status_code=502, detail="Nie udało się pobrać danych inflacji z GUS")

    saved = 0
    new_months = []

    for r in records:
        existing = (
            db.query(Inflacja)
            .filter(Inflacja.rok == r["rok"], Inflacja.miesiac == r["miesiac"])
            .first()
        )
        if existing:
            if existing.zrodlo == "manual":
                continue  # Nie nadpisuj ręcznych wpisów
            existing.wartosc_procent = r["wartosc_procent"]
            existing.zrodlo = "auto"
        else:
            db.add(Inflacja(**r))
            new_months.append(f"{r['miesiac']:02d}.{r['rok']}")
            saved += 1

    db.commit()

    msg = f"Pobrano {len(records)} rekordów, dodano {saved} nowych"
    return MessageResponse(message=msg, details={"nowe_miesiace": new_months})
