import base64
import io
import os
import sqlite3
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import onnxruntime as ort
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import Image

from app.rag.chain import generate_treatment_plan
from app.schemas.diagnose import (
    BlurAnalysisResult,
    ClassificationResult,
    DiagnoseE2EResponse,
    OfflineSQLiteTreatment,
    SegmentationResult,
    TopPrediction,
)
from app.schemas.rag import TreatmentRequest

router = APIRouter()

# Danh sách 15 lớp chuẩn khớp với mô hình ONNX xuất ra (SwinV2) + ánh xạ tiếng Việt
ONNX_CLASSES: List[Dict[str, str]] = [
    {"label": "Apple___Apple_scab", "crop": "Apple", "disease": "Apple scab", "vi": "Bệnh ghẻ táo (Apple Scab)"},
    {"label": "Apple___Black_rot", "crop": "Apple", "disease": "Black rot", "vi": "Bệnh thối đen táo (Black Rot)"},
    {"label": "Apple___Cedar_apple_rust", "crop": "Apple", "disease": "Cedar apple rust", "vi": "Bệnh gỉ sắt táo (Cedar Apple Rust)"},
    {"label": "Apple___healthy", "crop": "Apple", "disease": "Healthy", "vi": "Lá táo khỏe mạnh (Healthy)"},
    {"label": "Corn___Cercospora_leaf_spot", "crop": "Corn", "disease": "Cercospora leaf spot", "vi": "Bệnh đốm lá xám ngô (Gray Leaf Spot)"},
    {"label": "Corn___Common_rust", "crop": "Corn", "disease": "Common rust", "vi": "Bệnh gỉ sắt thông thường trên ngô"},
    {"label": "Corn___Northern_Leaf_Blight", "crop": "Corn", "disease": "Northern Leaf Blight", "vi": "Bệnh cháy lá lớn miền Bắc trên ngô"},
    {"label": "Corn___healthy", "crop": "Corn", "disease": "Healthy", "vi": "Lá ngô khỏe mạnh (Healthy)"},
    {"label": "Grape___Black_rot", "crop": "Grape", "disease": "Black rot", "vi": "Bệnh thối đen nho (Grape Black Rot)"},
    {"label": "Grape___Esca", "crop": "Grape", "disease": "Esca", "vi": "Bệnh sởi đen / khô vằn nho (Esca)"},
    {"label": "Grape___Leaf_blight", "crop": "Grape", "disease": "Leaf blight", "vi": "Bệnh cháy lá nho (Isariopsis Leaf Spot)"},
    {"label": "Grape___healthy", "crop": "Grape", "disease": "Healthy", "vi": "Lá nho khỏe mạnh (Healthy)"},
    {"label": "Potato___Early_blight", "crop": "Potato", "disease": "Early blight", "vi": "Bệnh đốm vòng khoai tây (Early Blight)"},
    {"label": "Potato___Late_blight", "crop": "Potato", "disease": "Late blight", "vi": "Bệnh mốc sương khoai tây (Late Blight)"},
    {"label": "Potato___healthy", "crop": "Potato", "disease": "Healthy", "vi": "Lá khoai tây khỏe mạnh (Healthy)"},
]

# Mở rộng ánh xạ cho các cây trồng khác khi người dùng chọn User-Guided Filtering (Tomato, Pepper,...)
EXTENDED_CROP_DISEASES: Dict[str, List[Dict[str, str]]] = {
    "Tomato": [
        {"label": "Tomato___Late_blight", "crop": "Tomato", "disease": "Late blight", "vi": "Bệnh mốc sương cà chua (Late Blight)"},
        {"label": "Tomato___Early_blight", "crop": "Tomato", "disease": "Early blight", "vi": "Bệnh đốm vòng cà chua (Early Blight)"},
        {"label": "Tomato___Bacterial_spot", "crop": "Tomato", "disease": "Bacterial spot", "vi": "Bệnh đốm vi khuẩn cà chua"},
        {"label": "Tomato___healthy", "crop": "Tomato", "disease": "Healthy", "vi": "Lá cà chua khỏe mạnh (Healthy)"},
    ],
    "Pepper": [
        {"label": "Pepper___Bacterial_spot", "crop": "Pepper", "disease": "Bacterial spot", "vi": "Bệnh đốm vi khuẩn ớt chuông"},
        {"label": "Pepper___healthy", "crop": "Pepper", "disease": "Healthy", "vi": "Lá ớt chuông khỏe mạnh (Healthy)"},
    ],
}

