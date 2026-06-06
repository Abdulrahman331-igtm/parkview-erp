from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    name: str
    
class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None