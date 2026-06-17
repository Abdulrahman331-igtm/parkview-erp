#Expected JSON for MAnual Entry
from pydantic import BaseModel
from typing import Optional

class UnitBase(BaseModel):
    unit_number: str
    floor: str
    unit_type: Optional[str] = "Mixed"
    area_sqft: Optional[int] = 0        
    status: Optional[str] = "Vacant"
    
class UnitCreate(UnitBase):
    pass

class UnitUpdate(BaseModel):
    unit_number: Optional[str] = None
    floor: Optional[str] = None
    unit_type: Optional[str] = None
    area_sqft: Optional[int] = None     
    status: Optional[str] = None        
    is_active: Optional[bool] = None 

class Unit(UnitBase):
  id: int
  is_active: bool
  
  class Config:
    from_attributes = True #allow pydantic to read SQLAlchemy models