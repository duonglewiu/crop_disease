"""
Kiểm thử tự động toàn diện luồng End-to-End 10 bước (Phase 5 & Phase 6):
- Kịch bản 1: Ảnh lá bệnh rõ nét (Laplacian Pass -> SwinV2 ONNX + TTA + Crop Filter -> U-Net Mask Overlay -> Hybrid RAG + SQLite).
- Kịch bản 2: Ảnh lá bị mờ rung tay (Bị chặn ngay tại Bước 2 bởi Laplacian Variance < 100).
- Kịch bản 3: Chế độ Offline (Định tuyến Hybrid Router về SQLite cục bộ).
"""
import io
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from starlette.datastructures import UploadFile

ROOT_DIR = Path(__file__).resolve().parent.parent
SERVER_DIR = ROOT_DIR / "server"
sys.path.insert(0, str(SERVER_DIR))

os.environ["CHROMA_PERSIST_DIR"] = str(SERVER_DIR / "chroma_db")
os.environ["SQLITE_DB_PATH"] = str(ROOT_DIR / "data" / "sqlite" / "disease_treatments.db")
os.environ["GEMINI_API_KEY"] = ""  # Tắt gọi LLM bên ngoài khi test tự động để tránh chờ timeout mạng
os.environ["OPENAI_API_KEY"] = ""

from app.core.config import settings
settings.GEMINI_API_KEY = ""
settings.OPENAI_API_KEY = ""

from app.api.v1.endpoints.diagnose import diagnose_leaf_image


