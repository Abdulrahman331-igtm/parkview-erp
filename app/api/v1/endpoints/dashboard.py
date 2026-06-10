from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models
from app.api import deps
from datetime import date, timedelta
import calendar

router = APIRouter()

def get_date_ranges(period: str):
    """Accurately calculates start and end dates based on the React dropdown strings."""
    today = date.today()
    
    if period == "This month":
        curr_start = today.replace(day=1)
        curr_end = today.replace(day=calendar.monthrange(today.year, today.month)[1])
        first_of_this_month = today.replace(day=1)
        prev_end = first_of_this_month - timedelta(days=1)
        prev_start = prev_end.replace(day=1)
        
    elif period == "This fiscal quarter":
        curr_quarter = (today.month - 1) // 3 + 1
        curr_start_month = 3 * curr_quarter - 2
        curr_start = today.replace(month=curr_start_month, day=1)
        curr_end_month = curr_start_month + 2
        curr_end = today.replace(month=curr_end_month, day=calendar.monthrange(today.year, curr_end_month)[1])
        
        prev_end = curr_start - timedelta(days=1)
        prev_start_month = (prev_end.month - 1) // 3 * 3 + 1
        prev_start = prev_end.replace(month=prev_start_month, day=1)
        
    elif period == "Last financial year":
        curr_start = today.replace(year=today.year - 1, month=1, day=1)
        curr_end = today.replace(year=today.year - 1, month=12, day=31)
        prev_start = curr_start.replace(year=today.year - 2)
        prev_end = curr_end.replace(year=today.year - 2)
        
    else: # Default: "This financial year"
        curr_start = today.replace(month=1, day=1)
        curr_end = today.replace(month=12, day=31)
        prev_start = curr_start.replace(year=today.year - 1)
        prev_end = curr_end.replace(year=today.year - 1)
        
    return curr_start, curr_end, prev_start, prev_end

def calculate_trend(current_val: float, previous_val: float):
    if previous_val == 0:
        return 100 if current_val > 0 else 0, current_val >= 0
    percentage = ((current_val - previous_val) / previous_val) * 100
    return abs(round(percentage)), percentage >= 0

@router.get("/main-summary")
def get_main_dashboard_summary(
    pl_period: str = Query("This financial year"),
    exp_period: str = Query("This fiscal quarter"),
    sales_period: str = Query("This financial year"),
    db: Session = Depends(deps.get_db)
):
    # 1. RESOLVE DATE RANGES
    pl_curr_start, pl_curr_end, pl_prev_start, pl_prev_end = get_date_ranges(pl_period)
    exp_curr_start, exp_curr_end, exp_prev_start, exp_prev_end = get_date_ranges(exp_period)
    sales_curr_start, sales_curr_end, sales_prev_start, sales_prev_end = get_date_ranges(sales_period)

    # 2. PROFIT & LOSS
    current_income = db.query(func.sum(models.Invoice.amount)).filter(
        models.Invoice.status == "Paid", models.Invoice.due_date.between(pl_curr_start, pl_curr_end)
    ).scalar() or 0
    current_expenses = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.expense_date.between(pl_curr_start, pl_curr_end)
    ).scalar() or 0
    current_net_profit = float(current_income) - float(current_expenses)

    prev_income = db.query(func.sum(models.Invoice.amount)).filter(
        models.Invoice.status == "Paid", models.Invoice.due_date.between(pl_prev_start, pl_prev_end)
    ).scalar() or 0
    prev_expenses = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.expense_date.between(pl_prev_start, pl_prev_end)
    ).scalar() or 0
    prev_net_profit = float(prev_income) - float(prev_expenses)

    pl_trend_pct, pl_trend_up = calculate_trend(current_net_profit, prev_net_profit)

    # 3. EXPENSES OVERVIEW
    exp_total = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.expense_date.between(exp_curr_start, exp_curr_end)
    ).scalar() or 0
    prev_exp_total = db.query(func.sum(models.Expense.amount)).filter(
        models.Expense.expense_date.between(exp_prev_start, exp_prev_end)
    ).scalar() or 0
    exp_trend_pct, exp_trend_up = calculate_trend(float(exp_total), float(prev_exp_total))

    expense_groups = db.query(models.Expense.category, func.sum(models.Expense.amount).label("total")).filter(
        models.Expense.expense_date.between(exp_curr_start, exp_curr_end)
    ).group_by(models.Expense.category).all()
    
    expenses_breakdown = []
    colors = ["#0284c7", "#16a34a", "#7c3aed", "#ea580c", "#eab308", "#dc2626"]
    for idx, (cat, amt) in enumerate(expense_groups):
        expenses_breakdown.append({
            "name": cat, "amount": float(amt),
            "percentage": round((float(amt) / float(exp_total)) * 100) if float(exp_total) > 0 else 0,
            "color": colors[idx % len(colors)]
        })
    expenses_breakdown.sort(key=lambda x: x["amount"], reverse=True)

    # 4. SALES CHART LOGIC (Line Chart Monthly Grouping)
    sales_total = db.query(func.sum(models.Invoice.amount)).filter(
        models.Invoice.status == "Paid", models.Invoice.due_date.between(sales_curr_start, sales_curr_end)
    ).scalar() or 0
    
    # Get raw sales for the period to build the chart
    sales_invoices = db.query(models.Invoice.due_date, models.Invoice.amount).filter(
        models.Invoice.status == "Paid", models.Invoice.due_date.between(sales_curr_start, sales_curr_end)
    ).all()

    # Aggregate by month
    from collections import defaultdict
    monthly_sales = defaultdict(float)
    for due_date, amount in sales_invoices:
        monthly_sales[due_date.strftime("%b")] += float(amount)

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    chart_data = [{"month": m, "amount": monthly_sales.get(m, 0.0)} for m in month_names]

    # If looking at "This financial year", cut off future months so the line chart stops at the current month
    if "year" in sales_period.lower() and sales_curr_end.year >= date.today().year:
        chart_data = chart_data[:date.today().month]

    # 5. A/R & A/P
    ar_pending = db.query(func.sum(models.Invoice.amount)).filter(models.Invoice.status == "Pending").scalar() or 0
    ar_overdue = db.query(func.sum(models.Invoice.amount)).filter(models.Invoice.status == "Overdue").scalar() or 0
    
    # Ensure expense.status exists in your models.Expense!
    ap_pending = db.query(func.sum(models.Expense.amount)).filter(models.Expense.status == "Pending").scalar() or 0
    ap_overdue = db.query(func.sum(models.Expense.amount)).filter(models.Expense.status == "Overdue").scalar() or 0

    return {
        "profit_and_loss": {
            "net_profit": current_net_profit, "income": float(current_income), "expenses": float(current_expenses),
            "trend_percentage": pl_trend_pct, "trend_is_up": pl_trend_up
        },
        "expenses_overview": {
            "total_spending": float(exp_total), "trend_percentage": exp_trend_pct, "trend_is_up": exp_trend_up,
            "breakdown": expenses_breakdown
        },
        "sales": {
            "total": float(sales_total), "chart_data": chart_data
        },
        "accounts_receivable": {
            "total_outstanding": float(ar_pending) + float(ar_overdue), "current": float(ar_pending), "overdue": float(ar_overdue)
        },
        "accounts_payable": {
            "total_owed": float(ap_pending) + float(ap_overdue), "current": float(ap_pending), "overdue": float(ap_overdue)
        }
    }