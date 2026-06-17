from pydantic import BaseModel
from datetime import date
from typing import Optional, Dict

class InvoiceBase(BaseModel):
    tenant_id: Optional[int] = None
    booking_id: Optional[int] = None
    unit_id: int
    category: str
    amount: float
    due_date: date
    status: Optional[str] = "Pending"
    line_items: Optional[Dict[str, float]] = {}

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceUpdate(BaseModel):
    tenant_id: Optional[int] = None
    booking_id: Optional[int] = None
    unit_id: Optional[int] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    line_items: Optional[Dict[str, float]] = None

class InvoiceRead(InvoiceBase):
    id: int

    class Config:
        from_attributes = True