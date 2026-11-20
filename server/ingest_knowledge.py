"""
Script nạp tài liệu nông học (Knowledge Base) vào ChromaDB Vector Database.
Phục vụ Checkpoint tuần 5 (Tuần 5.1 & 5.2 trong Kế hoạch đồ án).
Hỗ trợ chạy cả trên máy host lẫn tự động bên trong Docker container.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.rag.chroma_store import chroma_manager

def resolve_knowledge_file() -> str:
    # 1. Đường dẫn mount trong Docker container (/app/knowledge_base/...)
    docker_path = "/app/knowledge_base/agricultural_guidelines.md"
    if os.path.exists(docker_path):
        return docker_path
    # 2. Đường dẫn tương đối khi chạy trực tiếp trên máy Host
    host_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/knowledge_base/agricultural_guidelines.md"))
    return host_path

def chunk_markdown(content: str, max_chunk_size: int = 500):
    """Chia nhỏ tài liệu markdown theo từng mục tiêu đề hoặc đoạn văn bản"""
    sections = content.split("## ")
    chunks = []
    
    for section in sections:
        if not section.strip():
            continue
        text = "## " + section.strip()
        if len(text) > max_chunk_size:
            subparts = text.split("### ")
            for sub in subparts:
                if sub.strip():
                    chunks.append("### " + sub.strip())
        else:
            chunks.append(text)
    return chunks

def ingest_data():
    print("=" * 60)
    print(" BẮT ĐẦU NẠP TÀI LIỆU VÀO CHROMADB VECTOR DATABASE")
    print("=" * 60)
    
    knowledge_file = resolve_knowledge_file()
    if not os.path.exists(knowledge_file):
        print(f" Không tìm thấy file tài liệu: {knowledge_file}")
        return

    with open(knowledge_file, "r", encoding="utf-8") as f:
        content = f.read()

    chunks = chunk_markdown(content)
    print(f" Đã đọc và phân đoạn tài liệu thành {len(chunks)} đoạn văn bản (chunks).")

    documents = []
    metadatas = []
    ids = []

    for idx, chunk in enumerate(chunks):
        documents.append(chunk)
        metadatas.append({"source": "agricultural_guidelines.md", "chunk_id": idx})
        ids.append(f"doc_chunk_{idx}")

    chroma_manager.add_documents(documents=documents, metadatas=metadatas, ids=ids)
    print(f" Nạp thành công {len(documents)} chunks vào bộ sưu tập: {chroma_manager.collection_name}")
    print(f"📊 Tổng số tài liệu hiện có trong ChromaDB: {chroma_manager.get_count()}")

if __name__ == "__main__":
    ingest_data()
