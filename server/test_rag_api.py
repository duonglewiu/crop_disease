"""
Script kiểm thử tự động toàn bộ API Endpoints của Server RAG (Task 4.3 trong Timeline).
Sử dụng TestClient để mô phỏng chính xác request từ Electron App / Postman.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_all_endpoints():
    print("=" * 60)
    print(" BẮT ĐẦU KIỂM THỬ API ENDPOINTS (FASTAPI + CHROMADB RAG)")
    print("=" * 60)

    # 1. Test Health Check
    print("\n[Endpoint 1]: GET /api/v1/health")
    res_health = client.get("/api/v1/health")
    print(f"Status Code: {res_health.status_code}")
    print(f"Response: {res_health.json()}")
    assert res_health.status_code == 200

    # 2. Test RAG Treatment Generation
    print("\n[Endpoint 2]: POST /api/v1/rag/treatment")
    payload = {
        "crop_name": "Tomato",
        "disease_name": "Late blight",
        "severity_percentage": 32.5,
        "user_notes": "Nhà màng công nghệ cao, độ ẩm 95% sau 2 ngày mưa liên tục"
    }
    res_rag = client.post("/api/v1/rag/treatment", json=payload)
    print(f"Status Code: {res_rag.status_code}")
    data = res_rag.json()
    print("Phác đồ điều trị sinh ra:")
    print(f"- Cây: {data.get('crop_name')} | Bệnh: {data.get('disease_name')}")
    print(f"- Mức độ cảnh báo: {data.get('severity_level')}")
    print(f"- Hành động khẩn cấp: {data.get('immediate_actions')[0]}")
    print(f"- Thuốc BVTV khuyến nghị: {data.get('chemical_treatments')[0].get('product_name')}")
    print(f"- Nguồn tài liệu RAG: {data.get('source_documents')}")
    assert res_rag.status_code == 200

    print("\n" + "=" * 60)
    print(" KIỂM THỬ API THÀNH CÔNG 100%! SẴN SÀNG CHO POSTMAN VÀ BÁO CÁO")
    print("=" * 60)

if __name__ == "__main__":
    test_all_endpoints()

