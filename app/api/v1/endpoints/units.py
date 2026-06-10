#Unit creation and management
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from app import models, schemas
from app.api import deps

router = APIRouter() 

@router.get("/grouped", response_model=Dict[str, List[schemas.Unit]])
def get_units_grouped(db: Session = Depends(deps.get_db)):
    """Returns units grouped by floor for the selection UI"""
    units = db.query(models.Unit).filter(models.Unit.is_active == True).all()
    grouped = {}
    for unit in units:
        if unit.floor not in grouped:
            grouped[unit.floor] = []
        grouped[unit.floor].append(unit)
    return grouped

# @router.get("/", response_model=List[schemas.Unit])
# def get_units(db:Session = Depends(deps.get_db)):
#     """Return a flat list of all units."""
#     return db.query(models.Unit).all()

@router.get("/active", response_model=List[schemas.Unit])
def get_active_units(db: Session = Depends(deps.get_db)):
    """Return a flat list of active units"""
    return db.query(models.Unit).filter(models.Unit.is_active == True).all()

@router.put("/{unit_id}", response_model=schemas.Unit)
def update_unit(
    unit_id: int,
    unit_in: schemas.UnitUpdate,
    db: Session = Depends(deps.get_db),
):
    """Update Units"""
    unit = db.query(models.Unit).filter(models.Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    if unit_in.unit_number is not None:
        unit.unit_number = unit_in.unit_number
    if unit_in.floor is not None:
        unit.floor = unit_in.floor
    if unit_in.unit_type is not None:
        unit.unit_type = unit_in.unit_type
    if unit_in.area_sqft is not None:
        unit.area_sqft = unit_in.area_sqft
    if unit_in.status is not None:
        unit.status = unit_in.status
    if unit_in.is_active is not None:
        unit.is_active = unit_in.is_active

    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit

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

#used it
@router.get("/dashboard-summary", response_model=dict) #used
def get_unit_dashboard_summary(db: Session = Depends(deps.get_db)):
    """
    Returns aggregated metrics and explicit unit profiles formatted 
    precisely for the asset management UI.
    """
    all_units = db.query(models.Unit).filter(models.Unit.is_active == True).all()
    
    total_units = len(all_units)
    occupied_count = sum(1 for u in all_units if u.status == "Occupied")
    vacant_count = sum(1 for u in all_units if u.status == "Vacant")
    maintenance_count = sum(1 for u in all_units if u.status == "Maintenance")
    
    unique_floors = len(set(u.floor for u in all_units))
    
    occupancy_rate = round((occupied_count / total_units * 100), 1) if total_units > 0 else 0

    table_rows = []
    for u in all_units:
        active_lease = next((l for l in u.leases if getattr(l, 'is_active', 'Active')), None)
        tenant_name = "—"
        
        if active_lease:
            db_tenant = db.query(models.Tenant).filter(models.Tenant.id == active_lease.tenant_id).first()
            if db_tenant:
                tenant_name = db_tenant.name

        table_rows.append({
            "id": u.id,
            "unit_number": u.unit_number,
            "floor": u.floor,
            "unit_type": u.unit_type,
            "area_sqft": u.area_sqft,
            "status": u.status,
            "tenant_name": tenant_name
        })

    return {
        "summary": {
            "total_units": total_units,
            "unique_floors": unique_floors,
            "occupied_count": occupied_count,
            "occupancy_rate": occupancy_rate,
            "vacant_count": vacant_count,
            "maintenance_count": maintenance_count
        },
        "units": table_rows
    }

@router.delete("/{unit_id}", status_code=204)
def delete_unit(unit_id: int, db: Session = Depends(deps.get_db)):
    """
    Permanently delete a unit from the database, 
    or softly deactivate it depending on business rules.
    """
    unit = db.query(models.Unit).filter(models.Unit.id == unit_id).first()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    # OPTION A: Hard Delete (Permanently wipes it from the DB)
    # db.delete(unit)
    # db.commit()
    
    # OPTION B: Soft Delete (Recommended if you have historical invoice/lease records connected to it!)
    unit.is_active = False
    db.add(unit)
    db.commit()
    
    # 204 Status means "Success, but there is no content to send back in the body"
    return None