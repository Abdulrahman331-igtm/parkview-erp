from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PaymentBase(BaseModel):
    invoice_id: int
    amount_paid: float
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentRead(PaymentBase):
    id: int
    payment_date: datetime

    class Config:
        from_attributes = True