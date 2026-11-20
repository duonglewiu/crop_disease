import os
import hashlib
import numpy as np
from typing import List, Dict, Any
import chromadb
from chromadb.api.types import EmbeddingFunction
from app.core.config import settings

class ResilientEmbeddingFunction(EmbeddingFunction):
    """
    Embedding function thông minh:
    Tạo vector 384 chiều từ từ khóa tài liệu, chuẩn hóa L2.
    Đảm bảo Vector DB hoạt động mượt mà trong mọi môi trường.
    """
    def __init__(self, dim: int = 384):
        self.dim = dim

    def name(self) -> str:
        return "resilient_hashing_embedding"

    def __call__(self, input: List[str]) -> List[List[float]]:
        embeddings = []
        for text in input:
            vec = np.zeros(self.dim, dtype=np.float32)
            words = text.lower().replace("#", " ").replace("-", " ").replace("*", " ").split()
            for word in words:
                h = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16)
                idx = h % self.dim
                vec[idx] += 1.0
            
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            embeddings.append(vec.tolist())
        return embeddings

class ChromaStoreManager:
    """
    Quản lý Vector Database ChromaDB cho lưu trữ và truy xuất tài liệu nông học (RAG).
    Phục vụ Task 4.1 trong Kế hoạch đồ án tốt nghiệp.
    """
    def __init__(self):
        self.persist_directory = os.path.abspath(settings.CHROMA_PERSIST_DIR)
        self.collection_name = settings.CHROMA_COLLECTION_NAME
        os.makedirs(self.persist_directory, exist_ok=True)
        
        self.embedding_fn = ResilientEmbeddingFunction(dim=384)
        self.client = chromadb.PersistentClient(path=self.persist_directory)
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            embedding_function=self.embedding_fn,
            metadata={"description": "Kho tài liệu phác đồ điều trị bệnh cây trồng"}
        )

    def add_documents(self, documents: List[str], metadatas: List[Dict[str, Any]], ids: List[str]):
        """Thêm các đoạn văn bản (chunks) vào Vector Database"""
        self.collection.upsert(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

    def search_similar(self, query: str, n_results: int = 3) -> List[Dict[str, Any]]:
        """Truy xuất tài liệu gần nhất dựa trên độ tương đồng ngữ nghĩa"""
        count = self.collection.count()
        if count == 0:
            return []
            
        k = min(n_results, count)
        results = self.collection.query(
            query_texts=[query],
            n_results=k
        )
        
        retrieved = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)
            for doc, meta in zip(docs, metas):
                retrieved.append({"content": doc, "metadata": meta})
        return retrieved

    def get_count(self) -> int:
        return self.collection.count()

chroma_manager = ChromaStoreManager()
