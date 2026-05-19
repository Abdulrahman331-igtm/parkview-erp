#JWT Token logic and password hashing
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Union
from jose import jwt
import os

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# SECRET_KEY = os.getenv("SECRET_KEY")
SECRET_KEY = "8683f1db7d4691fafe8085288470d0be016985854a778c291b2cba2f3f306d84"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password: str, hashed_password:str) -> bool:
    """Verify plain password against argon2 hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate a password hash."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None) -> str:
    """Create a new JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt