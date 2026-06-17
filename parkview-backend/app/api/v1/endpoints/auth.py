from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.api import deps
from app.core import security

router = APIRouter()

@router.post("/register", response_model=schemas.User)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(deps.get_db)):
    existing_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            details="Username already exists",
        )
    hashed_password = security.get_password_hash(user_in.password)
    new_user = models.User(
        username = user_in.username,
        password_hash = hashed_password,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user




@router.post("/login", response_model=schemas.Token)
def login_for_access_token(
    form_data: schemas.LoginRequest, # Ensure this matches your Pydantic schema
    db: Session = Depends(deps.get_db)
):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    # Debug prints to check login failure reasons
    print(f"not user: {not user}")
    if user:
        print(f"not security.verify_password: {not security.verify_password(form_data.password, user.password_hash)}")
    
    # Check if the user exists and the password verifies
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=30)
    access_token = security.create_access_token(
        data={"sub": user.username, "role": user.role}, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "user_id": user.id, "name": user.username}

@router.put("/users/{user_id}", response_model=schemas.User)
def update_user(
            user_id: int,
            user_in: schemas.UserUpdate,
            db: Session = Depends(deps.get_db)    
            ):
 user = db.query(models.User).filter(models.User.id == user_id).first()
 if not user:
     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
 if user_in.username:
     existing = db.query(models.User).filter(models.User.username == user_in.username).first()
     if existing and existing.id != user_id:
       raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
     user.username = user_in.username
 if user_in.password:
     user.password_hash = security.get_password_hash(user_in.password)
     
 if user_in.role:
     user.role = user_in.role
 db.add(user)
 db.commit()
 db.refresh(user)
 return user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(deps.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    db.delete(user)
    db.commit()
    return
