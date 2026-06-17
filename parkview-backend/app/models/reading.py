#Wide table(KPLC,Water,Date)
from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey, String
from sqlalchemy.sql import func
from app.db.base import Base

class Reading(Base):
    __tablename__ = "meter_readings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    reader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    kplc_reading = Column(Numeric(precision=12, scale=2), nullable=True)
    water_reading = Column(Numeric(precision=12, scale=2), nullable=True)
    
    reading_time = Column(DateTime(timezone=True), server_default=func.now())
    
    