import logging
import logging.handlers
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .database import init_db

settings = get_settings()

# ─── Logging ─────────────────────────────────────────────────────────────────

os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.handlers.RotatingFileHandler(
            "logs/app.log", maxBytes=5_000_000, backupCount=3
        ),
    ],
)
logger = logging.getLogger(__name__)


# ─── Scheduler ───────────────────────────────────────────────────────────────

def _setup_scheduler(app: FastAPI):
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger

    scheduler = AsyncIOScheduler()

    if settings.INFLACJA_AUTO_REFRESH:
        @scheduler.scheduled_job(CronTrigger(hour=6, minute=0))
        async def refresh_inflacja():
            from .database import SessionLocal
            from .models import Inflacja
            from .services.inflacja_scraper import pobierz_inflacje
            logger.info("Scheduler: odświeżanie inflacji...")
            try:
                records = await pobierz_inflacje()
                db = SessionLocal()
                try:
                    for r in records:
                        existing = (
                            db.query(Inflacja)
                            .filter(Inflacja.rok == r["rok"], Inflacja.miesiac == r["miesiac"])
                            .first()
                        )
                        if existing:
                            if existing.zrodlo != "manual":
                                existing.wartosc_procent = r["wartosc_procent"]
                                existing.zrodlo = "auto"
                        else:
                            db.add(Inflacja(**r))
                    db.commit()
                    logger.info(f"Scheduler: zaktualizowano {len(records)} rekordów inflacji")
                finally:
                    db.close()
            except Exception as exc:
                logger.error(f"Scheduler inflacja błąd: {exc}")

    if settings.BACKUP_ENABLED:
        @scheduler.scheduled_job(CronTrigger(hour=2, minute=0))
        def daily_backup():
            from .services.backup import run_backup
            logger.info("Scheduler: backup bazy danych...")
            result = run_backup(settings.DATABASE_URL)
            if result:
                logger.info(f"Backup zapisany: {result}")
            else:
                logger.warning("Backup nieudany")

    scheduler.start()
    app.state.scheduler = scheduler
    return scheduler


# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Baza danych zainicjalizowana")
    _setup_scheduler(app)
    yield
    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown(wait=False)


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Rozliczenia API",
    description="System rozliczania wspólnych wydatków z waloryzacją inflacyjną",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rozliczenia-appx22.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Nieobsłużony wyjątek: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Wewnętrzny błąd serwera: {str(exc)}"},
    )


# ─── Routers ──────────────────────────────────────────────────────────────────

from .routers import wydatki, splaty, inflacja, przelicz, eksport_import  # noqa
from .auth import verify_password

app.include_router(wydatki.router)
app.include_router(splaty.router)
app.include_router(inflacja.router)
app.include_router(przelicz.router)
app.include_router(eksport_import.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/me")
def me(_: str = Depends(verify_password)):
    return {"user": "admin"}