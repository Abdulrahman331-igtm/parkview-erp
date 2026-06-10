#Expected JSON for Unit creation
from pydantic import BaseModel
from datetime import datetime
from typing import  Optional

class ReadingBase(BaseModel):
    unit_id: int
    reader_id: int
    kplc_reading: float
    water_reading: float

class ReadingCreate(ReadingBase):
    pass # meaning ReadingCreate is an exact copy of ReadingBase

class ReadingUpdate(BaseModel):
  kplc_reading: Optional[float] = None
  water_reading: Optional[float] = None

class Reading(ReadingBase):
    id: int
    reading_time: datetime

    class Config:
        from_attributes = True

