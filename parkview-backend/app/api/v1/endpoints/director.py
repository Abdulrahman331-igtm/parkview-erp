from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps
from app.api.deps import get_db
from datetime import date
from app.models.payout import PayoutRequest
from app.schemas.payout import PayoutCreate, PayoutResponse

router = APIRouter()

@router.post("/payouts", response_model=PayoutResponse)
def create_payout(payout_in: PayoutCreate, db: Session = Depends(get_db)):
    
    new_payout = PayoutRequest(**payout_in.model_dump())
    db.add(new_payout)
    db.flush() 

    new_expense = models.Expense(
        category="Director Payout",
        description=f"Payout Request #{new_payout.id}: {payout_in.reason} ({payout_in.payout_method})",
        amount=payout_in.amount,
        expense_date=payout_in.date or date.today(),
        approved_by="Pending Approval",
        is_recurring=False,
        status="Pending" 
    )
    db.add(new_expense)
 
    db.commit()
    db.refresh(new_payout)
    return new_payout

@router.get("/payouts", response_model=list[PayoutResponse])
def get_payouts(db: Session = Depends(get_db)):
    return db.query(PayoutRequest).all()

@router.put("/{expense_id}")
def update_expense(
    expense_id: int, 
    expense_in: schemas.ExpenseUpdate, # (Or whatever your schema is named)
    db: Session = Depends(deps.get_db)
):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense record not found")
    
    # 1. Update the normal expense fields from the React form
    for var, value in vars(expense_in).items():
        if value is not None:
            setattr(expense, var, value)

    # ---------------------------------------------------------
    # 🛠️ THE REVERSE BRIDGE: Sync back to the Payouts Table
    # ---------------------------------------------------------
    if expense.category == "Director Payout" and expense.status == "Paid":
        # Look for our special tag in the description
        if "Payout Request #" in expense.description:
            try:
                # Extract the ID number from the string (e.g., gets "1" from "Payout Request #1:")
                payout_id_str = expense.description.split("Payout Request #")[1].split(":")[0]
                payout_id = int(payout_id_str)
                
                # Reach across the database and update your friend's table!
                linked_payout = db.query(PayoutRequest).filter(PayoutRequest.id == payout_id).first()
                if linked_payout and linked_payout.status != "Paid":
                    linked_payout.status = "Paid"
                    db.add(linked_payout)
            except Exception as e:
                print(f"Failed to sync payout status: {e}") # Failsafe if description was manually re-typed

    # ---------------------------------------------------------
    
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense