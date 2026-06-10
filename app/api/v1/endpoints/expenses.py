from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app import models, schemas
from app.api import deps
from sqlalchemy import func

router = APIRouter()

# CREATE - Log an outgoing expense
@router.post("/", response_model=schemas.ExpenseRead)
def create_expense(
    expense_in: schemas.ExpenseCreate,
    db: Session = Depends(deps.get_db),
):
    """Log an outgoing expense (Maintenance, Salaries, etc.)."""
    new_expense = models.Expense(**expense_in.dict())
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return new_expense

# READ - List all recorded expenses
@router.get("/", response_model=List[schemas.ExpenseRead])
def get_expenses(
    category: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(deps.get_db),
):
    """List all recorded expenses with optional date range and category filtering."""
    query = db.query(models.Expense)
    
    if category:
        query = query.filter(models.Expense.category == category)
    if from_date:
        query = query.filter(models.Expense.expense_date >= from_date)
    if to_date:
        query = query.filter(models.Expense.expense_date <= to_date)
    
    return query.order_by(models.Expense.expense_date.desc()).offset(skip).limit(limit).all()

# UPDATE - Edit an expense
@router.put("/{expense_id}", response_model=schemas.ExpenseRead)
def update_expense(
    expense_id: int,
    expense_in: schemas.ExpenseUpdate,
    db: Session = Depends(deps.get_db),
):
    """Edit an expense record."""
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    update_data = expense_in.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(expense, key, value)
    
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense

# DELETE - Remove an expense
@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(deps.get_db),
):
    """Delete an expense record."""
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    db.delete(expense)
    db.commit()
    
@router.get("/dashboard-summary")
def get_expenses_dashboard_summary(db: Session = Depends(deps.get_db)):
    """
    Assembles metric summaries for the Expenses workspace.
    Strictly filters financial aggregates to ONLY include 'Paid' expenses.
    """
    
    # 1. 🛠️ THE MATH FIX: Create a base query that ONLY looks at "Paid" statuses
    paid_query = db.query(models.Expense).filter(models.Expense.status == "Paid")

    # Calculate Top Cards based strictly on paid outflows
    total_expenses = paid_query.with_entities(func.sum(models.Expense.amount)).scalar() or 0
    
    salaries_wages = paid_query.filter(
        models.Expense.category.in_(["Salary", "Wage"])
    ).with_entities(func.sum(models.Expense.amount)).scalar() or 0
    
    procurement = paid_query.filter(
        models.Expense.category == "Procurement"
    ).with_entities(func.sum(models.Expense.amount)).scalar() or 0
    
    director_payouts = paid_query.filter(
        models.Expense.category == "Director Payout"
    ).with_entities(func.sum(models.Expense.amount)).scalar() or 0

    # Calculate P&L Summary (Grouped strictly by Paid)
    pl_groups = db.query(
        models.Expense.category, 
        func.sum(models.Expense.amount)
    ).filter(
        models.Expense.status == "Paid"
    ).group_by(models.Expense.category).all()
    
    pl_summary = [{"name": cat, "amount": float(amt)} for cat, amt in pl_groups]

    # 2. THE DISPLAY FIX: Fetch ALL expenses for the data grid table so admins can see Pending/Overdue records
    all_expenses = db.query(models.Expense).order_by(models.Expense.expense_date.desc()).all()
    
    table_rows = []
    for e in all_expenses:
        table_rows.append({
            "id": e.id,
            "expense_code": f"EXP-{e.id:03d}",
            "category": e.category,
            "description": e.description,
            "amount": float(e.amount),
            "date": e.expense_date.strftime("%Y-%m-%d") if hasattr(e.expense_date, 'strftime') else str(e.expense_date),
            "recurring": "Yes" if e.is_recurring else "No",
            "approved_by": e.approved_by,
            # 🛠️ MISSING LINK: Send the explicit status state to React!
            "status": e.status 
        })

    return {
        "summary": {
            "total_expenses": float(total_expenses),
            "salaries_wages": float(salaries_wages),
            "procurement": float(procurement),
            "director_payouts": float(director_payouts)
        },
        "pl_summary": pl_summary,
        "expenses": table_rows
    }