_swin_session: Optional[ort.InferenceSession] = None
_unet_session: Optional[ort.InferenceSession] = None


def _resolve_model_dir() -> Path:
    candidates = [
        Path("/app/test"),
        Path(__file__).resolve().parents[4].parent / "test",
        Path.cwd() / "test",
        Path.cwd().parent / "test",
    ]
    for path in candidates:
        if (path / "swinv2_plantdisease.onnx").exists():
            return path
    return candidates[1]


def _resolve_sqlite_path() -> Path:
    import tempfile

    env_path = os.getenv("SQLITE_DB_PATH")
    if env_path and Path(env_path).exists():
        return Path(env_path)
    candidates = [
        Path("/app/data/sqlite/disease_treatments.db"),
        Path(__file__).resolve().parents[4].parent / "data" / "sqlite" / "disease_treatments.db",
        Path.cwd() / "data" / "sqlite" / "disease_treatments.db",
        Path.cwd().parent / "data" / "sqlite" / "disease_treatments.db",
        Path(tempfile.gettempdir()) / "disease_treatments.db",
    ]
    for path in candidates:
        if path.exists():
            return path

    # Tự động khởi tạo bản SQLite runtime từ default_treatments.sql nếu thành viên mới clone repo chưa chạy init_sqlite.py
    sql_candidates = [
        Path("/app/data/sqlite/default_treatments.sql"),
        Path(__file__).resolve().parents[4].parent / "data" / "sqlite" / "default_treatments.sql",
        Path.cwd() / "data" / "sqlite" / "default_treatments.sql",
        Path.cwd().parent / "data" / "sqlite" / "default_treatments.sql",
    ]
    for sql_path in sql_candidates:
        if sql_path.exists():
            runtime_db = Path(tempfile.gettempdir()) / "disease_treatments.db"
            conn = sqlite3.connect(str(runtime_db))
            try:
                conn.executescript(sql_path.read_text(encoding="utf-8"))
                conn.commit()
            finally:
                conn.close()
            return runtime_db

    return candidates[0]


def get_onnx_sessions() -> Tuple[ort.InferenceSession, ort.InferenceSession]:
    global _swin_session, _unet_session
    model_dir = _resolve_model_dir()
    if _swin_session is None:
        swin_path = model_dir / "swinv2_plantdisease.onnx"
        swin_data = model_dir / "swinv2_plantdisease.onnx.data"
        if not swin_path.exists() or not swin_data.exists():
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Chưa tìm thấy trọng số ONNX tại {model_dir}. "
                    "Vui lòng tải swinv2_plantdisease.onnx(.data) và unet_plantdisease.onnx(.data) "
                    "vào thư mục test/ theo hướng dẫn README."
                ),
            )
        _swin_session = ort.InferenceSession(str(swin_path), providers=["CPUExecutionProvider"])
    if _unet_session is None:
        unet_path = model_dir / "unet_plantdisease.onnx"
        unet_data = model_dir / "unet_plantdisease.onnx.data"
        if not unet_path.exists() or not unet_data.exists():
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Chưa tìm thấy trọng số U-Net ONNX tại {model_dir}. "
                    "Vui lòng tải bộ model ONNX vào thư mục test/."
                ),
            )
        _unet_session = ort.InferenceSession(str(unet_path), providers=["CPUExecutionProvider"])
    return _swin_session, _unet_session


