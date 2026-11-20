import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Cloud,
  HardDrive,
  Leaf,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-react';
import { CropFilter } from './components/CropFilter';
import { CameraCapture } from './components/CameraCapture';
import { DiagnosisCard } from './components/DiagnosisCard';
import { TreatmentPanel } from './components/TreatmentPanel';
import { DiagnoseE2EResponse, NetworkMode } from './types/diagnosis';

declare global {
  interface Window {
    electronAPI?: {
      diagnoseE2E: (payload: any) => Promise<DiagnoseE2EResponse>;
    };
  }
}

const E2E_STEPS = [
  'Ảnh RGB',
  'Lọc mờ',
  'Lọc loài cây',
  'SwinV2 + TTA',
  'U-Net %',
  'Hybrid Router',
  'SQLite / Vector',
  'RAG Synthesis',
  'JSON Output',
  'UI Report',
];

const RAW_API_URL =
  ((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(
    /\/+$/,
    ''
  );
const API_BASE_URL = RAW_API_URL.endsWith('/api/v1')
  ? RAW_API_URL
  : `${RAW_API_URL}/api/v1`;

export const App: React.FC = () => {
  // Mặc định Tự động (không ép người dùng chọn loài cây trước)
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [networkMode, setNetworkMode] = useState<NetworkMode>('hybrid');
  const [blurThreshold, setBlurThreshold] = useState<number>(100);
  const [userNotes, setUserNotes] = useState<string>('');

  // Progressive disclosure panels (đóng mặc định để giảm nhiễu chữ)
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showPipeline, setShowPipeline] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [e2eResult, setE2eResult] = useState<DiagnoseE2EResponse | null>(null);

  const runFullDiagnosis = async (
    fileToUse: File | null = currentFile,
    modeOverride: NetworkMode = networkMode,
    forceAnalyze: boolean = false,
    cropOverride: string = selectedCrop
  ) => {
    if (!fileToUse) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', fileToUse);
      formData.append('crop_filter', cropOverride);
      formData.append('network_mode', modeOverride);
      formData.append('blur_threshold', String(blurThreshold));
      formData.append('user_notes', userNotes);
      formData.append('force_analyze', String(forceAnalyze));

      const response = await fetch(`${API_BASE_URL}/diagnose`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: DiagnoseE2EResponse = await response.json();
      setE2eResult(data);
    } catch (apiErr: any) {
      if (window.electronAPI?.diagnoseE2E) {
        try {
          const arrayBuffer = await fileToUse.arrayBuffer();
          const ipcData = await window.electronAPI.diagnoseE2E({
            imageBuffer: arrayBuffer,
            cropFilter: cropOverride,
            networkMode: modeOverride,
            blurThreshold,
            userNotes,
            forceAnalyze,
          });
          setE2eResult(ipcData);
          return;
        } catch (ipcErr: any) {
          setErrorMsg(`Lỗi Electron IPC: ${ipcErr?.message || ipcErr}`);
        }
      } else {
        setErrorMsg(
          `Không kết nối được Backend (${API_BASE_URL}/diagnose). Hãy kiểm tra container Docker hoặc Uvicorn.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelected = (file: File, url: string) => {
    setCurrentFile(file);
    setFileName(file.name);
    setPreviewUrl(url);
    runFullDiagnosis(file, networkMode, false, selectedCrop);
  };

  const handleCropChange = (crop: string) => {
    setSelectedCrop(crop);
    if (currentFile) {
      runFullDiagnosis(currentFile, networkMode, false, crop);
    }
  };

  const handleModeChange = (mode: NetworkMode) => {
    setNetworkMode(mode);
    if (currentFile) {
      runFullDiagnosis(currentFile, mode, false, selectedCrop);
    }
  };

  const handleReset = () => {
    setCurrentFile(null);
    setFileName('');
    setPreviewUrl(null);
    setE2eResult(null);
    setErrorMsg(null);
  };

  const completedSteps = e2eResult?.workflow_steps_completed ?? 0;
  const isRejectedBlurry = e2eResult?.status === 'rejected_blurry';

  return (
    <div className="min-h-screen bg-[#F6FAF7] text-slate-900">
      {/* Sticky Minimal Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <Leaf className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="font-bold text-sm md:text-base text-slate-900 truncate">
              AgroScan AI
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Bộ chuyển mạch Hybrid Network 1-Click */}
            <div
              role="group"
              aria-label="Chế độ định tuyến mạng"
              className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200"
            >
              <button
                type="button"
                aria-pressed={networkMode === 'hybrid'}
                onClick={() => handleModeChange('hybrid')}
                className={`cursor-pointer inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors duration-200 ${networkMode === 'hybrid'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
                  }`}
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Auto</span>
              </button>
              <button
                type="button"
                aria-pressed={networkMode === 'online'}
                onClick={() => handleModeChange('online')}
                className={`cursor-pointer inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors duration-200 ${networkMode === 'online'
                  ? 'bg-cyan-700 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
                  }`}
              >
                <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Cloud RAG</span>
              </button>
              <button
                type="button"
                aria-pressed={networkMode === 'offline'}
                onClick={() => handleModeChange('offline')}
                className={`cursor-pointer inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors duration-200 ${networkMode === 'offline'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
                  }`}
              >
                <HardDrive className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Offline</span>
              </button>
            </div>

            {/* Nút xem tiến trình E2E (Progressive Disclosure) */}
            {e2eResult && (
              <button
                type="button"
                onClick={() => setShowPipeline((p) => !p)}
                aria-expanded={showPipeline}
                aria-label="Xem tiến trình 10 bước E2E"
                className={`cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl border transition-colors duration-200 tabular-nums ${showPipeline
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>{completedSteps}/10</span>
              </button>
            )}

            {/* Nút Tùy chỉnh nâng cao */}
            <button
              type="button"
              onClick={() => setShowSettings((p) => !p)}
              aria-expanded={showSettings}
              aria-label="Mở tùy chỉnh nâng cao"
              className={`cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl border transition-colors duration-200 ${showSettings
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden md:inline">Tùy chỉnh</span>
            </button>
          </div>
        </div>

        {/* Ngăn kéo Tùy chỉnh nâng cao (ẩn mặc định) */}
        {showSettings && (
          <div className="border-t border-slate-200 bg-slate-50/90 px-4 md:px-6 py-3">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <label
                  htmlFor="blur-threshold-range"
                  className="text-xs font-medium text-slate-700 whitespace-nowrap"
                >
                  Ngưỡng lọc mờ (σ²): <strong className="tabular-nums">{blurThreshold}</strong>
                </label>
                <input
                  id="blur-threshold-range"
                  type="range"
                  min={10}
                  max={300}
                  step={10}
                  value={blurThreshold}
                  onChange={(e) => setBlurThreshold(Number(e.target.value))}
                  className="w-36 accent-emerald-700 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:flex-1 max-w-xl">
                <label
                  htmlFor="user-notes-input"
                  className="text-xs font-medium text-slate-700 whitespace-nowrap"
                >
                  Ghi chú thời tiết:
                </label>
                <input
                  id="user-notes-input"
                  type="text"
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="VD: Trồng nhà màng, mưa ẩm kéo dài..."
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {currentFile && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => runFullDiagnosis(currentFile, networkMode, false, selectedCrop)}
                    className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors duration-200 disabled:opacity-50"
                  >
                    Áp dụng
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Đóng tùy chỉnh"
                className="cursor-pointer text-slate-500 hover:text-slate-800 p-1 hidden md:block"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Ngăn kéo 10 bước End-to-End (ẩn mặc định, mở khi bấm nút 10/10) */}
        {showPipeline && e2eResult && (
          <div className="border-t border-slate-200 bg-white px-4 md:px-6 py-3">
            <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5">
              {E2E_STEPS.map((label, index) => {
                const stepNum = index + 1;
                const isDone =
                  stepNum <= completedSteps && !(isRejectedBlurry && stepNum === 2);
                const isStoppedHere = isRejectedBlurry && stepNum === 2;
                return (
                  <div
                    key={label}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-1 ${isStoppedHere
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold'
                      : isDone
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                  >
                    <span className="truncate">
                      {stepNum}. {label}
                    </span>
                    {isDone && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {errorMsg && (
          <div
            role="alert"
            className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs font-medium flex items-center justify-between gap-2"
          >
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              aria-label="Đóng cảnh báo"
              className="cursor-pointer p-1 hover:bg-rose-100 rounded-lg"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {!e2eResult ? (
          /* Trạng thái Khởi đầu: Minimal Single Column tập trung tuyệt đối vào 1 hành động quét ảnh */
          <div className="max-w-xl mx-auto mt-2 md:mt-6 space-y-5">
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                Kiểm tra sức khỏe lá cây trong vài giây
              </h1>
              <p className="text-sm text-slate-600">
                Tải ảnh hoặc chụp lá để nhận chẩn đoán bệnh và phác đồ xử lý tức thì.
              </p>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-5">
              <CropFilter
                selectedCrop={selectedCrop}
                onSelectCrop={handleCropChange}
              />

              <CameraCapture
                onImageSelected={handleImageSelected}
                previewUrl={previewUrl}
                fileName={fileName}
                loading={loading}
              />
            </div>
          </div>
        ) : (
          /* Trạng thái Kết quả: Grid 2 cột cân bằng Input/Preview <-> Diagnosis & Treatment */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
              <CameraCapture
                onImageSelected={handleImageSelected}
                previewUrl={previewUrl}
                fileName={fileName}
                loading={loading}
                compact
                onReset={handleReset}
              />

              <div className="pt-2 border-t border-slate-100">
                <CropFilter
                  selectedCrop={selectedCrop}
                  onSelectCrop={handleCropChange}
                  compact
                />
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <DiagnosisCard
                status={e2eResult.status}
                inferenceTimeMs={e2eResult.inference_time_ms}
                originalPreviewUrl={previewUrl}
                blurCheck={e2eResult.blur_check}
                classification={e2eResult.classification}
                segmentation={e2eResult.segmentation}
                onForceAnalyze={() =>
                  runFullDiagnosis(currentFile, networkMode, true, selectedCrop)
                }
              />

              {e2eResult.status === 'success' && (
                <TreatmentPanel
                  activeSource={e2eResult.active_treatment_source}
                  networkMode={networkMode}
                  offlineTreatment={e2eResult.offline_treatment}
                  onlineRagTreatment={e2eResult.online_rag_treatment}
                  loading={loading}
                  onRefreshRAG={() =>
                    runFullDiagnosis(currentFile, networkMode, false, selectedCrop)
                  }
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
