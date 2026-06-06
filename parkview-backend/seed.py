import datetime
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.director import Invoice, PayoutRequest

def seed_database():
    print("Initiating transactional data stream into PostgreSQL...")
    db: Session = SessionLocal()
    try:
        # Clear existing entries to refresh empty tables cleanly
        db.query(Invoice).delete()
        db.query(PayoutRequest).delete()

        # 1. Add Invoices matching interface summaries (LOWERCASE status)
        invoices = [
            Invoice(entity="SuperMart Ltd", unit_number="A-101", category="Rent", amount=1076700.0, status="paid", due_date=datetime.date(2025, 4, 5)),
            Invoice(entity="Java House Café", unit_number="B-202", category="Hospitality Income", amount=410500.0, status="paid", due_date=datetime.date(2025, 4, 10)),
            Invoice(entity="Quick Bites", unit_number="Food-04", category="Rent", amount=33700.0, status="overdue", due_date=datetime.date(2025, 4, 5)),
        ]
        
        # 2. Add Payout Requests matching operational expenditures
        payouts = [
            PayoutRequest(category="Salary", amount=85000.0, payout_method="Bank Transfer", reason="Building Manager - April", date=datetime.date(2025, 4, 1)),
            PayoutRequest(category="Salary", amount=55000.0, payout_method="Bank Transfer", reason="Head of Security - April", date=datetime.date(2025, 4, 1)),
            PayoutRequest(category="Procurement", amount=20700.0, payout_method="Cheque", reason="Maintenance Supplies", date=datetime.date(2025, 4, 3)),
            PayoutRequest(category="Land Rent", amount=150000.0, payout_method="Bank Wire", reason="Quarterly Site Lease Ground payment", date=datetime.date(2025, 4, 1)),
            PayoutRequest(category="Director Payout", amount=300000.0, payout_method="Bank Wire", reason="Director monthly draw", date=datetime.date(2025, 4, 1)),
            PayoutRequest(category="Director Payout", amount=150000.0, payout_method="Bank Wire", reason="Director bonus - Q1 performance", date=datetime.date(2025, 4, 10)),
            PayoutRequest(category="Wage", amount=161000.0, payout_method="Mobile Money", reason="Casual worker distribution", date=datetime.date(2025, 4, 5)),
            PayoutRequest(category="Legal", amount=25000.0, payout_method="Bank Transfer", reason="Retainer fee", date=datetime.date(2025, 4, 1)),
        ]

        db.add_all(invoices)
        db.add_all(payouts)
        db.commit()
        print("Database matching operations complete! PostgreSQL seeded successfully.")
        
    except Exception as e:
        db.rollback()
        print(f"Data injection halted due to exception: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()