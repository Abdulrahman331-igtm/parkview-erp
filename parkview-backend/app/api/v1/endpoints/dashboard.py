from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models
from app.api import deps
from datetime import date, timedelta
import calendar

router = APIRouter()

def add_months(d, months_to_add):
    """Helper to safely add/subtract months regardless of calendar limits."""
    new_month = d.month - 1 + months_to_add
    new_year = d.year + new_month // 12
    new_month = new_month % 12 + 1
    new_day = min(d.day, calendar.monthrange(new_year, new_month)[1])
    return date(new_year, new_month, new_day)

def get_date_ranges(period: str):
    """Translates the 10 UI string rules into exact SQL calendar boundaries."""
    today = date.today()
    
    # Defaults
    curr_start = today.replace(day=1)
    curr_end = today.replace(day=calendar.monthrange(today.year, today.month)[1])
    prev_start = add_months(curr_start, -1)
    prev_end = add_months(curr_end, -1)

    if period == "Last 30 days":
        curr_end = today
        curr_start = today - timedelta(days=30)
        prev_end = curr_start - timedelta(days=1)
        prev_start = prev_end - timedelta(days=30)
        
    elif period == "This month":
        pass # Captured by defaults
        
    elif period == "This month to date":
        curr_end = today
        prev_end = prev_start.replace(day=min(today.day, calendar.monthrange(prev_start.year, prev_start.month)[1]))
        
    elif period == "This fiscal quarter":
        sm = 3 * ((today.month - 1) // 3) + 1
        curr_start = today.replace(month=sm, day=1)
        curr_end = add_months(curr_start, 2)
        curr_end = curr_end.replace(day=calendar.monthrange(curr_end.year, curr_end.month)[1])
        prev_start = add_months(curr_start, -3)
        prev_end = add_months(curr_end, -3)
        
    elif period == "This fiscal quarter to date":
        sm = 3 * ((today.month - 1) // 3) + 1
        curr_start = today.replace(month=sm, day=1)
        curr_end = today
        prev_start = add_months(curr_start, -3)
        prev_end = add_months(today, -3)
        
    elif period == "This financial year":
        curr_start = today.replace(month=1, day=1)
        curr_end = today.replace(month=12, day=31)
        prev_start = curr_start.replace(year=today.year - 1)
        prev_end = curr_end.replace(year=today.year - 1)
        
    elif period == "This financial year to date":
        curr_start = today.replace(month=1, day=1)
        curr_end = today
        prev_start = curr_start.replace(year=today.year - 1)
        prev_end = today.replace(year=today.year - 1)
        
    elif period == "Last month":
        curr_start = add_months(today.replace(day=1), -1)
        curr_end = curr_start.replace(day=calendar.monthrange(curr_start.year, curr_start.month)[1])
        prev_start = add_months(curr_start, -1)
        prev_end = prev_start.replace(day=calendar.monthrange(prev_start.year, prev_start.month)[1])
        
    elif period == "Last fiscal quarter":
        sm = 3 * ((today.month - 1) // 3) + 1
        curr_start = add_months(today.replace(month=sm, day=1), -3)
        curr_end = add_months(curr_start, 2)
        curr_end = curr_end.replace(day=calendar.monthrange(curr_end.year, curr_end.month)[1])
        prev_start = add_months(curr_start, -3)
        prev_end = add_months(curr_end, -3)
        
    elif period == "Last financial year":
        curr_start = today.replace(year=today.year - 1, month=1, day=1)
        curr_end = today.replace(year=today.year - 1, month=12, day=31)
        prev_start = curr_start.replace(year=today.year - 2)
        prev_end = curr_end.replace(year=today.year - 2)

    return curr_start, curr_end, prev_start, prev_end

def calculate_trend(current_val: float, previous_val: float):
    if previous_val == 0:
        return 100 if current_val > 0 else 0, current_val >= 0
    percentage = ((current_val - previous_val) / previous_val) * 100
    return abs(round(percentage)), percentage >= 0

@router.get("/main-summary")
def get_main_dashboard_summary(
    pl_period: str = Query("This month"),
    exp_period: str = Query("This month"),
    sales_period: str = Query("This month"),
    ar_period: str = Query("This month"),
    ap_period: str = Query("This month"),
    db: Session = Depends(deps.get_db)
):
    pl_curr_start, pl_curr_end, pl_prev_start, pl_prev_end = get_date_ranges(pl_period)
    exp_curr_start, exp_curr_end, exp_prev_start, exp_prev_end = get_date_ranges(exp_period)
    sales_curr_start, sales_curr_end, sales_prev_start, sales_prev_end = get_date_ranges(sales_period)
    ar_curr_start, ar_curr_end, _, _ = get_date_ranges(ar_period)
    ap_curr_start, ap_curr_end, _, _ = get_date_ranges(ap_period)

    # 🛠️ DEFINE VIRTUAL METHODS TO EXCLUDE FROM CASH CALCULATIONS
    virtual_methods = ["Credit Drawdown", "System Offset", "System Adjustment"]

    # ---------------------------------------------------------
    # 1. P&L (Strict Cash Basis)
    # ---------------------------------------------------------
    current_income = db.query(func.sum(models.Payment.amount_paid)).filter(
        models.Payment.payment_date.between(pl_curr_start, pl_curr_end),
        models.Payment.payment_method.notin_(virtual_methods) # 🛠️ Ignore internal system math
    ).scalar() or 0
    
    current_expenses = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.status == "Paid",
        models.Expense.expense_date.between(pl_curr_start, pl_curr_end)
    ).scalar() or 0
    
    current_net_profit = float(current_income) - float(current_expenses)

    prev_income = db.query(func.sum(models.Payment.amount_paid)).filter(
        models.Payment.payment_date.between(pl_prev_start, pl_prev_end),
        models.Payment.payment_method.notin_(virtual_methods) # 🛠️ Ignore internal system math
    ).scalar() or 0
    
    prev_expenses = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.status == "Paid",
        models.Expense.expense_date.between(pl_prev_start, pl_prev_end)
    ).scalar() or 0
    
    prev_net_profit = float(prev_income) - float(prev_expenses)
    pl_trend_pct, pl_trend_up = calculate_trend(current_net_profit, prev_net_profit)

    # ---------------------------------------------------------
    # 2. EXPENSES (Cash Basis Outflows)
    # ---------------------------------------------------------
    exp_total = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.status == "Paid",
        models.Expense.expense_date.between(exp_curr_start, exp_curr_end)
    ).scalar() or 0
    
    prev_exp_total = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.status == "Paid",
        models.Expense.expense_date.between(exp_prev_start, exp_prev_end)
    ).scalar() or 0
    
    exp_trend_pct, exp_trend_up = calculate_trend(float(exp_total), float(prev_exp_total))

    expense_groups = db.query(models.Expense.category, func.sum(models.Expense.amount).label("total")).filter(
        models.Expense.status == "Paid",
        models.Expense.expense_date.between(exp_curr_start, exp_curr_end)
    ).group_by(models.Expense.category).all()
    
    expenses_breakdown = []
    colors = ["#0284c7", "#16a34a", "#7c3aed", "#ea580c", "#eab308", "#dc2626", "#0d9488"]
    for idx, (cat, amt) in enumerate(expense_groups):
        expenses_breakdown.append({
            "name": cat, "amount": float(amt),
            "percentage": round((float(amt) / float(exp_total)) * 100) if float(exp_total) > 0 else 0,
            "color": colors[idx % len(colors)]
        })
    expenses_breakdown.sort(key=lambda x: x["amount"], reverse=True)

    # ---------------------------------------------------------
    # 3. SALES / REVENUE CHART (Cash Basis)
    # ---------------------------------------------------------
    sales_total = db.query(func.sum(models.Payment.amount_paid)).filter(
        models.Payment.payment_date.between(sales_curr_start, sales_curr_end),
        models.Payment.payment_method.notin_(virtual_methods) # 🛠️ Ignore internal system math
    ).scalar() or 0
    
    sales_payments = db.query(models.Payment.payment_date, models.Payment.amount_paid).filter(
        models.Payment.payment_date.between(sales_curr_start, sales_curr_end),
        models.Payment.payment_method.notin_(virtual_methods) # 🛠️ Ignore internal system math
    ).all()
    
    from collections import defaultdict
    monthly_sales = defaultdict(float)
    for p_date, amount in sales_payments:
        if p_date: 
            monthly_sales[p_date.strftime("%b")] += float(amount)
    
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    chart_data = [{"month": m, "amount": monthly_sales.get(m, 0.0)} for m in month_names]
    if "year" in sales_period.lower() and sales_curr_end.year >= date.today().year:
        chart_data = chart_data[:date.today().month]

    # ---------------------------------------------------------
    # 4. A/R & A/P (Accrual basis - Unpaid promises)
    # ---------------------------------------------------------
    ar_pending = db.query(func.sum(models.Invoice.amount)).filter(
        models.Invoice.status == "Pending", models.Invoice.due_date.between(ar_curr_start, ar_curr_end)
    ).scalar() or 0
    
    ar_overdue = db.query(func.sum(models.Invoice.amount)).filter(
        models.Invoice.status == "Overdue", models.Invoice.due_date.between(ar_curr_start, ar_curr_end)
    ).scalar() or 0
    
    ap_pending = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.status == "Pending", models.Expense.expense_date.between(ap_curr_start, ap_curr_end)
    ).scalar() or 0
    
    ap_overdue = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.status == "Overdue", models.Expense.expense_date.between(ap_curr_start, ap_curr_end)
    ).scalar() or 0

    return {
        "profit_and_loss": {"net_profit": current_net_profit, "income": float(current_income), "expenses": float(current_expenses), "trend_percentage": pl_trend_pct, "trend_is_up": pl_trend_up},
        "expenses_overview": {"total_spending": float(exp_total), "trend_percentage": exp_trend_pct, "trend_is_up": exp_trend_up, "breakdown": expenses_breakdown},
        "sales": {"total": float(sales_total), "chart_data": chart_data},
        "accounts_receivable": {"total_outstanding": float(ar_pending) + float(ar_overdue), "current": float(ar_pending), "overdue": float(ar_overdue)},
        "accounts_payable": {"total_owed": float(ap_pending) + float(ap_overdue), "current": float(ap_pending), "overdue": float(ap_overdue)}
    }