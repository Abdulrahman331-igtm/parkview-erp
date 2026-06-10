#Combines all module routers
from fastapi import APIRouter
from app.api.v1.endpoints import units, readings, auth, dashboard, tenants, leases, invoices, payments, expenses, bookings, reports

api_router = APIRouter()

api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(units.router, prefix="/units", tags=["units"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(readings.router, prefix="/readings", tags=["readings"])
api_router.include_router(leases.router, prefix="/leases", tags=["leases"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
api_router.include_router(auth.router, prefix="", tags=["Authentication"])