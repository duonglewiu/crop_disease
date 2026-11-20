from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Crop Disease Edge AI - RAG Backend",
        "version": "1.0.0"
    }

