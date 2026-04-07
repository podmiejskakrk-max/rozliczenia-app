from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Splata
from ..schemas import SplataCreate, SplataUpdate, SplataOut
from ..auth import verify_password

router = APIRouter(prefix="/api/splaty", tags=["splaty"])


@router.get("", response_model=List[SplataOut])
def get_splaty(db: Session = Depends(get_db), _: str = Depends(verify_password)):
    return db.query(Splata).order_by(Splata.data.desc()).all()


@router.post("", response_model=SplataOut, status_code=status.HTTP_201_CREATED)
def create_splata(
    body: SplataCreate,
    db: Session = Depends(get_db),
    _: str = Depends(verify_password),
):
    s = Splata(**body.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.put("/{id}", response_model=SplataOut)
def update_splata(
    id: int,
    body: SplataUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(verify_password),
):
    s = db.query(Splata).filter(Splata.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Spłata {id} nie istnieje")
    for field, value in body.model_dump().items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_splata(
    id: int,
    db: Session = Depends(get_db),
    _: str = Depends(verify_password),
):
    s = db.query(Splata).filter(Splata.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Spłata {id} nie istnieje")
    db.delete(s)
    db.commit()
