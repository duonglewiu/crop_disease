# 🌿 Crop Disease Edge AI & Hybrid RAG System
> **Đồ án tốt nghiệp:** Hệ thống Chẩn đoán Bệnh cây trồng trên Thiết bị biên (Edge AI) kết hợp Hệ thống Phục hồi Thông tin Tăng cường (RAG) và CSDL Cục bộ phục vụ Điều trị Đa phương thức.

[![Docker Build](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)
[![FastAPI](https://img.shields.io/badge/backend-FastAPI-green.svg)](https://fastapi.tiangolo.com/)
[![Electron](https://img.shields.io/badge/desktop-Electron%20%2B%20React-47848F.svg)](https://www.electronjs.org/)
[![ONNX Runtime](https://img.shields.io/badge/inference-ONNX%20Runtime-blue.svg)](https://onnxruntime.ai/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

---

## 📌 Giới thiệu Đề tài
Dựa trên các nghiên cứu tổng quan mới nhất về ứng dụng thị giác máy tính và AIoT trong bảo vệ thực vật (*Yan et al., 2026*), hệ thống được thiết kế theo kiến trúc **Edge-to-Cloud Hybrid**:
1. **Lọc chất lượng ảnh (Quality Check):** Áp dụng thuật toán **Laplacian Variance** lọc bỏ ảnh mờ, nhòe do rung tay ngoài đồng ruộng trước khi suy luận.
2. **User-Guided Filtering:** Bộ lọc chọn trước loài cây trồng (14 loại cây trồng trong tập dữ liệu PlantVillage) giúp thu hẹp không gian nhãn và nâng cao độ chính xác nhận diện.
3. **Mô hình Phân loại (Classification):** Sử dụng mạng **Swin Transformer V2** kết hợp **Test-Time Augmentation (TTA)** để phân loại chính xác 26 loại bệnh cây phổ biến.
4. **Mô hình Phân đoạn (Severity Segmentation):** Sử dụng mạng **U-Net (EfficientNet-B0 Encoder)** tính toán tỷ lệ % diện tích vết bệnh trên phiến lá (Severity %).
5. **Cơ chế Mạng lai (Hybrid Network):**
   - **Ngoại tuyến (Offline):** Tự động truy vấn phác đồ điều trị tĩnh từ CSDL **SQLite** cục bộ (`better-sqlite3`).
   - **Trực tuyến (Online):** Kết nối đến **Server RAG (FastAPI + ChromaDB + LLM API)** để sinh phác đồ can thiệp chuyên sâu theo mức độ bệnh thực tế.

---

## 📂 Cấu trúc Thư mục Dự án (Project Architecture)

```bash
crop-disease-edgeAI/
├── .github/
│   └── workflows/
│       ├── docker-build.yml       # CI/CD: Tự động kiểm tra Docker Build trên GitHub Actions
│       └── lint-test.yml          # Kiểm tra mã nguồn
│
├── ai_core/                       # [Tuần 2-3] Mã nguồn Huấn luyện & Đóng gói AI
│   ├── datasets/                  # Xử lý dataset PlantVillage (14 loại cây, 26 loại bệnh)
│   │   └── plantvillage_manifest.py
│   ├── models/                    # Định nghĩa kiến trúc mạng
│   │   ├── swin_transformer_v2.py   # Phân loại bệnh (SwinV2 + TTA)
│   │   └── unet_efficientnet.py     # Phân đoạn đo mức độ tổn thương (U-Net)
│   ├── scripts/                   # Script huấn luyện & chuyển đổi
│   │   ├── train_classifier.py      # Huấn luyện SwinV2
│   │   ├── train_segmentation.py    # Huấn luyện U-Net
│   │   └── export_onnx.py           # Xuất PyTorch -> ONNX & Lượng tử hóa
│   ├── weights/                   # Thư mục lưu checkpoint trọng số (.gitkeep)
│   └── requirements.txt           # Thư viện: PyTorch, timm, albumentations, onnx
│
├── desktop/                       # [Tuần 4, 6, 7] Ứng dụng Desktop (Electron + React)
│   ├── main/                      # Electron Main Process (Node.js Backend)
│   │   ├── index.ts               # Khởi tạo Main & IPC Handlers
│   │   ├── preload.ts             # Context Bridge an toàn IPC
│   │   ├── ai/                    # ONNX Runtime Node.js chạy suy luận cục bộ
│   │   │   └── onnx_inference.ts
│   │   ├── filters/               # Bộ lọc ảnh mờ (Laplacian variance)
│   │   │   └── blur_detector.ts
│   │   └── database/              # Truy vấn SQLite cục bộ (Offline)
│   │       └── sqlite_client.ts
│   ├── src/                       # React Frontend (Renderer Process)
│   │   ├── components/            # UI Components (CameraCapture, CropFilter, DiagnosisCard, TreatmentPanel)
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.html
│   ├── electron-builder.json5     # Cấu hình đóng gói .exe cho Windows
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/                        # [Tuần 5] Backend RAG & Vector DB (Dockerized)
│   ├── app/
│   │   ├── api/v1/                # REST API Endpoints (/health, /rag/treatment)
│   │   ├── core/                  # Cấu hình môi trường & Settings
│   │   ├── rag/                   # LangChain + ChromaDB + LLM Generator
│   │   ├── schemas/               # Pydantic Schemas
│   │   └── main.py                # FastAPI Entry Point
│   ├── Dockerfile                 # Đóng gói Docker image cho FastAPI
│   └── requirements.txt           # Thư viện: fastapi, uvicorn, langchain, chromadb
│
├── data/                          # Quản lý Dữ liệu
│   ├── knowledge_base/            # Tài liệu nông học phục vụ Vector DB RAG
│   ├── plantvillage/              # Dữ liệu ảnh mẫu & manifest
│   └── sqlite/                    # CSDL SQLite tĩnh (default_treatments.sql)
│
├── docs/                          # Tài liệu Báo cáo & Đặc tả Kỹ thuật
│   ├── architecture.md            # Thiết kế kiến trúc hệ thống
│   ├── api_spec.md                # Tài liệu kiểm thử API Postman
│   └── references/                # Bài báo nghiên cứu tham khảo
│
├── test/                          # Thư mục lưu các mô hình ONNX & PyTorch đã xuất
├── .dockerignore                  # Loại trừ file rác khi build Docker
├── .gitignore                     # Cấu hình Git (loại trừ node_modules, file model > 100MB)
├── .env.example                   # Mẫu biến môi trường
├── docker-compose.yml             # Khởi chạy Docker Compose (RAG Backend + ChromaDB)
└── README.md                      # Hướng dẫn chi tiết
```

---

## 🚀 Hướng dẫn Cài đặt & Triển khai

### 1. Chuẩn bị Biến môi trường
Sao chép file `.env.example` thành `.env`:
```bash
cp .env.example .env
```
Điền `GEMINI_API_KEY` (hoặc `OPENAI_API_KEY`) để sử dụng tính năng sinh phác đồ trực tuyến qua RAG.

---

### 2. Triển khai Backend RAG & Edge Pipeline bằng Docker (Khuyên dùng)
Hệ thống hỗ trợ build và chạy dịch vụ FastAPI + ChromaDB + ONNX Runtime qua **Docker Compose**:

```bash
# 1. Build Docker Image và khởi chạy container chạy ngầm
docker compose up -d --build

# 2. Xem logs container
docker compose logs -f

# 3. Kiểm tra API Swagger UI & Health
# Swagger UI: http://localhost:8000/docs
# Health:     http://localhost:8000/api/v1/health
```

> **Lưu ý về Trọng số AI (`*.onnx.data`):** Theo giới hạn 100MB của GitHub, các file trọng số nhị phân (`swinv2_plantdisease.onnx(.data)` và `unet_plantdisease.onnx(.data)`) không push lên Git. Tải bộ model ONNX từ nhóm và đặt vào thư mục `test/` trước khi gọi endpoint chẩn đoán ảnh `POST /api/v1/diagnose`. Backend RAG (`/api/v1/rag/treatment`) và ChromaDB tự động nạp tài liệu từ `data/knowledge_base/agricultural_guidelines.md` ngay khi khởi động Docker.

Để dừng container:
```bash
docker compose down
```

---

### 3. Chạy Giao diện Web & Ứng dụng Desktop (`desktop/`)
Chạy giao diện React (`http://localhost:5173`) kết nối Docker Backend hoặc Electron:

```bash
# Truy cập vào thư mục desktop
cd desktop

# Cài đặt thư viện Node.js
npm install

# Chạy bộ test giao diện UI/UX tự động (Vitest)
npm test

# Cách A: Chạy giao diện Web trên trình duyệt (http://localhost:5173)
npm run dev

# Cách B: Khởi chạy ứng dụng Electron Desktop đầy đủ
npm run electron:dev
```

Để đóng gói ra file cài đặt Windows `.exe` (Tuần 8):
```bash
npm run pack:win
```

---

### 4. Kiểm thử Backend, Database & Môi trường Huấn luyện (`test/`, `ai_core/`)
Kiểm thử nhanh các thành phần backend Python (yêu cầu cài `pip install -r server/requirements.txt`):
```bash
# 1. Kiểm thử API RAG (Health + /rag/treatment)
python server/test_rag_api.py

# 2. Kiểm tra CSDL SQLite Offline & ChromaDB Vectorstore
python test/verify_databases.py

# 3. Kiểm thử luồng E2E 10 bước với ảnh lá (cần file ONNX trong thư mục test/)
python test/test_full_e2e_api.py
```

Huấn luyện AI (`ai_core/`):
```bash
pip install -r ai_core/requirements.txt
python ai_core/datasets/plantvillage_manifest.py
python ai_core/scripts/train_classifier.py
python ai_core/scripts/train_segmentation.py
python ai_core/scripts/export_onnx.py
```

---

## ⚠️ Lưu ý Quan trọng khi Đồng bộ GitHub

1. **Các file được `.gitignore` tự động loại trừ (không đẩy lên GitHub):**
   - Trọng số AI (`*.pth`, `*.onnx`, `*.onnx.data`) do dung lượng lớn (`swinv2_plantdisease.onnx.data` ~116MB, vượt ngưỡng 100MB của GitHub).
   - Thư mục môi trường và cache (`node_modules/`, `desktop/dist/`, `server/chroma_db/`, `data/sqlite/*.db`, `.env`).
   - Công cụ nội bộ trợ lý lập trình (`.agent/`, `.planning/`, `design-system/`).

2. **Quy trình đồng bộ code chuẩn cho thành viên nhóm:**
```bash
git clone https://github.com/duonglewiu/crop_disease.git
cd crop_disease
cp .env.example .env
docker compose up -d --build
```

---

## 👥 Thành viên Thực hiện & Phân công Công việc
- **Mạnh:** Thiết lập môi trường, Dataset PlantVillage, Huấn luyện mô hình SwinV2 & U-Net, Chuyển đổi ONNX, Xây dựng FastAPI & ChromaDB RAG, Đóng gói Docker Backend, Báo cáo đồ án.
- **Dương:** Phát triển Electron Main Process, Tích hợp SQLite CSDL, Bộ lọc ảnh mờ Laplacian, Giao diện React/TypeScript, User-Guided Filtering, Báo cáo chẩn đoán E2E.

