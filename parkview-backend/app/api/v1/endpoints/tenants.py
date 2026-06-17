from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy.sql import func
from app import models, schemas
from app.api import deps

router = APIRouter()

# READ - List all tenants
@router.get("/", response_model=List[schemas.TenantRead])
def get_tenants(db: Session = Depends(deps.get_db)):
    """List all tenants."""
    return db.query(models.Tenant).all()

# UPDATE - Update tenant contact info
@router.put("/{tenant_id}", response_model=schemas.TenantRead)
def update_tenant(
    tenant_id: int,
    tenant_in: schemas.TenantUpdate,
    db: Session = Depends(deps.get_db),
):
    """Update tenant contact info."""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    if tenant_in.name is not None:
        tenant.name = tenant_in.name
    if tenant_in.email is not None:
        tenant.email = tenant_in.email
    if tenant_in.contact_phone is not None:
        tenant.contact_phone = tenant_in.contact_phone
    if tenant_in.user_id is not None:
        tenant.user_id = tenant_in.user_id
    
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant

# DELETE - Remove a tenant record
@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant(
    tenant_id: int,
    db: Session = Depends(deps.get_db),
):
    """Remove a tenant record."""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    db.delete(tenant)
    db.commit()
    return None
    
    
from sqlalchemy.sql import func # Add this import at the top of your file if not present

@router.get("/dashboard-summary")
def get_tenant_dashboard_summary(db: Session = Depends(deps.get_db)):
    """
    Assembles relational data records across Tenants, Leases, and Units
    to feed the unified Tenant Management UI workspace dashboard.
    """
    tenants = db.query(models.Tenant).all()
    active_units = db.query(models.Unit).filter(models.Unit.is_active == True).all()

    total_tenants = len(tenants)
    retail_count = 0
    office_count = 0
    total_monthly_rent_roll = 0

    table_rows = []

    for t in tenants:
        # 1. Fetch ALL active lease agreements for this tenant
        active_leases = [l for l in t.leases if getattr(l, 'status', 'Active') == 'Active']
        
        # 2. Compute dynamic combined calculations
        tenant_monthly_rent = 0
        assigned_unit_numbers = []
        lease_periods = []
        tenant_type = "Retail" # Fallback default
        
        # Track timeline boundaries for multi-unit leases
        earliest_start = None
        latest_end = None

        if active_leases:
            for lease in active_leases:
                # Add up rents mathematically
                lease_rent = int(lease.monthly_rent or 0)
                tenant_monthly_rent += lease_rent
                total_monthly_rent_roll += lease_rent

                # Find the units tied to these leases
                db_unit = db.query(models.Unit).filter(models.Unit.id == lease.unit_id).first()
                if db_unit:
                    assigned_unit_numbers.append(db_unit.unit_number)
                    if db_unit.unit_type == "Office":
                        tenant_type = "Office"

                # Track timeline dates
                if lease.start_date:
                    if not earliest_start or lease.start_date < earliest_start:
                        earliest_start = lease.start_date
                if lease.end_date:
                    if not latest_end or lease.end_date > latest_end:
                        latest_end = lease.end_date

            # Build readable display representations
            unit_number_display = ", ".join(sorted(assigned_unit_numbers)) if assigned_unit_numbers else "—"
            start_str = earliest_start.strftime("%Y-%m-%d") if earliest_start else "—"
            end_str = latest_end.strftime("%Y-%m-%d") if latest_end else "—"
            lease_period_display = f"{start_str} to {end_str}"
        else:
            unit_number_display = "—"
            lease_period_display = "No Active Lease"

        # Update metadata category counts
        if tenant_type == "Office":
            office_count += 1
        else:
            retail_count += 1

        # Fallback fields for schema validation requirements
        primary_lease = active_leases[0] if active_leases else None

        table_rows.append({
            "id": t.id,
            "tenant_code": f"T-{100 + t.id:03d}",
            "name": t.name,
            "type": tenant_type,
            "unit_number": unit_number_display, # Now displays all units grouped together e.g. "206, 207..."
            "unit_id": primary_lease.unit_id if primary_lease else None,
            "contact_phone": t.contact_phone or "—",
            "email": t.email or "—",
            "lease_period": lease_period_display,
            "monthly_rent": tenant_monthly_rent, # Now returns the accurate aggregate sum!
            "lease_start": earliest_start.strftime("%Y-%m-%d") if earliest_start else "",
            "lease_end": latest_end.strftime("%Y-%m-%d") if latest_end else ""
        })

    available_units = [
        {"id": u.id, "label": f"{u.unit_number} — {u.floor} {u.unit_type}"} 
        for u in active_units if u.status == "Vacant"
    ]

    return {
        "summary": {
            "total_tenants": total_tenants,
            "retail_tenants_count": retail_count,
            "office_tenants_count": office_count,
            "monthly_rent_roll": total_monthly_rent_roll
        },
        "tenants": table_rows,
        "available_units": available_units
    }
    
@router.post("/", response_model=schemas.TenantRead)
def create_tenant_with_lease(
    tenant_in: schemas.TenantWithLeaseCreate,
    db: Session = Depends(deps.get_db),
):
    """
    Registers a new tenant, generates their initial lease contract profile,
    and updates the structural asset status to Occupied automatically.
    """
    
    existing_tenant = db.query(models.Tenant).filter(models.Tenant.email == tenant_in.email).first()
    if existing_tenant:
        raise HTTPException(status_code=400, detail="Email already registered")

    
    unit = db.query(models.Unit).filter(models.Unit.id == tenant_in.unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Target asset unit assignment not found")
    if unit.status == "Occupied":
        raise HTTPException(status_code=400, detail="This building unit is already leased to an active tenant")

    
    new_tenant = models.Tenant(
        name=tenant_in.name,
        email=tenant_in.email,
        contact_phone=tenant_in.contact_phone
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)

    new_lease = models.Lease(
        tenant_id=new_tenant.id,
        unit_id=tenant_in.unit_id,
        monthly_rent=tenant_in.monthly_rent,
        start_date=tenant_in.start_date,
        end_date=tenant_in.end_date,
        status="Active"
    )
    db.add(new_lease)

    
    unit.status = "Occupied"
    db.add(unit)

    
    db.commit()
    db.refresh(new_tenant)
    
    return new_tenant