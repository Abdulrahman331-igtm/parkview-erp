#Dependencies (Auth, DB session)
from fastapi import Security, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.schemas.token import TokenPayload
from app.core.security import ALGORITHM, SECRET_KEY
from jose import jwt,JWTError
from app import models
from fastapi.security import OAuth2PasswordBearer

from typing import Generator
from app.db.session import SessionLocal


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/login")

def get_db() -> Generator:
    try:
      db = SessionLocal()
      yield db
    finally:
      db.close()
      
async def get_current_user(token: str = Security(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user