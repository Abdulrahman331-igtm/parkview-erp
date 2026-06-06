#User table(Role-based)
from app.db.base import Base
from sqlalchemy import Column, Boolean, String, Integer

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False, index=True, unique=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)