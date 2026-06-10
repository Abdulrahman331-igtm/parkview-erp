# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlalchemy.orm import Session
# from typing import List
# from app import models, schemas
# from app.api import deps
# from datetime import datetime, date, timedelta

# router = APIRouter()

# @router.get("/dashboard-summary")
# def get_lease_dashboard_summary(db: Session = Depends(deps.get_db)):
#     """
#     Assembles real-time relational metrics from Leases, Tenants, 
#     and Units for the Lease Agreements workflow UI.
#     """
#     leases = db.query(models.Lease).all()
#     tenants = db.query(models.Tenant).all()
#     active_units = db.query(models.Unit).filter(models.Unit.is_active == True).all()

#     # Current reference target configuration date (June 2026 baseline context window boundary)
#     current_reference_date = date(2026, 6, 2)
#     expiration_warning_threshold = current_reference_date + timedelta(days=60)

#     # 1. Initialize structural metrics
#     total_leases = len(leases)
#     active_count = 0
#     expiring_soon_count = 0
#     expired_count = 0

#     table_rows = []

#     # 2. Iterate and process fields dynamically
#     for idx, l in enumerate(leases):
#         # Resolve related models defensively using local queries 
#         db_tenant = db.query(models.Tenant).filter(models.Tenant.id == l.tenant_id).first()
#         db_unit = db.query(models.Unit).filter(models.Unit.id == l.unit_id).first()

#         tenant_name = db_tenant.name if db_tenant else f"Tenant Ref #{l.tenant_id}"
#         unit_number = db_unit.unit_number if db_unit else f"Unit #{l.unit_id}"
#         unit_type = db_unit.unit_type if db_unit else "Shop"

#         # Explicit string serialization format conversion
#         start_str = l.start_date.strftime("%Y-%m-%d") if hasattr(l.start_date, 'strftime') else str(l.start_date)
#         end_str = l.end_date.strftime("%Y-%m-%d") if hasattr(l.end_date, 'strftime') else str(l.end_date)
        
#         # Determine Lease status state based on time frames
#         calculated_status = l.status # Fallback baseline fallback configuration
        
#         # Date boundaries check engine logic blocks
#         target_end_date = l.end_date if isinstance(l.end_date, date) else datetime.strptime(str(l.end_date), "%Y-%m-%d").date()
        
#         if target_end_date < current_reference_date:
#             calculated_status = "Expired"
#             expired_count += 1
#         elif current_reference_date <= target_end_date <= expiration_warning_threshold:
#             calculated_status = "Expiring"
#             expiring_soon_count += 1
#         else:
#             if calculated_status == "Active":
#                 active_count += 1

#         table_rows.append({
#             "id": l.id,
#             "lease_code": f"L-{100 + l.id:03d}", # Format: L-001
#             "tenant_name": tenant_name,
#             "tenant_id": l.tenant_id,
#             "unit_number": unit_number,
#             "unit_id": l.unit_id,
#             "unit_type": unit_type,
#             "period": f"{start_str} to {end_str}",
#             "start_date": start_str,
#             "end_date": end_str,
#             "base_rent": int(l.monthly_rent),
#             "billing_logic": "2 invoices: Rent + Utilities" if unit_type == "Anchor" else "1 invoice: Rent + Utilities",
#             "status": calculated_status
#         })

#     # Assemble array profiles for modal select list fields selectors
#     tenant_options = [{"id": t.id, "label": t.name} for t in tenants]
#     unit_options = [{"id": u.id, "label": f"{u.unit_number} — L{u.floor} {u.unit_type}"} for u in active_units]

#     return {
#         "summary": {
#             "total_leases": total_leases,
#             "active_count": active_count,
#             "expiring_soon_count": expiring_soon_count,
#             "expired_count": expired_count
#         },
#         "leases": table_rows,
#         "tenants": tenant_options,
#         "units": unit_options
#     }

# # CREATE - Create a new lease
# @router.post("/", response_model=schemas.LeaseRead)
# def create_lease(
#     lease_in: schemas.LeaseCreate,
#     db: Session = Depends(deps.get_db),
# ):
#     """Create a new lease, linking a tenant to a unit."""
#     # Verify tenant exists
#     tenant = db.query(models.Tenant).filter(models.Tenant.id == lease_in.tenant_id).first()
#     if not tenant:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Tenant not found"
#         )
    
