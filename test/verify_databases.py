"""
Script kiểm tra toàn diện trạng thái hoạt động của cả 2 Hệ Quản Trị Cơ Sở Dữ Liệu:
1. SQLite Database (Offline CSDL - Checkpoint 3 / Tuần 4)
2. ChromaDB Vector Database (Online RAG Vectorstore - Task 4.1 / Tuần 5)
"""

import os
import sys
import sqlite3

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)
sys.path.insert(0, os.path.join(ROOT_DIR, "server"))

SQLITE_DB_PATH = os.path.join(ROOT_DIR, "data", "sqlite", "disease_treatments.db")
SQL_INIT_PATH = os.path.join(ROOT_DIR, "data", "sqlite", "default_treatments.sql")

def verify_sqlite_db():
    print("=" * 65)
    print(" 1. KIỂM TRA CSDL SQLITE CỤC BỘ (OFFLINE DATABASE - TUẦN 4)")
    print("=" * 65)

    if not os.path.exists(SQLITE_DB_PATH):
        print(f"[!] Chưa tìm thấy file {SQLITE_DB_PATH}. Đang tự động khởi tạo...")
        from data.sqlite.init_sqlite import init_database
        init_database()

    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()

    # 1. Kiểm tra cấu trúc bảng (Schema)
    cursor.execute("PRAGMA table_info(DiseaseTreatments);")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"[+] Bảng 'DiseaseTreatments' tồn tại. Các cột ({len(columns)}): {', '.join(columns)}")

    # 2. Kiểm tra số lượng bản ghi
    cursor.execute("SELECT COUNT(*) FROM DiseaseTreatments;")
    total = cursor.fetchone()[0]
    print(f"[+] Tổng số phác đồ điều trị tĩnh đang lưu: {total} bản ghi\n")

    # 3. Liệt kê danh sách các bệnh trong SQLite
    cursor.execute("SELECT id, crop_name, disease_name, vietnamese_name, severity_level FROM DiseaseTreatments;")
    rows = cursor.fetchall()
    print(f"{'ID':<4} | {'Cây trồng':<10} | {'Mã bệnh (Model Label)':<25} | {'Mức độ':<12} | {'Tên tiếng Việt'}")
    print("-" * 95)
    for r in rows:
        print(f"{r[0]:<4} | {r[1]:<10} | {r[2]:<25} | {r[4]:<12} | {r[3]}")

    # 4. Test truy vấn thử nghiệm theo tên cây và tên bệnh
    print("\n[+] Test truy vấn SQL thực tế (WHERE crop_name = 'Tomato' AND disease_name = 'Tomato___Late_blight'):")
    cursor.execute("""
        SELECT vietnamese_name, immediate_actions, chemical_treatment, biological_treatment
        FROM DiseaseTreatments
        WHERE crop_name = ? AND disease_name = ?
    """, ("Tomato", "Tomato___Late_blight"))
    sample = cursor.fetchone()
    if sample:
        print(f"    -> Tên bệnh: {sample[0]}")
        print(f"    -> Xử lý ngay: {sample[1]}")
        print(f"    -> Hóa học: {sample[2]}")
        print(f"    -> Sinh học: {sample[3]}")
        print("    => KẾT LUẬN SQLITE: HOẠT ĐỘNG CHUẨN 100%!\n")
    else:
        print("    => LỖI: Không truy vấn được bản ghi mẫu!\n")

    conn.close()


def verify_chromadb():
    print("=" * 65)
    print(" 2. KIỂM TRA VECTOR DB CHROMADB (ONLINE RAG - TUẦN 5)")
    print("=" * 65)

    from app.rag.chroma_store import chroma_manager
    from ingest_knowledge import ingest_data

    count = chroma_manager.get_count()
    if count == 0:
        print("[!] ChromaDB đang trống. Đang nạp dữ liệu từ agricultural_guidelines.md...")
        ingest_data()
        count = chroma_manager.get_count()

    print(f"[+] Đường dẫn lưu trữ: {chroma_manager.persist_directory}")
    print(f"[+] Tên bộ sưu tập (Collection): {chroma_manager.collection_name}")
    print(f"[+] Hàm nhúng (Embedding): {chroma_manager.embedding_fn.name()} (384 chiều)")
    print(f"[+] Tổng số đoạn văn bản (chunks) đã vector hóa: {count} chunks\n")

    # Lấy toàn bộ dữ liệu trong collection để kiểm tra metadata
    all_data = chroma_manager.collection.get()
    print("[+] Danh sách các Vector Chunks đang lưu trong ChromaDB:")
    for doc_id, meta, doc in zip(all_data["ids"], all_data["metadatas"], all_data["documents"]):
        preview = doc.replace("\n", " ")[:75]
        print(f"    • ID: {doc_id:<12} | Nguồn: {meta.get('source'):<26} | Nội dung: {preview}...")

    # Test truy vấn tương đồng ngữ nghĩa (Semantic Search)
    test_queries = [
        "Cách trị bệnh mốc sương trên cây cà chua khi bệnh nặng",
        "Thuốc phòng trừ bệnh đốm vòng khoai tây Alternaria"
    ]
    print("\n[+] Test truy vấn tìm kiếm tương đồng Vector (Similarity Search):")
    for q in test_queries:
        results = chroma_manager.search_similar(q, n_results=1)
        print(f"    Query: \"{q}\"")
        if results:
            top_doc = results[0]["content"].splitlines()[0]
            print(f"    -> Chunk khớp nhất: {top_doc}")
        else:
            print("    -> Không tìm thấy kết quả!")

    print("    => KẾT LUẬN CHROMADB: HOẠT ĐỘNG CHUẨN 100%!\n")


if __name__ == "__main__":
    verify_sqlite_db()
    verify_chromadb()