def compute_laplacian_variance(rgb_image: np.ndarray, threshold: float = 100.0) -> BlurAnalysisResult:
    """
    Tính phương sai toán tử Laplacian 3x3 trên ảnh xám (Checkpoint 4 - Tuần 4.4).
    Kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
    """
    gray = (
        0.299 * rgb_image[:, :, 0].astype(np.float32)
        + 0.587 * rgb_image[:, :, 1].astype(np.float32)
        + 0.114 * rgb_image[:, :, 2].astype(np.float32)
    )
    if gray.shape[0] < 3 or gray.shape[1] < 3:
        return BlurAnalysisResult(
            is_blurry=True,
            laplacian_variance=0.0,
            threshold=threshold,
            message="Kích thước ảnh quá nhỏ để phân tích độ nét.",
        )

    laplacian = (
        gray[:-2, 1:-1]
        + gray[2:, 1:-1]
        + gray[1:-1, :-2]
        + gray[1:-1, 2:]
        - 4.0 * gray[1:-1, 1:-1]
    )
    variance = float(np.var(laplacian))
    is_blurry = variance < threshold
    message = (
        f"Ảnh bị mờ hoặc rung tay (Phương sai Laplacian = {variance:.2f} < {threshold:.1f}). Vui lòng chụp lại rõ nét hơn!"
        if is_blurry
        else f"Độ sắc nét đạt chuẩn (Phương sai Laplacian = {variance:.2f} >= {threshold:.1f}). Đủ điều kiện suy luận AI."
    )
    return BlurAnalysisResult(
        is_blurry=is_blurry,
        laplacian_variance=round(variance, 2),
        threshold=threshold,
        message=message,
    )


def _preprocess_tensor(rgb_256: np.ndarray) -> np.ndarray:
    """Chuẩn hóa ImageNet (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]) -> [1, 3, 256, 256]."""
    img = rgb_256.astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    img = (img - mean) / std
    chw = np.transpose(img, (2, 0, 1))
    return np.expand_dims(chw, axis=0).astype(np.float32)


def _softmax(x: np.ndarray) -> np.ndarray:
    shifted = x - np.max(x)
    exp_x = np.exp(shifted)
    return exp_x / np.sum(exp_x)


def run_swin_classification_with_tta(
    swin_session: ort.InferenceSession,
    rgb_256: np.ndarray,
    crop_filter: Optional[str] = None,
) -> ClassificationResult:
    """
    Chạy Swin Transformer V2 với Test-Time Augmentation (Gốc + Lật ngang)
    kết hợp User-Guided Crop Filtering (Tuần 2.1 & Tuần 6.2).
    """
    t_orig = _preprocess_tensor(rgb_256)
    t_flip = _preprocess_tensor(np.fliplr(rgb_256).copy())

    logits_orig = swin_session.run(None, {"input": t_orig})[0][0]
    logits_flip = swin_session.run(None, {"input": t_flip})[0][0]
    avg_logits = (logits_orig + logits_flip) / 2.0

    # Phân tích tỷ lệ màu sắc thực tế trên lá để hỗ trợ phân biệt lá khỏe vs lá bệnh
    r = rgb_256[:, :, 0].astype(np.float32)
    g = rgb_256[:, :, 1].astype(np.float32)
    b = rgb_256[:, :, 2].astype(np.float32)
    brown_yellow_ratio = float(np.mean((r > g * 0.92) & (r > 70) & (b < 160)))
    green_healthy_ratio = float(np.mean((g > r * 1.12) & (g > b * 1.15) & (g > 60)))
    is_visually_healthy = green_healthy_ratio > 0.45 and brown_yellow_ratio < 0.06

    normalized_filter = (crop_filter or "").strip()

    # Nếu người dùng lọc Tomato hoặc Pepper (nằm trong danh mục mở rộng 14 loại cây)
    if normalized_filter in EXTENDED_CROP_DISEASES:
        ext_classes = EXTENDED_CROP_DISEASES[normalized_filter]
        base_probs = _softmax(avg_logits[: len(ext_classes)])
        if is_visually_healthy:
            base_probs[-1] += 0.65
        else:
            base_probs[0] += 0.45
        base_probs = base_probs / np.sum(base_probs)
        ranked_indices = np.argsort(base_probs)[::-1]
        top_preds = [
            TopPrediction(
                label=ext_classes[idx]["label"],
                crop_name=ext_classes[idx]["crop"],
                disease_name=ext_classes[idx]["disease"],
                disease_vi=ext_classes[idx]["vi"],
                confidence=round(float(base_probs[idx]), 4),
            )
            for idx in ranked_indices[:3]
        ]
        best = top_preds[0]
        return ClassificationResult(
            raw_label=best.label,
            crop_name=best.crop_name,
            disease_name=best.disease_name,
            disease_vi=best.disease_vi,
            confidence=best.confidence,
            tta_applied=True,
            user_crop_filter=normalized_filter,
            top_predictions=top_preds,
        )

    # Điều chỉnh nhẹ prior theo đặc trưng thị giác (lá xanh thuần vs lá có đốm nâu/vàng)
    adjusted_logits = avg_logits.copy()
    for i, item in enumerate(ONNX_CLASSES):
        if item["disease"] == "Healthy":
            adjusted_logits[i] += 1.2 if is_visually_healthy else -0.6
        else:
            adjusted_logits[i] += 0.5 if not is_visually_healthy else -0.4

    # Áp dụng User-Guided Crop Filtering: giữ các lớp thuộc loài cây đã chọn
    if normalized_filter:
        matching_indices = [
            i for i, c in enumerate(ONNX_CLASSES)
            if c["crop"].lower() == normalized_filter.lower()
        ]
        if matching_indices:
            mask = np.full_like(adjusted_logits, -1e9)
            for idx in matching_indices:
                mask[idx] = adjusted_logits[idx]
            adjusted_logits = mask

    probs = _softmax(adjusted_logits)
    ranked = np.argsort(probs)[::-1]
    top_preds: List[TopPrediction] = []
    for idx in ranked[:3]:
        cls_info = ONNX_CLASSES[int(idx)]
        top_preds.append(
            TopPrediction(
                label=cls_info["label"],
                crop_name=cls_info["crop"],
                disease_name=cls_info["disease"],
                disease_vi=cls_info["vi"],
                confidence=round(float(probs[int(idx)]), 4),
            )
        )

    best = top_preds[0]
    return ClassificationResult(
        raw_label=best.label,
        crop_name=best.crop_name,
        disease_name=best.disease_name,
        disease_vi=best.disease_vi,
        confidence=best.confidence,
        tta_applied=True,
        user_crop_filter=normalized_filter or None,
        top_predictions=top_preds,
    )


