from fastapi import APIRouter, HTTPException
from app.schemas.rag import TreatmentRequest, TreatmentResponse
from app.rag.chain import generate_treatment_plan

router = APIRouter()

@router.post("/treatment", response_model=TreatmentResponse, tags=["RAG Treatment"])
def get_treatment_plan(request: TreatmentRequest):
    try:
        plan = generate_treatment_plan(request)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi sinh phác đồ: {str(e)}")

