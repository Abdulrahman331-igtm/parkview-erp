from sqlalchemy import Column, Integer, Float, String, Date
from app.db.base import Base

class PayoutRequest(Base):
    __tablename__ = "payout_requests"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=True) 
    amount = Column(Float, nullable=False)
    payout_method = Column(String, nullable=False)
    reason = Column(String, nullable=False)  
    date = Column(Date, nullable=True)       

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    entity = Column(String, nullable=True)   
    unit_number = Column(String, nullable=False)
    category = Column(String, nullable=True) 
    amount = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    due_date = Column(Date, nullable=False)