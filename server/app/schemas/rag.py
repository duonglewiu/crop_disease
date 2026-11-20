from typing import List, Optional
from pydantic import BaseModel, Field

class TreatmentRequest(BaseModel):
    crop_name: str = Field(..., example="Tomato")
    disease_name: str = Field(..., example="Late blight")
    severity_percentage: float = Field(..., example=34.5, description="Mức độ tổn thương tính theo % diện tích lá từ U-Net")
    user_notes: Optional[str] = Field(None, example="Trồng trong nhà màng, thời tiết mưa ẩm kéo dài")

class ChemicalTreatment(BaseModel):
    active_ingredient: str
    product_name: str
    dosage: str
    pre_harvest_interval_days: int

class BiologicalTreatment(BaseModel):
    method: str
    description: str

class TreatmentResponse(BaseModel):
    crop_name: str
    disease_name: str
    severity_level: str  # Nhẹ (<15%), Trung bình (15-40%), Nghiêm trọng (>40%)
    immediate_actions: List[str]
    chemical_treatments: List[ChemicalTreatment]
    biological_treatments: List[BiologicalTreatment]
    prevention_guidelines: List[str]
    source_documents: List[str]

