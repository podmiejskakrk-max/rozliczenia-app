from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Wydatek
from ..schemas import WydatekCreate, WydatekUpdate, WydatekOut
from ..auth import verify_password

router = APIRouter(prefix="/api/wydatki", tags=["wydatki"])


@router.get("", response_model=List[WydatekOut])
def get_wydatki(db: Session = Depends(get_db), _: str = Depends(verify_password)):
    return db.query(Wydatek).order_by(Wydatek.data.desc()).all()


@router.post("", response_model=WydatekOut, status_code=status.HTTP_201_CREATED)
def create_wydatek(
    body: WydatekCreate,
    db: Session = Depends(get_db),
    _: str = Depends(verify_password),
):
    w = Wydatek(**body.model_dump())
    db.add(w)
    db.commit()
    db.refresh(w)
    return w


@router.put("/{id}", response_model=WydatekOut)
def update_wydatek(
    id: int,
    body: WydatekUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(verify_password),
):
    w = db.query(Wydatek).filter(Wydatek.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail=f"Wydatek {id} nie istnieje")
    for field, value in body.model_dump().items():
        setattr(w, field, value)
    db.commit()
    db.refresh(w)
    return w


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wydatek(
    id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_password),
):
    w = db.query(Wydatek).filter(Wydatek.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail=f"Wydatek {id} nie istnieje")
    db.delete(w)
    db.commit()
