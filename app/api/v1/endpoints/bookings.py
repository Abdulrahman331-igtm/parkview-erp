from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, date
from app import models, schemas
from app.api import deps

router = APIRouter()

# Helper function to check for date overlap
def has_date_overlap(
    existing_check_in: datetime,
    existing_check_out: datetime,
    new_check_in: datetime,
    new_check_out: datetime,
    exclude_booking_id: Optional[int] = None
) -> bool:
    """
    Check if two date ranges overlap.
    Two bookings overlap if one starts before the other ends.
    """
    return not (new_check_out <= existing_check_in or new_check_in >= existing_check_out)

# CREATE - Create a new booking
@router.post("/", response_model=schemas.BookingRead)
def create_booking(
    booking_in: schemas.BookingCreate,
    db: Session = Depends(deps.get_db),
):
    """Create a new booking for a guest."""
    
    # Verify unit exists
    unit = db.query(models.Unit).filter(models.Unit.id == booking_in.unit_id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found"
        )
    
    # Validate dates
    if booking_in.check_in >= booking_in.check_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-in date must be before check-out date"
        )
    
    # Check for overlapping bookings (exclude cancelled bookings)
    overlapping_bookings = db.query(models.Booking).filter(
        and_(
            models.Booking.unit_id == booking_in.unit_id,
            models.Booking.status != "Cancelled",
            or_(
                and_(
                    models.Booking.check_in < booking_in.check_out,
                    models.Booking.check_out > booking_in.check_in
                )
            )
        )
    ).first()
    
    if overlapping_bookings:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unit is already booked for this date range"
        )
    
    new_booking = models.Booking(
        **booking_in.dict(),
        status="Confirmed"
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking

# READ - List all bookings with optional filtering
@router.get("/", response_model=List[schemas.BookingRead])
def get_bookings(
    status_filter: Optional[str] = Query(None, alias="status"),
    unit_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(deps.get_db),
):
    """
    List all bookings, filterable by status (Confirmed, Checked In, Checked Out, Cancelled).
    """
    query = db.query(models.Booking)
    
    if status_filter:
        query = query.filter(models.Booking.status == status_filter)
    if unit_id:
        query = query.filter(models.Booking.unit_id == unit_id)
    
    return query.order_by(models.Booking.check_in.desc()).offset(skip).limit(limit).all()

# READ - Query available units for a specific date range
@router.get("/availability")
def get_available_units(
    check_in: datetime = Query(..., description="Check-in datetime"),
    check_out: datetime = Query(..., description="Check-out datetime"),
    unit_type: Optional[str] = Query(None, description="Filter by unit type (e.g., Apartment)"),
    db: Session = Depends(deps.get_db),
):
    """
    Query available units for a specific date range (overlap logic).
    Returns units that have no conflicting bookings during the requested period.
    """
    
    if check_in >= check_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-in must be before check-out"
        )
    
    # Get all active units
    unit_query = db.query(models.Unit).filter(models.Unit.is_active == True)
    
    if unit_type:
        unit_query = unit_query.filter(models.Unit.unit_type == unit_type)
    
    available_units = []
    
    for unit in unit_query.all():
        # Check if this unit has any non-cancelled bookings that overlap with the requested period
        overlapping = db.query(models.Booking).filter(
            and_(
                models.Booking.unit_id == unit.id,
                models.Booking.status != "Cancelled",
                or_(
                    and_(
                        models.Booking.check_in < check_out,
                        models.Booking.check_out > check_in
                    )
                )
            )
        ).first()
        
        if not overlapping:
            available_units.append(unit)
    
    return {
        "check_in": check_in,
        "check_out": check_out,
        "available_units": [schemas.Unit.from_orm(unit) for unit in available_units],
        "count": len(available_units)
    }

# UPDATE - Update booking details or change status
@router.put("/{booking_id}", response_model=schemas.BookingRead)
def update_booking(
    booking_id: int,
    booking_in: schemas.BookingUpdate,
    db: Session = Depends(deps.get_db),
):
    """
    Update booking details, extend stay, or change status.
    """
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # If updating dates, check for overlaps
    check_in = booking_in.check_in if booking_in.check_in else booking.check_in
    check_out = booking_in.check_out if booking_in.check_out else booking.check_out
    
    if check_in >= check_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-in date must be before check-out date"
        )
    
    # Check for overlapping bookings with other bookings (exclude this booking and cancelled ones)
    if booking_in.check_in or booking_in.check_out:
        overlapping = db.query(models.Booking).filter(
            and_(
                models.Booking.unit_id == booking.unit_id,
                models.Booking.id != booking_id,
                models.Booking.status != "Cancelled",
                or_(
                    and_(
                        models.Booking.check_in < check_out,
                        models.Booking.check_out > check_in
                    )
                )
            )
        ).first()
        
        if overlapping:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Unit is already booked for this date range"
            )
    
    # Update fields
    if booking_in.guest_name is not None:
        booking.guest_name = booking_in.guest_name
    if booking_in.guest_contact is not None:
        booking.guest_contact = booking_in.guest_contact
    if booking_in.check_in is not None:
        booking.check_in = booking_in.check_in
    if booking_in.check_out is not None:
        booking.check_out = booking_in.check_out
    if booking_in.nightly_rate is not None:
        booking.nightly_rate = booking_in.nightly_rate
    if booking_in.status is not None:
        booking.status = booking_in.status
    
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking

# DELETE - Cancel or remove a booking
@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(
    booking_id: int,
    db: Session = Depends(deps.get_db),
):
    """Cancel or remove a booking."""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    db.delete(booking)
    db.commit()

# CUSTOM ACTION - Check-in
@router.post("/{booking_id}/check-in", response_model=schemas.BookingRead)
def check_in_booking(
    booking_id: int,
    db: Session = Depends(deps.get_db),
):
    """Mark a booking as checked in."""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.status != "Confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only confirmed bookings can be checked in"
        )
    
    booking.status = "Checked In"
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking

# CUSTOM ACTION - Check-out
@router.post("/{booking_id}/check-out", response_model=schemas.BookingRead)
def check_out_booking(
    booking_id: int,
    db: Session = Depends(deps.get_db),
):
    """Mark a booking as checked out."""
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.status != "Checked In":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only checked-in bookings can be checked out"
        )
    
    booking.status = "Checked Out"
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking