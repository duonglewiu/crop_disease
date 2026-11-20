"""
Thuật toán lọc ảnh mờ sử dụng phương sai toán tử Laplacian (Laplacian Variance).
Đáp ứng Checkpoint 4 (Tuần 4.4 trong Kế hoạch đồ án tốt nghiệp).
Theo bài báo Yan et al., 2026: Lọc bỏ ảnh kém chất lượng trước khi nạp vào mạng Deep Learning.
"""

import cv2
import numpy as np

def calculate_laplacian_variance(image_path_or_array, threshold: float = 100.0):
    """
    Tính phương sai toán tử Laplacian của ảnh:
    1. Chuyển ảnh sang thang độ xám (Grayscale).
    2. Áp dụng toán tử Laplacian 3x3 để trích xuất biên cạnh độ sáng cao.
    3. Tính phương sai (variance) của ma trận kết quả.
    - Nếu variance < threshold (mặc định 100): Ảnh bị mờ hoặc nhòe chuyển động -> TỪ CHỐI.
    - Nếu variance >= threshold: Ảnh đạt chuẩn độ sắc nét -> CHẤP NHẬN cho suy luận.
    """
    if isinstance(image_path_or_array, str):
        image = cv2.imread(image_path_or_array)
        if image is None:
            raise ValueError(f"Không thể đọc file ảnh: {image_path_or_array}")
    else:
        image = image_path_or_array

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    variance = float(laplacian.var())

    is_blurry = variance < threshold
    return {
        "is_blurry": is_blurry,
        "variance": round(variance, 2),
        "threshold": threshold,
        "status": "REJECT" if is_blurry else "ACCEPT",
        "message": "Ảnh quá mờ (rung tay hoặc mất nét). Vui lòng chụp lại!" if is_blurry else "Độ nét đạt chuẩn cho suy luận AI."
    }

if __name__ == "__main__":
    # Test thử nghiệm với ảnh giả lập sắc nét vs mờ
    sharp_img = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
    # Thêm cạnh độ tương phản cao
    sharp_img[50:200, 50:200] = 255
    res_sharp = calculate_laplacian_variance(sharp_img, threshold=100.0)
    print("Test ảnh sắc nét:", res_sharp)

    # Ảnh mờ (Gaussian Blur làm nhòe hết cạnh)
    blurred_img = cv2.GaussianBlur(sharp_img, (25, 25), 0)
    res_blur = calculate_laplacian_variance(blurred_img, threshold=100.0)
    print("Test ảnh mờ:", res_blur)

