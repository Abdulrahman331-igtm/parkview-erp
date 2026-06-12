from sqlalchemy import Column, Integer, String, Numeric, Date
from app.db.base import Base

class PayoutRequest(Base):
    __tablename__ = "payout_requests"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=True) 
    amount = Column(Numeric(precision=12, scale=2), nullable=False)
    payout_method = Column(String, nullable=False)
    reason = Column(String, nullable=False)  
    date = Column(Date, nullable=True)
    status = Column(String, default="Pending") 