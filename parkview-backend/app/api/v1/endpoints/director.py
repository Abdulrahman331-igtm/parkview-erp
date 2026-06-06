from typing import List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_db
from app.models.director import PayoutRequest, Invoice

router = APIRouter()

# --- SCHEMAS ---
class PayoutRequestCreate(BaseModel):
    category: str      # Added to catch the dropdown value from React
    amount: float
    payout_method: str
    reason: str

class PayoutRequestOut(BaseModel):
    id: int
    category: str | None
    amount: float
    date: date | None
    payout_method: str
    reason: str

    class Config:
        from_attributes = True

class InvoiceOut(BaseModel):
    id: int
    entity: str | None
    unit_number: str
    category: str | None
    amount: float
    status: str
    due_date: date

    class Config:
        from_attributes = True


# --- ENDPOINTS ---
@router.post("/payouts", status_code=201)
def create_payout_request(payout: PayoutRequestCreate, db: Session = Depends(get_db)):
    """Allows the Director to submit a new expense request."""
    try:
        db_payout = PayoutRequest(
            category=payout.category,
            amount=payout.amount,
            payout_method=payout.payout_method,
            reason=payout.reason,
            date=date.today()  # Securely stamps the exact current date
        )
        db.add(db_payout)
        db.commit()
        db.refresh(db_payout)
        return {
            "status": "success", 
            "message": "Expense created successfully", 
            "data": db_payout
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/payouts", response_model=List[PayoutRequestOut])
def get_all_payout_requests(db: Session = Depends(get_db)):
    """Fetches every expense request so the Director can view them in a table."""
    return db.query(PayoutRequest).all()

@router.get("/invoices", response_model=List[InvoiceOut])
def get_all_invoices(db: Session = Depends(get_db)):
    """Fetches every invoice so the Director can see who has paid and who is due."""
    return db.query(Invoice).all()

@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    """Calculates revenue from paid invoices and summarizes pending collections."""
    
    # Total Expenses (Money Out)
    total_expenses = db.query(func.sum(PayoutRequest.amount)).scalar() or 0.0
    
    # Gross Revenue (Money In - ONLY Paid Invoices)
    gross_revenue = db.query(
        func.sum(Invoice.amount)
    ).filter(Invoice.status == "paid").scalar() or 0.0
    
    # Invoice Status Counters
    paid_count = db.query(Invoice).filter(Invoice.status == "paid").count()
    due_count = db.query(Invoice).filter(Invoice.status == "due").count()
    overdue_count = db.query(Invoice).filter(Invoice.status == "overdue").count()
    
    # Final Math
    net_profit = gross_revenue - total_expenses

    return {
        "financials": {
            "gross_revenue": gross_revenue,
            "total_expenses": total_expenses,
            "net_profit": net_profit,
        },
        "invoices_summary": {
            "paid": paid_count,
            "due": due_count,
            "overdue": overdue_count
        }
    }