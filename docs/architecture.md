# KIẾN TRÚC HỆ THỐNG CROP DISEASE EDGE AI & HYBRID RAG

## 1. Giới thiệu tổng quan
Dự án được xây dựng dựa trên các nghiên cứu tổng quan mới nhất về chẩn đoán và dự báo bệnh hại cây trồng nông nghiệp (Yan et al., 2026). Hệ thống giải quyết các thách thức lớn trong thực địa:
- **Tính thời gian thực & Chi phí thấp:** Chạy suy luận trực tiếp trên thiết bị biên (Edge AI) thông qua ONNX Runtime.
- **Xử lý ảnh mờ rung lắc tại ruộng:** Tích hợp bộ lọc phương sai Laplacian (Laplacian variance) loại bỏ ảnh kém chất lượng trước khi inference.
- **Đánh giá mức độ bệnh (Severity):** Không chỉ phân loại tên bệnh mà còn đo đạc % diện tích mô lá bị tổn thương bằng mô hình phân đoạn U-Net.
- **Cơ chế Hybrid Network:** Hỗ trợ hoạt động 100% ngoại tuyến (Offline) với CSDL SQLite và tự động nâng cấp sang tư vấn chuyên sâu trực tuyến (Online) với hệ thống RAG + LLM.

## 2. Sơ đồ luồng xử lý End-to-End (E2E)

```
[ Camera / Ảnh lá cây ]
          │
          ▼
[ 1. Bộ lọc Laplacian Variance ] ──(Ảnh mờ / Rung)──> [ Từ chối & Báo chụp lại ]
          │ (Ảnh đạt chuẩn)
          ▼
[ 2. User-Guided Crop Filter (14 Crops) ]
          │
          ▼
┌──────────────────────────────────────────────┐
│        3. EDGE AI INFERENCE ENGINE           │
│  ┌────────────────────────────────────────┐  │
│  │ Swin Transformer V2 (Classification)   │  │
│  │ -> Nhận diện 26 loại bệnh + TTA        │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │ U-Net EfficientNet-B0 (Segmentation)   │  │
│  │ -> Tính % diện tích tổn thương lá      │  │
│  └────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────┘
                       │ Kết quả (Tên bệnh, Độ tin cậy %, Severity %)
                       ▼
         [ 4. Hybrid Network Router ]
          /                        \
         / (Mất mạng / Offline)     \ (Có mạng / Online)
        ▼                            ▼
[ 5. Local SQLite Database ]    [ 6. FastAPI + ChromaDB + LLM (RAG) ]
(better-sqlite3)                - Truy xuất tài liệu khuyến nông
- Phác đồ tĩnh khởi tạo sẵn     - LLM sinh phác đồ can thiệp linh hoạt
        \                            /
         \                          /
          ▼                        ▼
       [ 7. Giao diện React Desktop / Báo cáo Chẩn đoán ]
```

## 3. Các thành phần công nghệ chính
- **Mô hình Phân loại (Classification):** Swin Transformer V2 (timm), tối ưu hóa bằng Test-Time Augmentation (TTA).
- **Mô hình Phân đoạn (Segmentation):** U-Net (Backbone: EfficientNet-B0) phân đoạn pixel vùng bệnh để tính Severity.
- **Inference Runtime:** ONNX Runtime Node.js (`onnxruntime-node`).
- **Ứng dụng Desktop:** Electron + React 18 + TypeScript + Tailwind CSS.
- **Lưu trữ Cục bộ:** SQLite (`better-sqlite3`).
- **Server RAG:** FastAPI + LangChain + ChromaDB + Google Gemini / OpenAI.
- **Đóng gói & Phân phối:** Docker & Docker Compose (Server RAG), Electron Builder (.exe cho Windows).

