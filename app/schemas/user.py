from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
  username: str
  role: str
  
class UserCreate(UserBase):
  password: str
  
class UserUpdate(BaseModel):
  username: Optional[str] = None
  password: Optional[str] = None
  role: Optional[str] = None
  
  
  
class User(UserBase):
  id: int
  
  class Config:
    from_attributes = True