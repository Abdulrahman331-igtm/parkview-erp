from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.api import deps

router = APIRouter()

# CREATE - Register a new tenant
@router.post("/", response_model=schemas.TenantRead)
def create_tenant(
    tenant_in: schemas.TenantCreate,
    db: Session = Depends(deps.get_db),
):
    """Register a new long-term tenant."""
    # Check if email already exists (if provided)
    if tenant_in.email:
        existing_tenant = db.query(models.Tenant).filter(
            models.Tenant.email == tenant_in.email
        ).first()
        if existing_tenant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    new_tenant = models.Tenant(**tenant_in.dict())
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    return new_tenant

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
    
    
@router.get("/dashboard-summary")
def get_tenant_dashboard_summary(db: Session = Depends(deps.get_db)):
    """
    Assembles relational data records across Tenants, Leases, and Units
    to feed the unified Tenant Management UI workspace dashboard.
    """
    tenants = db.query(models.Tenant).all()
    active_units = db.query(models.Unit).filter(models.Unit.is_active == True).all()

    # 1. Initialize summary baseline metrics
    total_tenants = len(tenants)
    retail_count = 0
    office_count = 0
    total_monthly_rent_roll = 0

    table_rows = []

    # 2. Iterate through tenants to build full UI profiles
    for t in tenants:
        # Resolve their active lease agreement (ignoring historical closed ones)
        active_lease = next((l for l in t.leases if getattr(l, 'status', 'Active') == 'Active'), None)
        
        unit_number = "—"
        lease_period = "No Active Lease"
        monthly_rent = 0
        tenant_type = "Retail"  # Fallback default type

        if active_lease:
            # Query the linked unit if relationship mapping isn't eager loaded
            db_unit = db.query(models.Unit).filter(models.Unit.id == active_lease.unit_id).first()
            if db_unit:
                unit_number = db_unit.unit_number
                # Assign type dynamically based on structural destination matching requirements
                tenant_type = "Office" if db_unit.unit_type == "Office" else "Retail"

            # Parse structural dates cleanly
            start_str = active_lease.start_date.strftime("%Y-%m-%d") if hasattr(active_lease.start_date, 'strftime') else str(active_lease.start_date)
            end_str = active_lease.end_date.strftime("%Y-%m-%d") if hasattr(active_lease.end_date, 'strftime') else str(active_lease.end_date)
            lease_period = f"{start_str} to {end_str}"
            
            monthly_rent = int(active_lease.monthly_rent or 0)
            total_monthly_rent_roll += monthly_rent

        # Update category counts
        if tenant_type == "Office":
            office_count += 1
        else:
            retail_count += 1

        table_rows.append({
            "id": t.id,
            "tenant_code": f"T-{100 + t.id:03d}", # Matches mock format: T-001
            "name": t.name,
            "type": tenant_type,
            "unit_number": unit_number,
            "unit_id": active_lease.unit_id if active_lease else None,
            "contact_phone": t.contact_phone or "—",
            "email": t.email or "—",
            "lease_period": lease_period,
            "monthly_rent": monthly_rent,
            "lease_start": active_lease.start_date.strftime("%Y-%m-%d") if active_lease and hasattr(active_lease.start_date, 'strftime') else "",
            "lease_end": active_lease.end_date.strftime("%Y-%m-%d") if active_lease and hasattr(active_lease.end_date, 'strftime') else ""
        })

    # Assemble simple selection array for your "Assign Unit" dropdown field menu
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