from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from app import models, schemas
from app.api import deps
from datetime import date, datetime

router = APIRouter()

@router.get("/dashboard-summary")
def get_invoice_dashboard_summary(db: Session = Depends(deps.get_db)):
    """
    Assembles relational metrics across Invoices, Tenants, Bookings, 
    and Units to power the PropManager Billing workspace engine.
    """
    invoices = db.query(models.Invoice).all()
    active_units = db.query(models.Unit).filter(models.Unit.is_active == True).all()
    tenants = db.query(models.Tenant).all()
    bookings = db.query(models.Booking).all()

    # 1. Initialize top card summary accumulation blocks
    total_invoices_count = len(invoices)
    paid_sum = 0
    pending_sum = 0
    overdue_sum = 0
    outstanding_balance = 0

    table_rows = []

    # 2. Loop through records to parse metrics arrays
    for inv in invoices:
        amt = int(inv.amount)
        stat = inv.status

        # Aggregate monetary parameters
        if stat == "Paid":
            paid_sum += amt
        elif stat == "Pending":
            pending_sum += amt
            outstanding_balance += amt
        elif stat == "Overdue":
            overdue_sum += amt
            outstanding_balance += amt

        # Determine Entity label string profile matches mockup designs
        entity_name = "—"
        entity_type = "Tenant"
        if inv.tenant_id:
            db_tenant = db.query(models.Tenant).filter(models.Tenant.id == inv.tenant_id).first()
            entity_name = db_tenant.name if db_tenant else f"Tenant #{inv.tenant_id}"
        elif inv.booking_id:
            db_booking = db.query(models.Booking).filter(models.Booking.id == inv.booking_id).first()
            entity_name = db_booking.guest_name if db_booking else f"Guest #{inv.booking_id}"
            entity_type = "Guest"

        # Resolve Unit numbers directly
        db_unit = db.query(models.Unit).filter(models.Unit.id == inv.unit_id).first()
        unit_number = db_unit.unit_number if db_unit else "—"

        table_rows.append({
            "id": inv.id,
            "invoice_code": f"INV-{inv.id:03d}", # Matches format: INV-011
            "entity_name": entity_name,
            "entity_type": entity_type,
            "unit_number": unit_number,
            "unit_id": inv.unit_id,
            "category": inv.category,
            "amount": amt,
            "due_date": inv.due_date.strftime("%Y-%m-%d") if hasattr(inv.due_date, 'strftime') else str(inv.due_date),
            "status": stat,
            "line_items": inv.line_items or {}
        })
        
        table_rows.sort(key=lambda x: x["due_date"], reverse=True)

    # Pack simplified dropdown fields arrays to seed our modal creation workflows selector forms
    recipient_options = []
    for t in tenants:
        recipient_options.append({"id": t.id, "type": "Tenant", "label": f"{t.name} — Current Leased Unit"})
    for b in bookings:
        recipient_options.append({"id": b.id, "type": "Guest", "label": f"{b.guest_name} — Room #{b.unit_id}"})

    unit_options = [{"id": u.id, "label": f"{u.unit_number} — {u.floor} {u.unit_type}"} for u in active_units]

    return {
        "summary": {
            "total_invoices": total_invoices_count,
            "paid_amount": paid_sum,
            "pending_amount": pending_sum,
            "overdue_amount": overdue_sum,
            "outstanding_balance": outstanding_balance,
            "follow_up_count": sum(1 for i in invoices if i.status in ["Pending", "Overdue"])
        },
        "invoices": table_rows,
        "recipients": recipient_options,
        "units": unit_options
    }

# CREATE - Generate a new invoice
@router.post("/", response_model=schemas.InvoiceRead)
def create_invoice(
    invoice_in: schemas.InvoiceCreate,
    db: Session = Depends(deps.get_db),
):
    """Generate a new invoice (Rent, Utility, or Service)."""
    # Verify tenant or booking exists (one must be provided)
    if invoice_in.tenant_id:
        tenant = db.query(models.Tenant).filter(models.Tenant.id == invoice_in.tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
    elif invoice_in.booking_id:
        booking = db.query(models.Booking).filter(models.Booking.id == invoice_in.booking_id).first()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either tenant_id or booking_id must be provided"
        )
    
    # Verify unit exists
    unit = db.query(models.Unit).filter(models.Unit.id == invoice_in.unit_id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unit not found"
        )
    
    new_invoice = models.Invoice(**invoice_in.dict())
    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)
    return new_invoice

# READ - List invoices with optional filtering
@router.get("/", response_model=List[schemas.InvoiceRead])
def get_invoices(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    tenant_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(deps.get_db),
):
    """List invoices, filterable by status (Pending, Paid) and category."""
    query = db.query(models.Invoice)
    
    if status_filter:
        query = query.filter(models.Invoice.status == status_filter)
    if category:
        query = query.filter(models.Invoice.category == category)
    if tenant_id:
        query = query.filter(models.Invoice.tenant_id == tenant_id)
    
    return query.offset(skip).limit(limit).all()

# UPDATE - Update invoice details
# @router.put("/{invoice_id}", response_model=schemas.InvoiceRead)
# def update_invoice(
#     invoice_id: int,
#     invoice_in: schemas.InvoiceUpdate,
#     db: Session = Depends(deps.get_db),
# ):
#     """Update invoice details or adjust amounts."""
#     invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
#     if not invoice:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Invoice not found"
#         )
    
