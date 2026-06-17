#Unit table(ID, unit_number, level, unit_type, is_active)
from sqlalchemy import Column,Integer, String, Boolean
from app.db.base import Base
from sqlalchemy.orm import relationship

class Unit(Base):
    __tablename__ = "units"
    
    id = Column(Integer, primary_key=True, index=True)
    unit_number = Column(String, nullable=False)
    floor = Column(String, nullable=False)
    unit_type = Column(String) #e.g, Retail or office
    area_sqft = Column(Integer, nullable=True, default=0)
    status = Column(String, default="Vacant")
    is_active = Column(Boolean, default=True)
    
    leases = relationship("Lease", back_populates="unit")
    bookings = relationship("Booking", back_populates="unit")
    invoices = relationship("Invoice", back_populates="unit")

