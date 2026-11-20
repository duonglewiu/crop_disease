from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.rag import TreatmentResponse


class BlurAnalysisResult(BaseModel):
    is_blurry: bool
    laplacian_variance: float
    threshold: float
    message: str


class TopPrediction(BaseModel):
    label: str
    crop_name: str
    disease_name: str
    disease_vi: str
    confidence: float


class ClassificationResult(BaseModel):
    raw_label: str
    crop_name: str
    disease_name: str
    disease_vi: str
    confidence: float
    tta_applied: bool
    user_crop_filter: Optional[str] = None
    top_predictions: List[TopPrediction]


class SegmentationResult(BaseModel):
    severity_percentage: float
    severity_level: str
    lesion_pixels: int
    total_pixels: int
    mask_overlay_base64: Optional[str] = Field(
        None,
        description="Ảnh PNG Base64 hiển thị vùng tổn thương phủ màu đỏ cam từ U-Net"
    )


class OfflineSQLiteTreatment(BaseModel):
    found: bool
    source: str = "Offline SQLite Database (disease_treatments.db)"
    crop_name: Optional[str] = None
    disease_name: Optional[str] = None
    disease_vi: Optional[str] = None
    severity_threshold: Optional[float] = None
    chemical_treatment: Optional[str] = None
    biological_treatment: Optional[str] = None
    preventive_measures: Optional[str] = None
    pre_harvest_interval_days: Optional[int] = None


class DiagnoseE2EResponse(BaseModel):
    status: str = Field(..., description="success | rejected_blurry")
    workflow_steps_completed: int = Field(..., description="Số bước hoàn thành trên tổng 10 bước E2E")
    inference_time_ms: float
    network_mode_requested: str
    active_treatment_source: str
    blur_check: BlurAnalysisResult
    classification: Optional[ClassificationResult] = None
    segmentation: Optional[SegmentationResult] = None
    offline_treatment: Optional[OfflineSQLiteTreatment] = None
    online_rag_treatment: Optional[TreatmentResponse] = None

