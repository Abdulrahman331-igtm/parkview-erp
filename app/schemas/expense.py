from pydantic import BaseModel
from datetime import date
from typing import Optional

class ExpenseBase(BaseModel):
    category: str
    description: str
    amount: float
    expense_date: date
    approved_by: Optional[str] = "Admin"
    is_recurring: Optional[bool] = False
    status: Optional[str] = "Paid"

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    expense_date: Optional[date] = None
    approved_by: Optional[str] = None
    is_recurring: Optional[bool] = None
    status: Optional[str] = None

class ExpenseRead(ExpenseBase):
    id: int

    class Config:
        from_attributes = True