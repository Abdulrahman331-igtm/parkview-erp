from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app import models, schemas
from app.api import deps
import uuid

router = APIRouter()

# CREATE - Record a payment
@router.post("/", response_model=schemas.PaymentRead)
def create_payment(
    payment_in: schemas.PaymentCreate,
    db: Session = Depends(deps.get_db),
): 
    """Records a cash receipt. Supports standard invoice matching 
    OR direct tenant ledger prepayments/deposits with auto-allocation."""
    
    invoice = None
    tenant = None
    
    # ---------------------------------------------------------
    # 1. Handle Transaction Reference Codes
    # ---------------------------------------------------------
    ref_string = payment_in.reference_number
    if not ref_string or ref_string.strip() == "":
        ref_string = f"AUTO-{uuid.uuid4().hex[:8].upper()}"

    existing = db.query(models.Payment).filter(
        models.Payment.reference_number == ref_string
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="A payment transaction with this reference already exists")

    # ---------------------------------------------------------
    # 2. PATH A: Invoice-Specific Payment (From "Log Pay" on an Invoice)
    # ---------------------------------------------------------
    if payment_in.invoice_id:
        invoice = db.query(models.Invoice).filter(models.Invoice.id == payment_in.invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice record target not found")
        
        tenant = db.query(models.Tenant).filter(models.Tenant.id == invoice.tenant_id).first()
        
        payment_data = payment_in.dict()
        payment_data["reference_number"] = ref_string
        
        new_payment = models.Payment(**payment_data)
        db.add(new_payment)
        
        # Ledger & Status Math
        total_paid_historical = db.query(func.sum(models.Payment.amount_paid)).filter(
            models.Payment.invoice_id == invoice.id
        ).scalar() or 0
        
        if (float(total_paid_historical) + float(payment_in.amount_paid)) >= float(invoice.amount):
            invoice.status = "Paid"
        db.add(invoice)
        
        if tenant:
            current_bal = float(tenant.account_balance or 0.00)
            tenant.account_balance = current_bal - float(payment_in.amount_paid)
            db.add(tenant)
            
        db.commit()
        db.refresh(new_payment)
        return new_payment
        
    # ---------------------------------------------------------
    # 3. PATH B: Standalone Prepayment (The Auto-Sweep Engine)
    # ---------------------------------------------------------
    elif getattr(payment_in, 'tenant_id', None):
        tenant = db.query(models.Tenant).filter(models.Tenant.id == payment_in.tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant account profile not found")

        payment_data = payment_in.dict()
        payment_data["reference_number"] = ref_string
        
        # Save the physical standalone deposit to the bank
        new_payment = models.Payment(**payment_data)
        db.add(new_payment)
        
        # 1. Update the overall tenant ledger immediately
        current_bal = float(tenant.account_balance or 0.00)
        tenant.account_balance = current_bal - float(payment_in.amount_paid)
        db.add(tenant)
        
        # 2. AUTO-ALLOCATION SWEEP
        # Find all pending/overdue invoices for this tenant, oldest first
        unpaid_invoices = db.query(models.Invoice).filter(
            models.Invoice.tenant_id == tenant.id,
            models.Invoice.status.in_(["Pending", "Overdue"])
        ).order_by(models.Invoice.due_date.asc()).all()
        
        # Start with the total cash they just handed us
        unallocated_cash = float(payment_in.amount_paid)
        payment_date_val = getattr(payment_in, 'payment_date', None)
        
        for inv in unpaid_invoices:
            if unallocated_cash <= 0:
                break # Out of money, stop sweeping!
                
            # Find how much is already paid towards this specific invoice
            inv_paid_already = db.query(func.sum(models.Payment.amount_paid)).filter(
                models.Payment.invoice_id == inv.id
            ).scalar() or 0.0
            
            amount_due = float(inv.amount) - float(inv_paid_already)
            
            if amount_due > 0:
                # Pay as much as we can with the cash we have left
                allocation = min(unallocated_cash, amount_due)
                unallocated_cash -= allocation
                
                # Create the virtual link so the Invoice PDF and P&L works perfectly
                virtual_pay = models.Payment(
                    invoice_id=inv.id,
                    tenant_id=tenant.id,
                    amount_paid=allocation,
                    payment_method="Credit Drawdown",
                    reference_number=f"CR-SWEEP-{inv.id}-{uuid.uuid4().hex[:4].upper()}",
                    payment_date=payment_date_val 
                )
                db.add(virtual_pay)
                
                # Update the invoice badge if it's fully covered
                if allocation >= amount_due:
                    inv.status = "Paid"
                db.add(inv)

        db.commit()
        db.refresh(new_payment)
        return new_payment

    else:
        raise HTTPException(status_code=400, detail="Payment must be linked to either an Invoice or a Tenant")
    
# READ - List all payments
@router.get("/", response_model=List[schemas.PaymentRead])
def get_payments(
    invoice_id: Optional[int] = Query(None),
    payment_method: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(deps.get_db),
):
    """List all received payments (for the ledger)."""
    query = db.query(models.Payment)
    
    if invoice_id:
        query = query.filter(models.Payment.invoice_id == invoice_id)
    if payment_method:
        query = query.filter(models.Payment.payment_method == payment_method)
    
    return query.order_by(models.Payment.payment_date.desc()).offset(skip).limit(limit).all()