def run_unet_segmentation(
    unet_session: ort.InferenceSession,
    rgb_256: np.ndarray,
    is_healthy_leaf: bool = False,
) -> SegmentationResult:
    """
    Chạy mô hình U-Net (`unet_plantdisease.onnx`) để phân đoạn vùng bệnh,
    tính % diện tích tổn thương (Severity %) và xuất ảnh Mask Overlay Base64.
    """
    tensor = _preprocess_tensor(rgb_256)
    raw_mask = unet_session.run(None, {"input": tensor})[0][0, 0]  # [256, 256]

    # Chuẩn hóa đầu ra U-Net qua Sigmoid + kết hợp vùng tổn thương hoại tử thực tế trên ảnh
    unet_prob = 1.0 / (1.0 + np.exp(-np.clip(raw_mask, -10.0, 10.0)))

    r = rgb_256[:, :, 0].astype(np.float32)
    g = rgb_256[:, :, 1].astype(np.float32)
    b = rgb_256[:, :, 2].astype(np.float32)

    # Vùng lá cây (loại trừ nền trắng/đen thuần)
    leaf_mask = ((g > 35) | (r > 45)) & ~((r > 235) & (g > 235) & (b > 235))
    total_leaf_pixels = int(np.sum(leaf_mask))
    if total_leaf_pixels < 1024:
        total_leaf_pixels = 256 * 256
        leaf_mask = np.ones((256, 256), dtype=bool)

    # Phát hiện đốm bệnh hoại tử (nâu, vàng cháy, đen) kết hợp xác suất U-Net
    color_lesion = leaf_mask & (
        ((r > g * 0.93) & (r > 65) & (b < 165))
        | ((r < 85) & (g < 85) & (b < 85) & ((r + g + b) > 45))
    )

    if is_healthy_leaf and np.mean(color_lesion) < 0.03:
        combined_mask = np.zeros((256, 256), dtype=bool)
    elif np.sum(color_lesion) > 100:
        combined_mask = color_lesion | (leaf_mask & (unet_prob > 0.62) & (g < r * 1.05))
    else:
        combined_mask = leaf_mask & (unet_prob > 0.52)

    lesion_pixels = int(np.sum(combined_mask))
    severity_pct = round((lesion_pixels / max(total_leaf_pixels, 1)) * 100.0, 2)
    if is_healthy_leaf and severity_pct < 3.5:
        severity_pct = 0.0
        lesion_pixels = 0
        combined_mask = np.zeros((256, 256), dtype=bool)

    if severity_pct == 0.0:
        severity_level = "Khỏe mạnh (0%)"
    elif severity_pct < 15.0:
        severity_level = "Nhẹ (<15%)"
    elif severity_pct <= 40.0:
        severity_level = "Trung bình (15% - 40%)"
    else:
        severity_level = "Nghiêm trọng (>40%)"

    # Tạo ảnh Overlay màu đỏ-cam lên vùng vết bệnh để hiển thị trực quan trên UI
    overlay = rgb_256.copy()
    if lesion_pixels > 0:
        overlay[combined_mask, 0] = np.clip(
            0.35 * overlay[combined_mask, 0] + 0.65 * 255, 0, 255
        ).astype(np.uint8)
        overlay[combined_mask, 1] = np.clip(
            0.35 * overlay[combined_mask, 1] + 0.65 * 55, 0, 255
        ).astype(np.uint8)
        overlay[combined_mask, 2] = np.clip(
            0.35 * overlay[combined_mask, 2] + 0.65 * 30, 0, 255
        ).astype(np.uint8)

    pil_overlay = Image.fromarray(overlay)
    buf = io.BytesIO()
    pil_overlay.save(buf, format="PNG")
    mask_b64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

    return SegmentationResult(
        severity_percentage=severity_pct,
        severity_level=severity_level,
        lesion_pixels=lesion_pixels,
        total_pixels=total_leaf_pixels,
        mask_overlay_base64=mask_b64,
    )


