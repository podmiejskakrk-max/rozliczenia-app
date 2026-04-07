from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Wydatek, Splata, Inflacja
from ..schemas import PrzeliczResponse
from ..auth import verify_password
from ..services.obliczenia import przelicz_wszystko

router = APIRouter(prefix="/api", tags=["obliczenia"])


@router.get("/przelicz", response_model=PrzeliczResponse)
def przelicz(db: Session = Depends(get_db), _: str = Depends(verify_password)):
    wydatki = db.query(Wydatek).order_by(Wydatek.data).all()
    splaty = db.query(Splata).order_by(Splata.data).all()
    inflacja_map = {
        (i.rok, i.miesiac): float(i.wartosc_procent)
        for i in db.query(Inflacja).all()
        if i.wartosc_procent is not None
    }

    return przelicz_wszystko(wydatki, splaty, inflacja_map)
