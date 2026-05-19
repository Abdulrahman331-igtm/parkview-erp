#The meter reader portal logic
#POST - /api/v1/endpoints/readings.py -- save entries

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models,schemas
from app.api import deps
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/", response_model=schemas.Reading)
def record_meter_reading(
    reading_in: schemas.ReadingCreate, 
    db: Session = Depends(deps.get_db),
    #current_user: models.User = Depends(deps.get_current_active_user)                   
                         ):
    """Saves manual KPLC and water readings for a specific unit"""
    unit = db.query(models.Unit).filter(models.Unit.id == reading_in.unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    new_reading = models.Reading(
        unit_id=reading_in.unit_id,
        kplc_reading=reading_in.kplc_reading,
        water_reading=reading_in.water_reading,
        reader_id=reading_in.reader_id
    )
    db.add(new_reading)
    db.commit()
    db.refresh(new_reading)
    return new_reading
 
@router.get("/recent", response_model=List[schemas.Reading])
def get_recent_readings(days: int = 7, db: Session = Depends(deps.get_db)):
    """Backend filters the last 7 days of work"""
    since_date = datetime.now() - timedelta(days=days)
    return db.query(models.Reading).filter(models.Reading.reading_time >= since_date).all()