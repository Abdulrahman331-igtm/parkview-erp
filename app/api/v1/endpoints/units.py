#Unit creation and management
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from app import models, schemas
from app.api import deps

router = APIRouter() 

@router.get("/grouped", response_model=Dict[str, List[schemas.Unit]])
def get_units_grouped(db: Session = Depends(deps.get_db)):
    """Returns units groouped by floor for the selection UI"""
    units = db.query(models.Unit).filter(models.Unit.is_active == True).all()
    grouped = {}
    for unit in units:
        if unit.floor not in grouped:
            grouped[unit.floor] = []
        grouped[unit.floor].append(unit)
    return grouped

@router.post("/", response_model=schemas.Unit)
def create_unit(unit_in: schemas.UnitCreate, db: Session = Depends(deps.get_db)):
    """Admin endpoint to add a new unit to the building"""
    db_unit = db.query (models.Unit).filter(models.Unit.unit_number == unit_in.unit_number).first()
    if db_unit:
        raise HTTPException(status_code=400, detail="Unit number already exists")
    
    new_unit = models.Unit(**unit_in.dict())
    db.add(new_unit)
    db.commit()
    db.refresh(new_unit)
    return new_unit
