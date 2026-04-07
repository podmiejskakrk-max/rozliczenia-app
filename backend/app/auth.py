import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from .config import get_settings

security = HTTPBasic()


def verify_password(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    settings = get_settings()
    correct_password = settings.APP_PASSWORD.encode("utf-8")
    given_password = credentials.password.encode("utf-8")

    # Constant-time comparison to prevent timing attacks
    if not (
        secrets.compare_digest(credentials.username.encode("utf-8"), b"admin")
        and secrets.compare_digest(given_password, correct_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowe hasło",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username
