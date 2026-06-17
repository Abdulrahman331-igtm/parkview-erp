from sqlalchemy import Column, Integer, String, Numeric, Date, Boolean
from app.db.base import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False)
    description = Column(String, nullable=False)
    amount = Column(Numeric(precision=12, scale=2), nullable=False)
    expense_date = Column(Date, nullable=False)
    
    approved_by = Column(String, nullable=True, default="Admin")
    is_recurring = Column(Boolean, nullable=True, default=False)
    status = Column(String, default="Paid")