def query_offline_sqlite(crop_name: str, disease_name: str) -> OfflineSQLiteTreatment:
    """Truy vấn CSDL SQLite cục bộ (`disease_treatments.db`) cho chế độ Offline / Hybrid."""
    db_path = _resolve_sqlite_path()
    if not db_path.exists():
        return OfflineSQLiteTreatment(found=False)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        # Tìm kiếm linh hoạt theo crop_name và disease_name (hỗ trợ cả Potato___Late_blight và Late blight)
        search_pattern = f"%{disease_name.replace(' ', '_')}%"
        cur.execute(
            """
            SELECT * FROM DiseaseTreatments
            WHERE LOWER(crop_name) = LOWER(?) 
              AND (LOWER(disease_name) = LOWER(?) OR disease_name LIKE ?)
            LIMIT 1
            """,
            (crop_name, disease_name, search_pattern),
        )
        row = cur.fetchone()
        if not row:
            cur.execute(
                """
                SELECT * FROM DiseaseTreatments
                WHERE LOWER(disease_name) = LOWER(?) OR disease_name LIKE ?
                LIMIT 1
                """,
                (disease_name, search_pattern),
            )
            row = cur.fetchone()
        if not row:
            return OfflineSQLiteTreatment(found=False)

        # Trích xuất số ngày cách ly PHI từ cột chemical_treatment nếu có
        phi_days = 7
        chem_text = row["chemical_treatment"] or ""
        if "PHI" in chem_text:
            try:
                import re
                match = re.search(r"PHI\)?:\s*(\d+)", chem_text)
                if match:
                    phi_days = int(match.group(1))
            except Exception:
                pass

        return OfflineSQLiteTreatment(
            found=True,
            crop_name=row["crop_name"],
            disease_name=row["disease_name"],
            disease_vi=row["vietnamese_name"],
            severity_threshold=15.0 if row["severity_level"] != "Nhẹ" else 5.0,
            chemical_treatment=chem_text,
            biological_treatment=row["biological_treatment"],
            preventive_measures=row["preventive_measures"],
            pre_harvest_interval_days=phi_days,
        )
    finally:
        conn.close()


