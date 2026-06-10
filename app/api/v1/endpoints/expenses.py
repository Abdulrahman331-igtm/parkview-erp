from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app import models, schemas
from app.api import deps

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
    
    if expense_in.category is not None:
        expense.category = expense_in.category
    if expense_in.description is not None:
        expense.description = expense_in.description
    if expense_in.amount is not None:
        expense.amount = expense_in.amount
    if expense_in.expense_date is not None:
        expense.expense_date = expense_in.expense_date
    
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
def get_expense_dashboard_summary(db: Session = Depends(deps.get_db)):
    """
    Computes real-time analytical P&L totals and categorizations 
    explicitly structured for the Expenses & Payouts dashboard UI workspace.
    """
    expenses = db.query(models.Expense).all()

    # 1. Initialize counters matching UI top cards summary metrics
    total_expenses_sum = 0
    salaries_wages_sum = 0
    procurement_sum = 0
    director_payouts_sum = 0

    # Categorized register mapping for P&L worksheet output
    pl_categories = {
        "Salary": 0,
        "Wage": 0,
        "Procurement": 0,
        "Legal": 0,
        "Land Rent": 0,
        "Director Payout": 0
    }

    table_rows = []

    # 2. Iterate through data to compile metrics loops
    for e in expenses:
        amt = int(e.amount)
        cat = e.category
        total_expenses_sum += amt

        # Mapping variations into P&L registry blocks safely
        if cat in ["Salary", "Wage"]:
            salaries_wages_sum += amt
        elif cat == "Procurement":
            procurement_sum += amt
        elif cat == "Director Payout":
            director_payouts_sum += amt

        # Track category summation counters for P&L list view
        if cat in pl_categories:
            pl_categories[cat] += amt
        else:
            pl_categories[cat] = amt

        table_rows.append({
            "id": e.id,
            "expense_code": f"E-{100 + e.id:03d}", # Format: E-002
            "category": cat,
            "description": e.description,
            "amount": amt,
            "date": e.expense_date.strftime("%Y-%m-%d") if hasattr(e.expense_date, 'strftime') else str(e.expense_date),
            "recurring": "Monthly" if getattr(e, 'is_recurring', False) else "One-Time",
            "is_recurring_bool": getattr(e, 'is_recurring', False),
            "approved_by": getattr(e, 'approved_by', "Admin")
        })

    # Format localized Profit and Loss structure response shape matches mockup requirements
    pl_summary_list = [
        {"name": "Salaries", "amount": pl_categories["Salary"]},
        {"name": "Wages", "amount": pl_categories["Wage"]},
        {"name": "Procurement", "amount": pl_categories["Procurement"]},
        {"name": "Legal", "amount": pl_categories["Legal"]},
        {"name": "Land Rent", "amount": pl_categories["Land Rent"]},
        {"name": "Director Payouts", "amount": pl_categories["Director Payout"]},
    ]

    return {
        "summary": {
            "total_expenses": total_expenses_sum,
            "salaries_wages": salaries_wages_sum,
            "procurement": procurement_sum,
            "director_payouts": director_payouts_sum
        },
        "expenses": table_rows,
        "pl_summary": pl_summary_list
    }