#     # Verify unit exists
#     unit = db.query(models.Unit).filter(models.Unit.id == lease_in.unit_id).first()
#     if not unit:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Unit not found"
#         )
    
#     # Validate dates
#     if lease_in.start_date >= lease_in.end_date:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Start date must be before end date"
#         )
    
#     new_lease = models.Lease(**lease_in.dict())
#     db.add(new_lease)
#     db.commit()
#     db.refresh(new_lease)
#     return new_lease

# # READ - List all active and historical leases
# @router.get("/", response_model=List[schemas.LeaseRead])
# def get_leases(db: Session = Depends(deps.get_db)):
#     """List all active and historical leases."""
#     return db.query(models.Lease).all()

# # UPDATE - Update lease terms or change status
# @router.put("/{lease_id}", response_model=schemas.LeaseRead)
# def update_lease(
#     lease_id: int,
#     lease_in: schemas.LeaseUpdate,
#     db: Session = Depends(deps.get_db),
# ):
#     """Update lease terms or change status (e.g., 'Terminated')."""
#     lease = db.query(models.Lease).filter(models.Lease.id == lease_id).first()
#     if not lease:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Lease not found"
#         )
    
#     if lease_in.tenant_id is not None:
#         # Verify tenant exists
#         tenant = db.query(models.Tenant).filter(models.Tenant.id == lease_in.tenant_id).first()
#         if not tenant:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Tenant not found"
#             )
#         lease.tenant_id = lease_in.tenant_id
    
#     if lease_in.unit_id is not None:
#         # Verify unit exists
#         unit = db.query(models.Unit).filter(models.Unit.id == lease_in.unit_id).first()
#         if not unit:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Unit not found"
#             )
#         lease.unit_id = lease_in.unit_id
    
#     if lease_in.start_date is not None:
#         lease.start_date = lease_in.start_date
#     if lease_in.end_date is not None:
#         lease.end_date = lease_in.end_date
#     if lease_in.monthly_rent is not None:
#         lease.monthly_rent = lease_in.monthly_rent
#     if lease_in.status is not None:
#         lease.status = lease_in.status
    
#     db.add(lease)
#     db.commit()
#     db.refresh(lease)
#     return lease


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.api import deps
from datetime import datetime, date, timedelta

router = APIRouter()

@router.get("/dashboard-summary")
def get_lease_dashboard_summary(db: Session = Depends(deps.get_db)):
    """
    Assembles real-time relational metrics from Leases, Tenants, 
    and Units for the Lease Agreements workflow UI.
    """
    leases = db.query(models.Lease).all()
    tenants = db.query(models.Tenant).all()
    active_units = db.query(models.Unit).filter(models.Unit.is_active == True).all()

    current_reference_date = date(2026, 6, 2)
    expiration_warning_threshold = current_reference_date + timedelta(days=60)

    total_leases = len(leases)
    active_count = 0
    expiring_soon_count = 0
    expired_count = 0

    table_rows = []

    for idx, l in enumerate(leases):
        db_tenant = db.query(models.Tenant).filter(models.Tenant.id == l.tenant_id).first()
        db_unit = db.query(models.Unit).filter(models.Unit.id == l.unit_id).first()

        tenant_name = db_tenant.name if db_tenant else f"Tenant Ref #{l.tenant_id}"
        unit_number = db_unit.unit_number if db_unit else f"Unit #{l.unit_id}"
        unit_type = db_unit.unit_type if db_unit else "Shop"

        start_str = l.start_date.strftime("%Y-%m-%d") if hasattr(l.start_date, 'strftime') else str(l.start_date)
        end_str = l.end_date.strftime("%Y-%m-%d") if hasattr(l.end_date, 'strftime') else str(l.end_date)
        
        calculated_status = l.status 
        target_end_date = l.end_date if isinstance(l.end_date, date) else datetime.strptime(str(l.end_date), "%Y-%m-%d").date()
        
        # Only compute dates if the lease hasn't already been explicitly Closed/Terminated
        if calculated_status not in ["Closed", "Terminated"]:
            if target_end_date < current_reference_date:
                calculated_status = "Expired"
                expired_count += 1
            elif current_reference_date <= target_end_date <= expiration_warning_threshold:
                calculated_status = "Expiring"
                expiring_soon_count += 1
            else:
                if calculated_status == "Active":
                    active_count += 1
        else:
            # If manually terminated or closed, skip date analysis logic rules
            pass

        table_rows.append({
            "id": l.id,
            "lease_code": f"L-{100 + l.id:03d}", 
            "tenant_name": tenant_name,
            "tenant_id": l.tenant_id,
            "unit_number": unit_number,
            "unit_id": l.unit_id,
            "unit_type": unit_type,
            "period": f"{start_str} to {end_str}",
            "start_date": start_str,
            "end_date": end_str,
            "base_rent": int(l.monthly_rent),
            "billing_logic": "2 invoices: Rent + Utilities" if unit_type == "Anchor" else "1 invoice: Rent + Utilities",
            "status": calculated_status
        })

    tenant_options = [{"id": t.id, "label": t.name} for t in tenants]
    unit_options = [{"id": u.id, "label": f"{u.unit_number} — {u.floor} {u.unit_type}"} for u in active_units]

    return {
        "summary": {
            "total_leases": total_leases,
            "active_count": active_count,
            "expiring_soon_count": expiring_soon_count,
            "expired_count": expired_count
        },
        "leases": table_rows,
        "tenants": tenant_options,
        "units": unit_options
    }

