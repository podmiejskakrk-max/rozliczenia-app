"""
Automatyczny backup bazy danych PostgreSQL do pliku SQL.
Maksymalnie 10 kopii w folderze /backups (rotacja FIFO).
"""

import os
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

BACKUP_DIR = Path(__file__).parent.parent / "backups"
MAX_BACKUPS = 10


def run_backup(database_url: str) -> str | None:
    """
    Tworzy dump PostgreSQL lub SQLite i zapisuje do folderu backups.
    Zwraca ścieżkę do pliku lub None przy błędzie.
    """
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if "postgresql" in database_url or "postgres" in database_url:
        return _backup_postgres(database_url, timestamp)
    elif "sqlite" in database_url:
        return _backup_sqlite(database_url, timestamp)
    else:
        logger.warning(f"Nieobsługiwany typ bazy danych: {database_url}")
        return None


def _backup_postgres(database_url: str, timestamp: str) -> str | None:
    parsed = urlparse(database_url)
    backup_file = BACKUP_DIR / f"backup_{timestamp}.sql"

    env = os.environ.copy()
    if parsed.password:
        env["PGPASSWORD"] = parsed.password

    cmd = [
        "pg_dump",
        "-h", parsed.hostname or "localhost",
        "-p", str(parsed.port or 5432),
        "-U", parsed.username or "postgres",
        "-d", parsed.path.lstrip("/"),
        "-f", str(backup_file),
        "--no-password",
    ]

    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            logger.error(f"pg_dump error: {result.stderr}")
            return None
        logger.info(f"Backup PostgreSQL zapisany: {backup_file}")
        _rotate_backups()
        return str(backup_file)
    except FileNotFoundError:
        logger.error("pg_dump nie znaleziony — PostgreSQL client tools nie zainstalowany")
        return None
    except subprocess.TimeoutExpired:
        logger.error("Backup timeout")
        return None
    except Exception as exc:
        logger.error(f"Backup nieudany: {exc}")
        return None


def _backup_sqlite(database_url: str, timestamp: str) -> str | None:
    import shutil
    db_path = database_url.replace("sqlite:///", "").replace("sqlite://", "")
    if not os.path.exists(db_path):
        logger.warning(f"SQLite plik nie istnieje: {db_path}")
        return None

    backup_file = BACKUP_DIR / f"backup_{timestamp}.db"
    try:
        shutil.copy2(db_path, backup_file)
        logger.info(f"Backup SQLite zapisany: {backup_file}")
        _rotate_backups()
        return str(backup_file)
    except Exception as exc:
        logger.error(f"Backup SQLite nieudany: {exc}")
        return None


def _rotate_backups():
    """Usuwa najstarsze pliki backup powyżej limitu MAX_BACKUPS."""
    backups = sorted(
        [f for f in BACKUP_DIR.iterdir() if f.is_file() and (f.suffix in (".sql", ".db"))],
        key=lambda f: f.stat().st_mtime,
    )
    while len(backups) > MAX_BACKUPS:
        oldest = backups.pop(0)
        try:
            oldest.unlink()
            logger.info(f"Usunięto stary backup: {oldest}")
        except Exception as exc:
            logger.warning(f"Nie można usunąć backupu {oldest}: {exc}")
