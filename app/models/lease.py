from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Lease(Base):
    __tablename__ = "leases"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    monthly_rent = Column(Numeric(precision=12, scale=2), nullable=False)
    status = Column(String, default="Active")

    tenant = relationship("Tenant", back_populates="leases")
    unit = relationship("Unit", back_populates="leases")