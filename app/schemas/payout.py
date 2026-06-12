from pydantic import BaseModel
from datetime import date
from typing import Optional

class PayoutBase(BaseModel):
    category: Optional[str] = None
    amount: float
    payout_method: str
    reason: str
    date: Optional[date] = None

class PayoutCreate(PayoutBase):
    pass

class PayoutResponse(PayoutBase):
    id: int
    status: str

    class Config:
        from_attributes = True