@router.post("/", response_model=schemas.LeaseRead)
def create_lease(
    lease_in: schemas.LeaseCreate,
    db: Session = Depends(deps.get_db),
):
    """Create a new lease, linking a tenant to a unit, and toggles unit status to Occupied."""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == lease_in.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    unit = db.query(models.Unit).filter(models.Unit.id == lease_in.unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    if lease_in.start_date >= lease_in.end_date:
        raise HTTPException(status_code=400, detail="Start date must be before end date")
    
    new_lease = models.Lease(**lease_in.dict())
    
    # ADDED: Automatically update the unit status to Occupied upon lease assignment
    unit.status = "Occupied"
    db.add(unit)
    
    db.add(new_lease)
    db.commit()
    db.refresh(new_lease)
    return new_lease

@router.get("/", response_model=List[schemas.LeaseRead])
def get_leases(db: Session = Depends(deps.get_db)):
    """List all active and historical leases."""
    return db.query(models.Lease).all()

@router.put("/{lease_id}", response_model=schemas.LeaseRead)
def update_lease(
    lease_id: int,
    lease_in: schemas.LeaseUpdate,
    db: Session = Depends(deps.get_db),
):
    """Update lease terms or handle Termination status events safely."""
    lease = db.query(models.Lease).filter(models.Lease.id == lease_id).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    
    if lease_in.tenant_id is not None:
        tenant = db.query(models.Tenant).filter(models.Tenant.id == lease_in.tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        lease.tenant_id = lease_in.tenant_id
    
    if lease_in.unit_id is not None:
        unit = db.query(models.Unit).filter(models.Unit.id == lease_in.unit_id).first()
        if not unit:
            raise HTTPException(status_code=404, detail="Unit not found")
        lease.unit_id = lease_in.unit_id
    
    if lease_in.start_date is not None:
        lease.start_date = lease_in.start_date
    if lease_in.end_date is not None:
        lease.end_date = lease_in.end_date
    if lease_in.monthly_rent is not None:
        lease.monthly_rent = lease_in.monthly_rent
        
    if lease_in.status is not None:
        lease.status = lease_in.status
        # ADDED: If lease is closed or terminated, free up the physical unit status back to Vacant
        if lease_in.status in ["Closed", "Terminated"]:
            target_unit = db.query(models.Unit).filter(models.Unit.id == lease.unit_id).first()
            if target_unit:
                target_unit.status = "Vacant"
                db.add(target_unit)
    
    db.add(lease)
    db.commit()
    db.refresh(lease)
    return lease

@router.delete("/{lease_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lease(lease_id: int, db: Session = Depends(deps.get_db)):
    """Hard delete option pipeline endpoint to clean up rogue entries completely."""
    lease = db.query(models.Lease).filter(models.Lease.id == lease_id).first()
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
        
    # Automatically revert the unit back to vacant before removing the lease record
    target_unit = db.query(models.Unit).filter(models.Unit.id == lease.unit_id).first()
    if target_unit:
        target_unit.status = "Vacant"
        db.add(target_unit)
        
    db.delete(lease)
    db.commit()
    return None