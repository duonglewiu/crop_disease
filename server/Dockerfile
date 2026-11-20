# Base image Python 3.11 slim để image tối ưu dung lượng và tốc độ
FROM python:3.11-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Biến môi trường hệ thống
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Cài đặt các package hệ thống cần thiết (curl để healthcheck, build-essential nếu cần biên dịch C)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements và cài đặt dependencies Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn server và scripts vào container
COPY app /app/app
COPY ingest_knowledge.py test_rag_api.py /app/

# Tạo thư mục lưu trữ persistent ChromaDB
RUN mkdir -p /app/chroma_db /app/knowledge_base

# Expose cổng 8000
EXPOSE 8000

# Khởi chạy FastAPI với Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
