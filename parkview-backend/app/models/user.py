#User table(Role-based)
from app.db.base import Base
from sqlalchemy import Column, Boolean, String, Integer
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False, index=True, unique=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    
    tenant = relationship("Tenant", back_populates="user", uselist=False)