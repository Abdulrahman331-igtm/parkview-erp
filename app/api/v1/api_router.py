#Combines all module routers
from fastapi import APIRouter
from app.api.v1.endpoints import units, readings, auth

api_router = APIRouter()

api_router.include_router(units.router, prefix="/units", tags=["units"])
api_router.include_router(readings.router, prefix="/readings", tags=["readings"])
api_router.include_router(auth.router, prefix="", tags=["Authentication"])