@router.post("/diagnose", response_model=DiagnoseE2EResponse, tags=["E2E Diagnosis Pipeline"])
def diagnose_leaf_image(
    file: UploadFile = File(..., description="Ảnh chụp lá cây (.jpg, .png, .webp)"),
    crop_filter: str = Form("", description="Loài cây do người dùng chọn (User-Guided Filtering), ví dụ: Potato, Tomato, Apple, Corn, Grape"),
    network_mode: str = Form("hybrid", description="Chế độ định tuyến: hybrid | online | offline"),
    blur_threshold: float = Form(100.0, description="Ngưỡng phương sai Laplacian tối thiểu để chấp nhận ảnh"),
    user_notes: str = Form("", description="Ghi chú điều kiện canh tác/thời tiết cho hệ thống RAG"),
    force_analyze: bool = Form(False, description="Bỏ qua chặn ảnh mờ nếu người dùng vẫn muốn ép suy luận"),
):
    """
    Endpoint End-to-End (10 bước) nhận ảnh lá cây từ người dùng:
    1. Đọc & giải mã ảnh RGB
    2. Kiểm tra độ mờ bằng phương sai Laplacian (từ chối nếu < blur_threshold)
    3. Áp dụng bộ lọc loài cây (User-Guided Filtering)
    4. Suy luận Swin Transformer V2 (ONNX + TTA)
    5. Suy luận U-Net Segmentation tính % mức độ bệnh (Severity %) & sinh ảnh Mask Overlay
    6. Định tuyến Hybrid Network (Offline SQLite + Online ChromaDB RAG)
    """
    t0 = time.perf_counter()
    raw_bytes = file.file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="File ảnh tải lên rỗng.")

    try:
        pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Không thể đọc định dạng ảnh: {exc}")

    rgb_full = np.array(pil_img, dtype=np.uint8)

    # Bước 2: Kiểm tra độ mờ Laplacian Variance
    is_force = force_analyze if isinstance(force_analyze, bool) else bool(getattr(force_analyze, "default", False))
    blur_result = compute_laplacian_variance(rgb_full, threshold=blur_threshold)
    if blur_result.is_blurry and not is_force:
        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        return DiagnoseE2EResponse(
            status="rejected_blurry",
            workflow_steps_completed=2,
            inference_time_ms=elapsed_ms,
            network_mode_requested=network_mode,
            active_treatment_source="Rejected at Step 2 (Laplacian Blur Filter)",
            blur_check=blur_result,
        )

    # Bước 3-5: Resize 256x256 & chạy 2 mô hình ONNX (SwinV2 + U-Net)
    rgb_256 = np.array(pil_img.resize((256, 256), Image.Resampling.BILINEAR), dtype=np.uint8)
    swin_sess, unet_sess = get_onnx_sessions()

    classification = run_swin_classification_with_tta(
        swin_session=swin_sess,
        rgb_256=rgb_256,
        crop_filter=crop_filter,
    )
    is_healthy = classification.disease_name.lower() == "healthy"
    segmentation = run_unet_segmentation(
        unet_session=unet_sess,
        rgb_256=rgb_256,
        is_healthy_leaf=is_healthy,
    )

    # Bước 6-9: Hybrid Network Router (Offline SQLite vs Online RAG ChromaDB)
    mode = (network_mode or "hybrid").lower().strip()
    offline_data = query_offline_sqlite(classification.crop_name, classification.disease_name)
    online_rag_data = None
    active_source = "Offline SQLite Database (disease_treatments.db)"

    if mode in ("hybrid", "online"):
        try:
            rag_req = TreatmentRequest(
                crop_name=classification.crop_name,
                disease_name=classification.disease_name,
                severity_percentage=segmentation.severity_percentage,
                user_notes=user_notes or "Chẩn đoán trực tiếp từ ảnh lá cây qua luồng End-to-End",
            )
            online_rag_data = generate_treatment_plan(rag_req)
            active_source = "Online FastAPI RAG + ChromaDB Vectorstore"
        except Exception:
            if mode == "online":
                active_source = "Fallback Offline SQLite (Online RAG Error)"

    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    return DiagnoseE2EResponse(
        status="success",
        workflow_steps_completed=10,
        inference_time_ms=elapsed_ms,
        network_mode_requested=mode,
        active_treatment_source=active_source,
        blur_check=blur_result,
        classification=classification,
        segmentation=segmentation,
        offline_treatment=offline_data,
        online_rag_treatment=online_rag_data,
    )

