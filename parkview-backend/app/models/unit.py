#Unit table(ID, unit_number, level, unit_type, is_active)
from sqlalchemy import Column,Integer, String, Boolean
from app.db.base import Base

class Unit(Base):
    __tablename__ = "units"
    
    id = Column(Integer, primary_key=True, index=True)
    unit_number = Column(String, nullable=False)
    floor = Column(String, nullable=False)
    unit_type = Column(String) #e.g, Retail or office
    is_active = Column(Boolean, default=True)

