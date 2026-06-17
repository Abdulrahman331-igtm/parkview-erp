from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BookingBase(BaseModel):
    unit_id: int
    guest_name: str
    guest_contact: Optional[str] = None
    check_in: datetime
    check_out: datetime
    nightly_rate: float
    status: Optional[str] = "Confirmed"

class BookingCreate(BookingBase):
    pass

class BookingUpdate(BaseModel):
    unit_id: Optional[int] = None
    guest_name: Optional[str] = None
    guest_contact: Optional[str] = None
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    nightly_rate: Optional[float] = None
    status: Optional[str] = None

class BookingRead(BookingBase):
    id: int

    class Config:
        from_attributes = True