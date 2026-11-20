from fastapi import APIRouter
from app.api.v1.endpoints import health, rag, diagnose

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(rag.router, prefix="/rag")
api_router.include_router(diagnose.router)


