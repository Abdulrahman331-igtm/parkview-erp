from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    guest_name = Column(String, nullable=False)
    guest_contact = Column(String)
    check_in = Column(DateTime, nullable=False)
    check_out = Column(DateTime, nullable=False)
    nightly_rate = Column(Numeric(precision=12, scale=2), nullable=False)
    status = Column(String, default="Confirmed")

    unit = relationship("Unit", back_populates="bookings")
    invoices = relationship("Invoice", back_populates="booking")