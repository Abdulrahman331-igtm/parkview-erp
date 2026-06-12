from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.payout import PayoutRequest
from app.schemas.payout import PayoutCreate, PayoutResponse
# from app.api.deps import get_current_user # To protect these routes later

router = APIRouter()

@router.post("/payouts", response_model=PayoutResponse)
def create_payout(payout_in: PayoutCreate, db: Session = Depends(get_db)):
    # Standard 3-tier: keeping business logic thin in the router
    new_payout = PayoutRequest(**payout_in.model_dump())
    db.add(new_payout)
    db.commit()
    db.refresh(new_payout)
    return new_payout

@router.get("/payouts", response_model=list[PayoutResponse])
def get_payouts(db: Session = Depends(get_db)):
    return db.query(PayoutRequest).all()