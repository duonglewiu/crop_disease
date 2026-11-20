# TÀI LIỆU KIỂM THỬ API ENDPOINTS (RAG FASTAPI SERVICE)

Tài liệu kiểm thử và đặc tả API phục vụ Checkpoint tuần 5 (Tuần 5.3 trong Kế hoạch đồ án tốt nghiệp).

## 1. Thông tin cấu hình Server
- **Base URL:** `http://localhost:8000/api/v1`
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## 2. Danh sách Endpoints

### 2.1. Health Check
- **Endpoint:** `GET /health`
- **Mô tả:** Kiểm tra trạng thái hoạt động của Server RAG Backend.
- **Request Headers:** Không yêu cầu
- **Sample Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "Crop Disease Edge AI - RAG Backend",
  "version": "1.0.0"
}
```

---

### 2.2. Sinh phác đồ điều trị nâng cao (RAG Treatment)
- **Endpoint:** `POST /rag/treatment`
- **Mô tả:** Nhận tên cây, tên bệnh, mức độ tổn thương (Severity %) từ Edge AI để truy vấn kho kiến thức vector ChromaDB và gọi LLM sinh phác đồ can thiệp phù hợp.
- **Headers:** `Content-Type: application/json`
- **Sample Request Body:**
```json
{
  "crop_name": "Tomato",
  "disease_name": "Late blight",
  "severity_percentage": 34.5,
  "user_notes": "Trồng trong nhà màng, thời tiết nồm ẩm kéo dài 3 ngày"
}
```

- **Sample Response (200 OK):**
```json
{
  "crop_name": "Tomato",
  "disease_name": "Late blight",
  "severity_level": "Trung bình (15-40%)",
  "immediate_actions": [
    "Cách ly ngay các cá thể cây Tomato có dấu hiệu nhiễm bệnh nặng.",
    "Tỉa bỏ các cành lá có vết bệnh, gom tiêu hủy cách xa vườn trồng.",
    "Giảm lượng nước tưới, tránh tưới phun mưa trực tiếp lên tán lá vào buổi chiều tối."
  ],
  "chemical_treatments": [
    {
      "active_ingredient": "Mancozeb 80% WP",
      "product_name": "Dithane M-45",
      "dosage": "50g / bình 16 lít nước, phun đều 2 mặt lá",
      "pre_harvest_interval_days": 7
    }
  ],
  "biological_treatments": [
    {
      "method": "Chế phẩm sinh học đối kháng",
      "description": "Phun nấm đối kháng Trichoderma harzianum định kỳ 7-10 ngày/lần."
    }
  ],
  "prevention_guidelines": [
    "Đảm bảo khoảng cách trồng thông thoáng, mật độ phù hợp.",
    "Vệ sinh đồng ruộng sau mỗi vụ thu hoạch, luân canh cây trồng khác họ."
  ],
  "source_documents": [
    "Cẩm nang BVTV Cây Cà Chua & Khoai Tây 2026",
    "Giáo trình Bệnh cây đại cương"
  ]
}
```

