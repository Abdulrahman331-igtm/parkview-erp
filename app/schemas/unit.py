#Expected JSON for MAnual Entry
from pydantic import BaseModel
from typing import Optional

class UnitBase(BaseModel):
    unit_number: str
    floor: str
    unit_type: Optional[str] = "Mixed"
    
class UnitCreate(UnitBase):
    pass

class Unit(UnitBase):
  id: int
  is_active: bool
  
  class Config:
    from_attributes = True #allow pydantic to read SQLAlchemy models