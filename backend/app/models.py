from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from .database import Base


class Wydatek(Base):
    __tablename__ = "wydatki"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(Date, nullable=False)
    opis = Column(String(500), nullable=False)
    fundator = Column(String(50), nullable=False)
    udzial_mateusz = Column(Numeric(12, 2), default=0)
    udzial_jan = Column(Numeric(12, 2), default=0)
    udzial_wojciech = Column(Numeric(12, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Splata(Base):
    __tablename__ = "splaty"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(Date, nullable=False)
    kto = Column(String(50), nullable=False)
    kwota = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Inflacja(Base):
    __tablename__ = "inflacja"

    id = Column(Integer, primary_key=True, index=True)
    rok = Column(Integer, nullable=False)
    miesiac = Column(Integer, nullable=False)
    wartosc_procent = Column(Numeric(6, 3), nullable=True)
    zrodlo = Column(String(20), default="manual")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("rok", "miesiac", name="uq_inflacja_rok_miesiac"),
    )
