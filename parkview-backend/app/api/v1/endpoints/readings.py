from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app import models,schemas
from app.api import deps
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter()

@router.put("/{reading_id}", response_model=schemas.Reading)
def update_reading(
    reading_id: int,
    reading_in: schemas.ReadingUpdate,
    db: Session = Depends(deps.get_db),
):
    """Update a reading"""
    reading = db.query(models.Reading).filter(models.Reading.id == reading_id).first()
    if not reading:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading not found")

    if reading_in.kplc_reading is not None:
        reading.kplc_reading = reading_in.kplc_reading
    if reading_in.water_reading is not None:
        reading.water_reading = reading_in.water_reading

    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading

@router.get("/", response_model=List[schemas.Reading])
def get_readings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(deps.get_db)    
):
    """Return a flat list of readings with optional pagination"""
    return(
        db.query(models.Reading)
        .order_by(models.Reading.reading_time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

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

@router.delete("/{reading_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reading(reading_id: int, db: Session = Depends(deps.get_db)):
    """Delete a reading"""
    reading = db.query(models.Reading).filter(models.Reading.id == reading_id).first()
    if not reading:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading not found")

    db.delete(reading)
    db.commit()
    return
 
@router.get("/recent", response_model=List[schemas.Reading])
def get_recent_readings(days: int = 7, db: Session = Depends(deps.get_db)):
    """Backend filters the last 7 days of work"""
    since_date = datetime.now() - timedelta(days=days)
    return db.query(models.Reading).filter(models.Reading.reading_time >= since_date).all()

@router.get("/dashboard-summary")
def get_meter_dashboard_summary(db: Session = Depends(deps.get_db)):
    """
    Calculates operational and financial utility metrics dynamically
    by evaluating historical consumption shifts directly from database rows.
    """
    # 1. Fetch live historical readings chronologically (ascending to track previous baselines)
    readings = db.query(models.Reading).order_by(models.Reading.reading_time.asc()).all()
    active_units = db.query(models.Unit).filter(models.Unit.is_active == True).all()

    # Regional utility billing rates (KES per unit consumed)
    KPLC_UNIT_COST = 22.0  
    WATER_UNIT_COST = 60.0 

    # 2. Count active physical meter nodes by structure layout types
    kplc_meters_count = sum(1 for u in active_units if u.unit_type in ["Anchor", "Shop", "Office"])
    water_meters_count = sum(1 for u in active_units if u.unit_type in ["Shop"])

    # 3. State tracking register for calculating usage deltas
    # historical_tracker[unit_id] = {"KPLC": last_value, "Water": last_value}
    historical_tracker = defaultdict(lambda: {"KPLC": None, "Water": None})
    
    all_meters_map = {}
    recent_readings_list = []
    submission_log_list = []
    
    total_kplc_usage = 0.0
    total_water_usage = 0.0

    # 4. Iterate and compute changes chronologically
    for idx, r in enumerate(readings):
        unit_id = r.unit_id
        
        # Defensive Fallback Queries: Direct lookup using plain foreign keys
        db_unit = db.query(models.Unit).filter(models.Unit.id == unit_id).first()
        db_reader = db.query(models.User).filter(models.User.id == r.reader_id).first()
        
        unit_num = db_unit.unit_number if db_unit else f"Unit {unit_id}"
        floor_level = db_unit.floor if db_unit else "G"
        reader_title = db_reader.username if db_reader else "Meter Reader"
        read_date_str = r.reading_time.strftime("%Y-%m-%d") if r.reading_time else ""

        # --- ARRANGE KPLC DELTAS ---
        if r.kplc_reading is not None:
            current_kplc = float(r.kplc_reading)
            prev_kplc = historical_tracker[unit_id]["KPLC"]
            
            if prev_kplc is not None:
                consumption = max(0.0, current_kplc - prev_kplc)
                cost = consumption * KPLC_UNIT_COST
                total_kplc_usage += consumption
                
                recent_readings_list.append({
                    "date": read_date_str,
                    "unit_number": unit_num,
                    "type": "KPLC",
                    "previous": prev_kplc,
                    "current": current_kplc,
                    "consumption": consumption,
                    "cost_kes": int(cost)
                })
                
                all_meters_map[f"M-KPLC-{unit_id}"] = {
                    "meter_id": f"M-KPLC-{unit_id}",
                    "unit_number": unit_num,
                    "type": "KPLC",
                    "last_reading": prev_kplc,
                    "current_reading": current_kplc,
                    "consumption": consumption,
                    "last_read_date": read_date_str
                }
            historical_tracker[unit_id]["KPLC"] = current_kplc

        # --- ARRANGE WATER DELTAS ---
        if r.water_reading is not None:
            current_water = float(r.water_reading)
            prev_water = historical_tracker[unit_id]["Water"]
            
            if prev_water is not None:
                consumption = max(0.0, current_water - prev_water)
                cost = consumption * WATER_UNIT_COST
                total_water_usage += consumption
                
                recent_readings_list.append({
                    "date": read_date_str,
                    "unit_number": unit_num,
                    "type": "Water",
                    "previous": prev_water,
                    "current": current_water,
                    "consumption": consumption,
                    "cost_kes": int(cost)
                })
                
                all_meters_map[f"M-WAT-{unit_id}"] = {
                    "meter_id": f"M-WAT-{unit_id}",
                    "unit_number": unit_num,
                    "type": "Water",
                    "last_reading": prev_water,
                    "current_reading": current_water,
                    "consumption": consumption,
                    "last_read_date": read_date_str
                }
            historical_tracker[unit_id]["Water"] = current_water

        # --- COMPILE INDEPENDENT SUBMISSION HISTORY LOG ---
        submission_log_list.append({
            "timestamp": r.reading_time.strftime("%d/%m/%Y, %H:%M:%S") if r.reading_time else "",
            "unit_number": unit_num,
            "level": f"L{floor_level}",
            "reader_name": reader_title.title(),
            "reader_id": f"MR-{100 + r.reader_id}",
            "kplc_value": float(r.kplc_reading) if r.kplc_reading is not None else None,
            "water_value": float(r.water_reading) if r.water_reading is not None else None
        })

    # Reverse arrays so the newest entries show up at the top of the frontend dashboard
    recent_readings_list.reverse()
    submission_log_list.reverse()

    # 5. Core Operational Financial Summary
    kplc_cost_total = int(total_kplc_usage * KPLC_UNIT_COST)
    water_cost_total = int(total_water_usage * WATER_UNIT_COST)

    return {
        "summary": {
            "kplc_meters_count": kplc_meters_count,
            "water_meters_count": water_meters_count,
            "total_kplc_usage": int(total_kplc_usage),
            "total_kplc_cost": kplc_cost_total,
            "total_water_usage": int(total_water_usage),
            "total_water_cost": water_cost_total
        },
        "all_meters": list(all_meters_map.values()),
        "recent_readings": recent_readings_list,
        "submission_log": submission_log_list,
        "reports": {
            "kplc": { 
                "tenant_consumption": int(total_kplc_usage), 
                "common_area": 0, 
                "total_bill": kplc_cost_total 
            },
            "water": { 
                "tenant_water": int(total_water_usage), 
                "common_area": 0, 
                "net_billable": water_cost_total 
            }
        }
    }