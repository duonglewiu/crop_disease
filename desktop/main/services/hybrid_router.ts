import { getOfflineTreatment } from '../database/sqlite_client';

export type NetworkMode = 'hybrid' | 'online' | 'offline';

export interface HybridTreatmentRequest {
  cropName: string;
  diseaseName: string;
  severityPercentage: number;
  networkMode?: NetworkMode;
  userNotes?: string;
  apiBaseUrl?: string;
}

/**
 * Bộ định tuyến Hybrid Network (Task 6.2 - Tuần 7):
 * - Nếu Online / Hybrid và kết nối được FastAPI RAG -> Trả về phác đồ động từ ChromaDB + LLM kèm đối chiếu SQLite.
 * - Nếu Offline hoặc mất mạng -> Tự động chuyển sang CSDL SQLite cục bộ (better-sqlite3) không gián đoạn.
 */
export async function resolveHybridTreatment(req: HybridTreatmentRequest) {
  const mode: NetworkMode = req.networkMode || 'hybrid';
  const baseUrl = req.apiBaseUrl || process.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

  // Luôn truy vấn sẵn bản ghi SQLite cục bộ để đối chiếu hoặc fallback tức thì (< 5ms)
  const offlineResult = getOfflineTreatment(req.cropName, req.diseaseName, req.severityPercentage);

  if (mode === 'offline') {
    return {
      activeSource: 'Offline SQLite Database (better-sqlite3)',
      networkModeRequested: mode,
      offlineTreatment: offlineResult,
      onlineRagTreatment: null,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseUrl}/rag/treatment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crop_name: req.cropName,
        disease_name: req.diseaseName,
        severity_percentage: req.severityPercentage,
        user_notes: req.userNotes || 'Truy vấn từ Electron Hybrid Router',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const onlineData = await response.json();
    return {
      activeSource: 'Online FastAPI RAG + ChromaDB Vectorstore',
      networkModeRequested: mode,
      offlineTreatment: offlineResult,
      onlineRagTreatment: onlineData,
    };
  } catch (err: any) {
    console.warn(`[Hybrid Router] Không thể kết nối RAG Server (${err?.message}). Chuyển sang Offline SQLite.`);
    return {
      activeSource: 'Fallback Offline SQLite Database (Mất kết nối RAG Server)',
      networkModeRequested: mode,
      offlineTreatment: offlineResult,
      onlineRagTreatment: null,
    };
  }
}

