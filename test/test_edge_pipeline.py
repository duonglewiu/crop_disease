"""
Kiểm thử toàn diện chu trình xử lý trên thiết bị biên (Edge AI Pipeline):
1. Bộ lọc ảnh mờ (Laplacian Variance - Checkpoint 4)
2. Suy luận ONNX Runtime: Swin Transformer V2 (Classification) + U-Net (Severity Segmentation - Checkpoint 2)
3. Truy vấn CSDL SQLite cục bộ (better-sqlite3 / sqlite3 - Checkpoint 3)
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sqlite3
import numpy as np
import onnxruntime as ort
from ai_core.scripts.blur_filter import calculate_laplacian_variance

SWIN_ONNX = "test/swinv2_plantdisease.onnx"
UNET_ONNX = "test/unet_plantdisease.onnx"
SQLITE_DB = "data/sqlite/disease_treatments.db"

# 15 nhãn bệnh tương ứng với đầu ra của mô hình SwinV2 (15 classes)
CLASSES = [
    "Apple___Apple_scab", "Apple___Black_rot", "Apple___Cedar_apple_rust", "Apple___healthy",
    "Corn___Cercospora_leaf_spot", "Corn___Common_rust", "Corn___Northern_Leaf_Blight", "Corn___healthy",
    "Grape___Black_rot", "Grape___Esca", "Grape___Leaf_blight", "Grape___healthy",
    "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy"
]

def run_edge_pipeline():
    print("=" * 60)
    print(" BẮT ĐẦU KIỂM THỬ CHU TRÌNH EDGE AI SUY LUẬN & CSDL")
    print("=" * 60)

    # 1. Giả lập ảnh đầu vào kích thước chuẩn 256x256x3
    np.random.seed(42)
    fake_leaf_image = np.random.randint(50, 200, (256, 256, 3), dtype=np.uint8)
    # Thêm cạnh tương phản để giả lập phiến lá
    fake_leaf_image[40:220, 40:220] = [34, 139, 34] # Màu xanh lục lá cây
    fake_leaf_image[90:150, 90:150] = [139, 69, 19] # Đốm nâu vết bệnh

    # 2. Bước 1: Kiểm tra độ mờ (Laplacian Variance)
    blur_res = calculate_laplacian_variance(fake_leaf_image, threshold=100.0)
    print(f"\n[Bước 1 - Lọc ảnh mờ]: Phương sai = {blur_res['variance']} | Trạng thái = {blur_res['status']}")
    if blur_res['is_blurry']:
        print("-> Ảnh bị mờ, từ chối suy luận.")
        return

    # 3. Bước 2: Chuẩn bị Tensor [1, 3, 256, 256] dạng Float32 chuẩn hóa [0, 1]
    input_tensor = (fake_leaf_image.astype(np.float32) / 255.0).transpose(2, 0, 1)
    input_batch = np.expand_dims(input_tensor, axis=0) # [1, 3, 256, 256]

    # 4. Bước 3: Suy luận Swin Transformer V2 (Phân loại)
    print(f"\n[Bước 2 - Suy luận Swin Transformer V2]: Đang nạp {SWIN_ONNX}...")
    swin_sess = ort.InferenceSession(SWIN_ONNX)
    swin_inputs = {swin_sess.get_inputs()[0].name: input_batch}
    swin_outputs = swin_sess.run(None, swin_inputs)
    logits = swin_outputs[0][0] # 15 classes
    
    # Tính xác suất qua Softmax
    exp_logits = np.exp(logits - np.max(logits))
    probs = exp_logits / exp_logits.sum()
    pred_idx = int(np.argmax(probs))
    pred_class = CLASSES[pred_idx] if pred_idx < len(CLASSES) else f"Class_{pred_idx}"
    confidence = float(probs[pred_idx])
    print(f"-> Dự đoán bệnh: {pred_class} (Độ tin cậy: {confidence*100:.2f}%)")

    # 5. Bước 4: Suy luận U-Net (Phân đoạn tổn thương)
    print(f"\n[Bước 3 - Suy luận U-Net Phân đoạn]: Đang nạp {UNET_ONNX}...")
    unet_sess = ort.InferenceSession(UNET_ONNX)
    unet_inputs = {unet_sess.get_inputs()[0].name: input_batch}
    unet_outputs = unet_sess.run(None, unet_inputs)
    pred_mask = unet_outputs[0][0][0] # [256, 256]
    
    # Tính Severity: tỷ lệ pixel tổn thương (> 0.5) trên tổng số pixel
    lesion_pixels = np.sum(pred_mask > 0.5)
    total_pixels = pred_mask.size
    severity_percentage = float((lesion_pixels / total_pixels) * 100.0)
    print(f"-> Mức độ tổn thương lá (Severity): {severity_percentage:.2f}% ({lesion_pixels}/{total_pixels} pixels)")

    # 6. Bước 5: Truy vấn CSDL SQLite cục bộ (Offline Treatment)
    print(f"\n[Bước 4 - Truy vấn CSDL SQLite Offline]: Đang truy vấn {SQLITE_DB}...")
    crop_name = pred_class.split("___")[0] if "___" in pred_class else "Potato"
    
    conn = sqlite3.connect(SQLITE_DB)
    cursor = conn.cursor()
    cursor.execute("SELECT vietnamese_name, severity_level, immediate_actions, chemical_treatment FROM DiseaseTreatments WHERE crop_name = ? OR disease_name LIKE ? LIMIT 1", (crop_name, f"%{crop_name}%"))
    row = cursor.fetchone()
    if row:
        print(f"-> Tên tiếng Việt: {row[0]}")
        print(f"-> Mức độ cảnh báo: {row[1]}")
        print(f"-> Hành động tức thì: {row[2]}")
        print(f"-> Biện pháp hóa học: {row[3]}")
    else:
        print("-> Không tìm thấy phác đồ tĩnh, sẵn sàng chuyển tiếp sang Server RAG.")
    conn.close()

    print("\n" + "=" * 60)
    print(" HOÀN THÀNH TOÀN BỘ KIỂM THỬ EDGE AI PIPELINE (TUẦN 4 THÀNH CÔNG)")
    print("=" * 60)

if __name__ == "__main__":
    run_edge_pipeline()
