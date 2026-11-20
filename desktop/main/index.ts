import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { checkImageBlur } from './filters/blur_detector';
import { runInferencePipeline } from './ai/onnx_inference';
import { getOfflineTreatment } from './database/sqlite_client';
import { resolveHybridTreatment, NetworkMode } from './services/hybrid_router';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // IPC 1: Kiểm tra độ mờ ảnh (Laplacian Variance)
  ipcMain.handle('ai:check-blur', async (_, imageBuffer: Buffer, threshold: number = 100.0) => {
    return checkImageBlur(Buffer.from(imageBuffer), threshold);
  });

  // IPC 2: Chạy suy luận ONNX (SwinV2 Classification + U-Net Severity)
  ipcMain.handle('ai:predict', async (_, { imageBuffer, cropFilter }) => {
    return await runInferencePipeline(Buffer.from(imageBuffer), cropFilter);
  });

  // IPC 3: Truy vấn CSDL SQLite cục bộ (Offline Mode)
  ipcMain.handle('db:get-treatment', async (_, { cropName, diseaseName, severity }) => {
    return getOfflineTreatment(cropName, diseaseName, severity);
  });

  // IPC 4: Luồng End-to-End 10 bước tích hợp Hybrid Network Router (Phase 6 - Tuần 7)
  ipcMain.handle(
    'ai:diagnose-e2e',
    async (
      _,
      payload: {
        imageBuffer: ArrayBuffer;
        cropFilter?: string;
        networkMode?: NetworkMode;
        blurThreshold?: number;
        userNotes?: string;
        forceAnalyze?: boolean;
      }
    ) => {
      const buf = Buffer.from(payload.imageBuffer);
      const threshold = payload.blurThreshold ?? 100.0;

      // Bước 1-2: Kiểm tra độ mờ bằng Laplacian Variance
      const blur = checkImageBlur(buf, threshold);
      if (blur.isBlurry && !payload.forceAnalyze) {
        return {
          status: 'rejected_blurry',
          workflow_steps_completed: 2,
          inference_time_ms: 5,
          network_mode_requested: payload.networkMode || 'hybrid',
          active_treatment_source: 'Rejected at Step 2 (Laplacian Blur Filter)',
          blur_check: {
            is_blurry: blur.isBlurry,
            laplacian_variance: blur.variance,
            threshold: blur.threshold,
            message: blur.message,
          },
        };
      }

      // Bước 3-5: Suy luận ONNX (SwinV2 + U-Net) kèm User-Guided Filtering
      const pred = await runInferencePipeline(buf, payload.cropFilter);

      // Bước 6-10: Định tuyến Hybrid Network (Online FastAPI RAG <-> Offline SQLite)
      const hybrid = await resolveHybridTreatment({
        cropName: pred.crop,
        diseaseName: pred.diseaseName,
        severityPercentage: pred.severityPercentage,
        networkMode: payload.networkMode || 'hybrid',
        userNotes: payload.userNotes,
      });

      const sqliteRecord: any = hybrid.offlineTreatment?.data || null;

      return {
        status: 'success',
        workflow_steps_completed: 10,
        inference_time_ms: pred.inferenceTimeMs,
        network_mode_requested: payload.networkMode || 'hybrid',
        active_treatment_source: hybrid.activeSource,
        blur_check: {
          is_blurry: blur.isBlurry,
          laplacian_variance: blur.variance,
          threshold: blur.threshold,
          message: blur.message,
        },
        classification: {
          raw_label: pred.rawLabel,
          crop_name: pred.crop,
          disease_name: pred.diseaseName,
          disease_vi: pred.diseaseVi,
          confidence: pred.confidence,
          tta_applied: true,
          user_crop_filter: payload.cropFilter || null,
          top_predictions: pred.topPredictions,
        },
        segmentation: {
          severity_percentage: pred.severityPercentage,
          severity_level:
            pred.severityPercentage === 0
              ? 'Khỏe mạnh (0%)'
              : pred.severityPercentage < 15
              ? 'Nhẹ (<15%)'
              : pred.severityPercentage <= 40
              ? 'Trung bình (15% - 40%)'
              : 'Nghiêm trọng (>40%)',
          lesion_pixels: Math.round((pred.severityPercentage / 100) * 65536),
          total_pixels: 65536,
          mask_overlay_base64: null,
        },
        offline_treatment: sqliteRecord
          ? {
              found: true,
              source: hybrid.offlineTreatment.source,
              crop_name: sqliteRecord.crop_name,
              disease_name: sqliteRecord.disease_name,
              disease_vi: sqliteRecord.disease_vi,
              severity_threshold: sqliteRecord.severity_threshold,
              chemical_treatment: sqliteRecord.chemical_treatment,
              biological_treatment: sqliteRecord.biological_treatment,
              preventive_measures: sqliteRecord.preventive_measures,
              pre_harvest_interval_days: sqliteRecord.pre_harvest_interval_days,
            }
          : { found: false, source: 'Offline SQLite Database' },
        online_rag_treatment: hybrid.onlineRagTreatment,
      };
    }
  );

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
