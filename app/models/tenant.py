from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, index=True)
    contact_phone = Column(String)

    user = relationship("User", back_populates="tenant", uselist=False)
    leases = relationship("Lease", back_populates="tenant")
    invoices = relationship("Invoice", back_populates="tenant")