def create_sharp_diseased_leaf_png() -> bytes:
    """Tạo ảnh lá cây sắc nét (256x256) có gân lá và các đốm bệnh nâu/vàng."""
    img = Image.new("RGB", (256, 256), (25, 35, 28))
    draw = ImageDraw.Draw(img)

    # Phiến lá xanh
    draw.ellipse([32, 48, 224, 208], fill=(54, 138, 60), outline=(140, 235, 150), width=3)

    # Gân lá sắc nét (tạo độ tương phản cạnh cao cho Laplacian Variance)
    draw.line([(40, 128), (216, 128)], fill=(195, 245, 195), width=3)
    for x in range(65, 200, 25):
        draw.line([(x, 128), (x + 15, 78)], fill=(180, 240, 185), width=2)
        draw.line([(x, 128), (x + 15, 178)], fill=(180, 240, 185), width=2)

    # Thêm chi tiết bề mặt sắc nét
    arr = np.array(img, dtype=np.uint8)
    checker = (np.indices((256, 256)).sum(axis=0) % 2) * 35
    arr[:, :, 1] = np.clip(arr[:, :, 1].astype(np.int32) + checker - 15, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    draw = ImageDraw.Draw(img)

    # Vẽ các ổ vết bệnh hoại tử nâu đỏ + quầng vàng
    lesions = [(95, 108, 22), (150, 138, 25), (128, 96, 16)]
    for cx, cy, r in lesions:
        draw.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], fill=(215, 165, 38))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(108, 42, 18), outline=(45, 15, 5), width=2)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_blurry_leaf_png() -> bytes:
    """Tạo ảnh lá bị mờ (tần số cao bằng 0 -> Laplacian Variance ~ 0)."""
    arr = np.zeros((256, 256, 3), dtype=np.uint8)
    arr[:, :, 0] = 65
    arr[:, :, 1] = 125
    arr[:, :, 2] = 65
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def run_e2e_tests():
    print("=" * 72, flush=True)
    print("🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN END-TO-END (PHASE 5 & PHASE 6)", flush=True)
    print("=" * 72, flush=True)

    # 1. Test Kịch bản 1: Ảnh lá bệnh sắc nét + Hybrid Mode + Crop Filter = Potato
    sharp_bytes = create_sharp_diseased_leaf_png()
    upload1 = UploadFile(file=io.BytesIO(sharp_bytes), filename="sharp_potato_leaf.png")
    resp1 = diagnose_leaf_image(
        file=upload1,
        crop_filter="Potato",
        network_mode="hybrid",
        blur_threshold=100.0,
        user_notes="Mưa ẩm kéo dài tại Đà Lạt",
    )
    d1 = resp1.model_dump()
    print("\n[KỊCH BẢN 1] Ảnh lá bệnh rõ nét (Chế độ Hybrid + Lọc cây Potato):", flush=True)
    print(f"  - Status               : {d1['status']} ({d1['workflow_steps_completed']}/10 bước)", flush=True)
    print(f"  - Laplacian Variance   : {d1['blur_check']['laplacian_variance']} (Ngưỡng: {d1['blur_check']['threshold']})", flush=True)
    print(f"  - Phân loại SwinV2+TTA : {d1['classification']['disease_vi']} (Confidence: {d1['classification']['confidence']*100:.1f}%)", flush=True)
    print(f"  - Phân đoạn U-Net      : Severity = {d1['segmentation']['severity_percentage']}% ({d1['segmentation']['severity_level']})", flush=True)
    print(f"  - Mask Overlay Base64  : {'Đã sinh thành công (' + str(len(d1['segmentation']['mask_overlay_base64'])) + ' chars)' if d1['segmentation']['mask_overlay_base64'] else 'Missing'}", flush=True)
    print(f"  - Nguồn phác đồ chính  : {d1['active_treatment_source']}", flush=True)
    print(f"  - Offline SQLite Match : {d1['offline_treatment']['found']} ({d1['offline_treatment']['disease_vi']})", flush=True)
    print(f"  - Online RAG Actions   : {len(d1['online_rag_treatment']['immediate_actions'])} hành động khẩn cấp, {len(d1['online_rag_treatment']['chemical_treatments'])} thuốc đặc trị", flush=True)

    assert d1["status"] == "success"
    assert d1["workflow_steps_completed"] == 10
    assert d1["blur_check"]["is_blurry"] is False
    assert d1["classification"]["crop_name"] == "Potato"
    assert d1["segmentation"]["severity_percentage"] > 0
    assert d1["segmentation"]["mask_overlay_base64"].startswith("data:image/png;base64,")
    assert d1["offline_treatment"]["found"] is True
    assert d1["online_rag_treatment"] is not None

    # 2. Test Kịch bản 2: Ảnh mờ rung tay -> Phải bị từ chối ở Bước 2
    blurry_bytes = create_blurry_leaf_png()
    upload2 = UploadFile(file=io.BytesIO(blurry_bytes), filename="blurry_leaf.png")
    resp2 = diagnose_leaf_image(
        file=upload2,
        crop_filter="Potato",
        network_mode="hybrid",
        blur_threshold=100.0,
    )
    d2 = resp2.model_dump()
    print("\n[KỊCH BẢN 2] Ảnh bị mờ rung tay (Kiểm tra bộ lọc Laplacian Checkpoint 4):", flush=True)
    print(f"  - Status               : {d2['status']} (Dừng ở bước {d2['workflow_steps_completed']}/10)", flush=True)
    print(f"  - Laplacian Variance   : {d2['blur_check']['laplacian_variance']} < {d2['blur_check']['threshold']}", flush=True)
    print(f"  - Thông báo trả về     : {d2['blur_check']['message']}", flush=True)

    assert d2["status"] == "rejected_blurry"
    assert d2["workflow_steps_completed"] == 2
    assert d2["blur_check"]["is_blurry"] is True
    assert d2["classification"] is None

    # 3. Test Kịch bản 3: Chế độ Offline SQLite + Lọc cây Tomato (Extended Crop Filter)
    upload3 = UploadFile(file=io.BytesIO(sharp_bytes), filename="sharp_tomato_leaf.png")
    resp3 = diagnose_leaf_image(
        file=upload3,
        crop_filter="Tomato",
        network_mode="offline",
        blur_threshold=100.0,
    )
    d3 = resp3.model_dump()
    print("\n[KỊCH BẢN 3] Chế độ Offline (SQLite) + Lọc loài cây Tomato:", flush=True)
    print(f"  - Status               : {d3['status']} ({d3['workflow_steps_completed']}/10 bước)", flush=True)
    print(f"  - Phân loại            : {d3['classification']['disease_vi']}", flush=True)
    print(f"  - Nguồn phác đồ        : {d3['active_treatment_source']}", flush=True)
    print(f"  - Thuốc SQLite         : {d3['offline_treatment']['chemical_treatment'][:80]}...", flush=True)

    assert d3["status"] == "success"
    assert d3["classification"]["crop_name"] == "Tomato"
    assert d3["offline_treatment"]["found"] is True
    assert d3["online_rag_treatment"] is None

    print("\n" + "=" * 72, flush=True)
    print("✅ TẤT CẢ 3 KỊCH BẢN END-TO-END (10 BƯỚC) ĐỀU PASS TUYỆT ĐỐI!", flush=True)
    print("=" * 72, flush=True)


if __name__ == "__main__":
    run_e2e_tests()
