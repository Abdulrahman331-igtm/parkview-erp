from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas
from app.api import deps

router = APIRouter()

# CREATE - Record a payment
@router.post("/", response_model=schemas.PaymentRead)
def create_payment(
    payment_in: schemas.PaymentCreate,
    db: Session = Depends(deps.get_db),
):
    """Record a payment received against a specific invoice."""
    # Verify invoice exists
    invoice = db.query(models.Invoice).filter(models.Invoice.id == payment_in.invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Check if payment reference is unique (if provided)
    if payment_in.reference_number:
        existing_payment = db.query(models.Payment).filter(
            models.Payment.reference_number == payment_in.reference_number
        ).first()
        if existing_payment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment with this reference number already exists"
            )
    
    new_payment = models.Payment(**payment_in.dict())
    db.add(new_payment)
    
    # Auto-mark invoice as Paid if total payments equal the invoice amount
    total_paid = db.query(models.Payment).filter(
        models.Payment.invoice_id == payment_in.invoice_id
    ).all()
    
    total_amount = sum(p.amount_paid for p in total_paid) + payment_in.amount_paid
    if total_amount >= invoice.amount:
        invoice.status = "Paid"
    else:
        invoice.status = "Pending"
    
    db.add(invoice)
    db.commit()
    db.refresh(new_payment)
    return new_payment

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