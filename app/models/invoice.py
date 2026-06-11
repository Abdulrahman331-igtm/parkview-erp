from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    category = Column(String, nullable=False)
    amount = Column(Numeric(precision=12, scale=2), nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String, default="Pending")
    line_items = Column(JSON, default=dict)
    previous_balance = Column(Numeric(precision=12, scale=2), default=0.00)

    tenant = relationship("Tenant", back_populates="invoices")
    booking = relationship("Booking", back_populates="invoices")
    unit = relationship("Unit", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice")