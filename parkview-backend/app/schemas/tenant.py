from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date

class TenantBase(BaseModel):
    name: str
    email: Optional[str] = None
    contact_phone: Optional[str] = None
    
class TenantWithLeaseCreate(BaseModel):
    name: str
    email: EmailStr
    contact_phone: Optional[str] = None
    unit_id: int
    monthly_rent: float
    start_date: date
    end_date: date

class TenantCreate(TenantBase):
    user_id: Optional[int] = None

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    contact_phone: Optional[str] = None
    user_id: Optional[int] = None

class TenantRead(TenantBase):
    id: int
    user_id: Optional[int] = None

    class Config:
        from_attributes = True