#     # Validate updates
#     if invoice_in.tenant_id is not None:
#         tenant = db.query(models.Tenant).filter(models.Tenant.id == invoice_in.tenant_id).first()
#         if not tenant:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Tenant not found"
#             )
#         invoice.tenant_id = invoice_in.tenant_id
    
#     if invoice_in.booking_id is not None:
#         booking = db.query(models.Booking).filter(models.Booking.id == invoice_in.booking_id).first()
#         if not booking:
#             raise HTTPException(
#                 status_code=status.HTTP_404_NOT_FOUND,
#                 detail="Booking not found"
#             )
#         invoice.booking_id = invoice_in.booking_id
    
#     if invoice_in.amount is not None:
#         invoice.amount = invoice_in.amount
#     if invoice_in.due_date is not None:
#         invoice.due_date = invoice_in.due_date
#     if invoice_in.status is not None:
#         invoice.status = invoice_in.status
#     if invoice_in.category is not None:
#         invoice.category = invoice_in.category
    
#     db.add(invoice)
#     db.commit()
#     db.refresh(invoice)
#     return invoice

@router.put("/{invoice_id}", response_model=schemas.InvoiceRead)
def update_invoice_status(invoice_id: int, invoice_in: schemas.InvoiceUpdate, db: Session = Depends(deps.get_db)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice entry registry reference not found")
    
    if invoice_in.status is not None:
        invoice.status = invoice_in.status
    if invoice_in.category is not None:
        invoice.category = invoice_in.category
    if invoice_in.amount is not None:
        invoice.amount = invoice_in.amount
        
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice

@router.delete("/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: int, db: Session = Depends(deps.get_db)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice record not found")
    db.delete(invoice)
    db.commit()
    return None

@router.get("/{invoice_id}/easyinvoice-data")
def get_easyinvoice_formatted_data(invoice_id: int, db: Session = Depends(deps.get_db)):
    """
    Generates a structured dictionary fully compliant with easyinvoice's 
    strict object schema engine, computing precise Kenyan 16% VAT splits.
    """
    inv = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice record not found")

    # Resolve related baseline profile metrics
    db_tenant = db.query(models.Tenant).filter(models.Tenant.id == inv.tenant_id).first() if inv.tenant_id else None
    db_unit = db.query(models.Unit).filter(models.Unit.id == inv.unit_id).first()
    
    tenant_name = db_tenant.name if db_tenant else "Walking Client / Guest Account"
    tenant_email = db_tenant.email if db_tenant else "billing@parkview.co.ke"
    unit_number = db_unit.unit_number if db_unit else "Shop-101"

    # Reference Number Formatting Rule: Unit Number / MMYY (e.g. S-101/0626)
    date_context = inv.due_date if inv.due_date else datetime.now().date()
    mmyy_str = date_context.strftime("%m%y")
    custom_invoice_ref = f"{unit_number}/{mmyy_str}"

    # Calculate net prices back from the absolute total to cleanly isolate 16% Kenyan VAT
    gross_total = float(inv.amount)
    net_price_before_vat = round(gross_total / 1.16, 2)

    # Dynamic line description mapping customized exactly to your Mall channels
    category_descriptions = {
        "Rent": f"Commercial Space Rent Assessment for Space {unit_number}",
        "Salaries": "Reimbursable Subcontracted Personnel/Employee Wage Management Fee",
        "Security": f"Dedicated Mall Asset Security & Surveillance Services for Space {unit_number}",
        "Cleaning": f"Janitorial & Cleaning Maintenance Operations Management for Space {unit_number}",
        "Maintenance": f"Facility Engineering, Systems Repair & Maintenance Services for Space {unit_number}",
        "Supplies": "Consumables and Operational Property Utility Supplies Distributed",
        "Equipment": "Asset Tooling and Machinery Leased Equipment Fee",
        "Licences": "County Regulatory Permits & Direct Municipal Licensing Facilitation"
    }

    item_description = category_descriptions.get(
        inv.category, 
        f"Commercial Utility/Service Assessment ({inv.category}) — Space {unit_number}"
    )

    # Build the exact data structure required by easyinvoice
    return {
        "images": {
            # Base64 string or verified direct url to avoid cross-origin layout breaks
            "logo": "https://public.easyinvoice.cloud/img/logo_en_original.png"
        },
        "sender": {
            "company": "Parkview Mall Management Ltd",
            "address": "Parklands Road, Block C",
            "zip": "00100",
            "city": "Nairobi",
            "country": "Kenya"
        },
        "client": {
            "company": str(tenant_name),
            "address": f"Premises Assignment: Unit {unit_number}",
            "zip": "Contact Email:",
            "city": str(tenant_email),
            "country": "Kenya"
        },
        "information": {
            "number": str(custom_invoice_ref), # Format: Unit/mmyy
            "date": datetime.now().strftime("%Y-%m-%d"),
            "dueDate": date_context.strftime("%Y-%m-%d")
        },
        "products": [
            {
                "quantity": 1,
                "description": str(item_description),
                "taxRate": 16, # Tracks Kenyan VAT 16% natively
                "price": float(net_price_before_vat)
            }
        ],
        "bottom-notice": "Kindly process your outstanding balance via M-Pesa Till or Bank Wire within 15 days.",
        "settings": {
            "currency": "KES", # Formats currency symbol token values correctly to KES
            "taxNotation": "vat",
            "locale": "en-US"
        }
    }