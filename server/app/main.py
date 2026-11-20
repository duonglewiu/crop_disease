from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.rag.chroma_store import chroma_manager
from ingest_knowledge import ingest_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tự động nạp tài liệu nông học vào ChromaDB nếu kho dữ liệu đang trống
    try:
        if chroma_manager.get_count() == 0:
            print("[Startup] Kho dữ liệu ChromaDB đang trống. Đang tự động nạp Knowledge Base...")
            ingest_data()
        else:
            print(f"[Startup] ChromaDB đã sẵn sàng với {chroma_manager.get_count()} tài liệu.")
    except Exception as e:
        print(f"[Startup Warning] Không thể nạp tự động Knowledge Base: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="Backend RAG phục vụ tra cứu phác đồ điều trị bệnh cây trồng nâng cao kết hợp LLM và ChromaDB.",
    lifespan=lifespan
)

# CORS Middleware cho phép Electron desktop app gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to Crop Disease Edge AI RAG Service",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "knowledge_chunks": chroma_manager.get_count()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.SERVER_HOST, port=settings.SERVER_PORT, reload=settings.DEBUG)
