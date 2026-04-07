from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./rozliczenia.db"
    APP_PASSWORD: str = "changeme"
    SECRET_KEY: str = "super-secret-key-change-in-production"

    # Scheduler
    INFLACJA_AUTO_REFRESH: bool = True
    BACKUP_ENABLED: bool = True

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
