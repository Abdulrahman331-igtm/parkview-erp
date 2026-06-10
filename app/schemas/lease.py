from pydantic import BaseModel
from datetime import date
from typing import Optional

class LeaseBase(BaseModel):
    tenant_id: int
    unit_id: int
    start_date: date
    end_date: date
    monthly_rent: float
    status: Optional[str] = "Active"

class LeaseCreate(LeaseBase):
    pass

class LeaseUpdate(BaseModel):
    tenant_id: Optional[int] = None
    unit_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    monthly_rent: Optional[float] = None
    status: Optional[str] = None

class LeaseRead(LeaseBase):
    id: int

    class Config:
        from_attributes = True