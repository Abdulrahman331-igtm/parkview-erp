# app/api/v1/endpoints/reports.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models
from app.api import deps
from datetime import date, datetime
from collections import defaultdict

router = APIRouter()

@router.get("/generate")
def generate_financial_report(
    type: str = Query(..., description="Report Type: Profit and Loss, AR Ageing Summary, Balance Sheet"),
    start_date: date = Query(None),
    end_date: date = Query(None),
    accounting_method: str = Query("Cash", description="Cash oor Accrual"),
    db: Session = Depends(deps.get_db)
):
    """Compiles structured datasets for PDF financial report rendering."""
    
    if type == "Profit and Loss":
        if not start_date or not end_date:
            raise HTTPException(status_code=400, detail="Start and End dates are required for P&L")
        
        if accounting_method == "Accrual":
            invoices = db.query(models.Invoice).filter(
                models.Invoice.due_date >= start_date,
                models.Invoice.due_date <= end_date
            ).all()
            
            expenses = db.query(models.Expense.category, models.Expense.amount).filter(
                models.Expense.expense_date >= start_date,
                models.Expense.expense_date <= end_date
            ).all()
        else: 
            invoices = db.query(models.Invoice).filter(
                models.Invoice.status == "Paid",
                models.Invoice.due_date >= start_date,
                models.Invoice.due_date <= end_date
            ).all()
            
            expenses = db.query(models.Expense.category, models.Expense.amount).filter(
                models.Expense.status == "Paid",
                models.Expense.expense_date >= start_date,
                models.Expense.expense_date <= end_date
            ).all()
            
        
        income_dict = defaultdict(float)
            
        for inv in invoices:
            if getattr(inv, 'line_items', None) and isinstance(inv.line_items, dict):
                for item_name, item_amt in inv.line_items.items():
                    income_dict[item_name] += float(item_amt)
            else:
                cat_name = inv.category if inv.category else "General Revenue"
                income_dict[cat_name] += float(inv.amount)
            
        income_data = [{"account": k, "amount": v} for k, v in income_dict.items()]
        total_income = sum(v for v in income_dict.values())
        
        
        expense_dict = defaultdict(float)
        for cat, amt in expenses:
            cat_name = cat if cat else "Uncategorized Expense"
            expense_dict[cat_name] += float(amt)

        expense_data = [{"account": k, "amount": v} for k, v in expense_dict.items()]
        total_expenses = sum(v for v in expense_dict.values())
        
        return {
            "report": f"Profit and Loss ({accounting_method} Basis)",
            "period": f"{start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}",
            "data": {
                "income": income_data,
                "total_income": total_income,
                "expenses": expense_data,
                "total_expenses": total_expenses,
                "net_earnings": total_income - total_expenses
            }
        }

    elif type == "AR Ageing Summary":
        if not end_date:
            raise HTTPException(status_code=400, detail="As Of date is required for A/R Ageing")

        # Fetch all pending/overdue invoices up to the requested "As Of" date
        open_invoices = db.query(models.Invoice).filter(
            models.Invoice.status.in_(["Pending", "Overdue"]),
            models.Invoice.due_date <= end_date
        ).all()

        # Group outstanding amounts by Tenant and age buckets
        ageing_ledger = {}
        
        for inv in open_invoices:
            # Resolve the entity name
            entity_name = "Walk-in Guest"
            if inv.tenant_id:
                tenant = db.query(models.Tenant).filter(models.Tenant.id == inv.tenant_id).first()
                entity_name = tenant.name if tenant else f"Tenant #{inv.tenant_id}"
                
            if entity_name not in ageing_ledger:
                ageing_ledger[entity_name] = {"current": 0, "days_1_30": 0, "days_31_60": 0, "days_61_90": 0, "days_91_over": 0, "total": 0}

            # Calculate days past due relative to the "As Of" date
            days_overdue = (end_date - inv.due_date).days
            amt = float(inv.amount)

            if days_overdue <= 0:
                ageing_ledger[entity_name]["current"] += amt
            elif 1 <= days_overdue <= 30:
                ageing_ledger[entity_name]["days_1_30"] += amt
            elif 31 <= days_overdue <= 60:
                ageing_ledger[entity_name]["days_31_60"] += amt
            elif 61 <= days_overdue <= 90:
                ageing_ledger[entity_name]["days_61_90"] += amt
            else:
                ageing_ledger[entity_name]["days_91_over"] += amt
                
            ageing_ledger[entity_name]["total"] += amt

        # Format into a clean list for the frontend table
        formatted_ledger = [{"client": k, **v} for k, v in ageing_ledger.items()]
        formatted_ledger.sort(key=lambda x: x["client"])

        return {
            "report": "A/R Ageing Summary",
            "as_of": end_date.strftime('%B %d, %Y'),
            "data": formatted_ledger
        }
        
    elif type == "Balance Sheet":
        if not end_date:
            raise HTTPException(status_code=400, detail="As Of date is required for Balance Sheet")
        
        # 1. ASSETS
        # Cash on Hand = All money ever received (Payments) minus all money ever spent (Paid Expenses) up to end_date
        total_revenue = db.query(func.sum(models.Payment.amount_paid)).filter(
            models.Payment.payment_date <= end_date
        ).scalar() or 0
        
        total_paid_expenses = db.query(func.sum(models.Expense.amount)).filter(
            models.Expense.status == "Paid",
            models.Expense.expense_date <= end_date
        ).scalar() or 0
        
        cash_on_hand = float(total_revenue) - float(total_paid_expenses)

        # Accounts Receivable = Unpaid invoices up to end_date
        accounts_receivable = db.query(func.sum(models.Invoice.amount)).filter(
            models.Invoice.status.in_(["Pending", "Overdue"]),
            models.Invoice.due_date <= end_date
        ).scalar() or 0

        total_assets = cash_on_hand + float(accounts_receivable)

        # 2. LIABILITIES
        # Accounts Payable = Unpaid expenses up to end_date
        accounts_payable = db.query(func.sum(models.Expense.amount)).filter(
            models.Expense.status.in_(["Pending", "Overdue"]),
            models.Expense.expense_date <= end_date
        ).scalar() or 0
        
        total_liabilities = float(accounts_payable)

        # 3. EQUITY
        # Retained Earnings / Net Income = Assets - Liabilities (This forces the sheet to perfectly balance)
        total_equity = total_assets - total_liabilities

        return {
            "report": "Balance Sheet",
            "as_of": end_date.strftime('%B %d, %Y'),
            "data": {
                "assets": {
                    "cash": cash_on_hand,
                    "accounts_receivable": float(accounts_receivable),
                    "total": total_assets
                },
                "liabilities": {
                    "accounts_payable": total_liabilities,
                    "total": total_liabilities
                },
                "equity": {
                    "retained_earnings": total_equity,
                    "total": total_equity
                }
            }
        }
        
    else:
        raise HTTPException(status_code=400, detail="Invalid report type requested.")