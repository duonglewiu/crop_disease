import React, { useRef, useState } from 'react';
import {
  Camera,
  EyeOff,
  Flame,
  Loader2,
  RotateCcw,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { SampleMode } from '../types/diagnosis';

interface CameraCaptureProps {
  onImageSelected: (file: File, previewUrl: string) => void;
  previewUrl: string | null;
  fileName: string;
  loading: boolean;
  compact?: boolean;
  onReset?: () => void;
}

/**
 * Tạo ảnh lá mẫu tổng hợp trên Canvas cho 1-Click Test End-to-End:
 * - diseased_sharp: Lá có gân sắc nét + đốm hoại tử (Pass Laplacian -> ONNX -> RAG)
 * - blurry_shake: Ảnh mờ tần số cao thấp (Bị chặn tại Bước 2 Laplacian)
 * - healthy_sharp: Lá xanh sạch bệnh (Severity = 0%)
 */
async function generateSyntheticLeafFile(
  mode: SampleMode
): Promise<{ file: File; previewUrl: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (mode === 'blurry_shake') {
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 140);
    grad.addColorStop(0, '#5a9e58');
    grad.addColorStop(0.6, '#4b8349');
    grad.addColorStop(1, '#3c683b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  } else {
    ctx.fillStyle = '#1e2923';
    ctx.fillRect(0, 0, 256, 256);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(128, 128, 96, 72, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = mode === 'healthy_sharp' ? '#2e9e44' : '#3a873e';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#8ce99a';
    ctx.stroke();

    ctx.strokeStyle = '#b2f2bb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(35, 142);
    ctx.lineTo(220, 114);
    ctx.stroke();

    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const startX = 128 + i * 22;
      const startY = 128 - i * 3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + 18, startY - 38);
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + 15, startY + 38);
      ctx.stroke();
    }

    for (let i = 0; i < 240; i++) {
      const px = 48 + ((i * 73) % 160);
      const py = 68 + ((i * 41) % 120);
      ctx.fillStyle = i % 2 === 0 ? '#1b4332' : '#d8f3dc';
      ctx.fillRect(px, py, 2, 2);
    }

    if (mode === 'diseased_sharp') {
      const lesions = [
        { x: 95, y: 108, r: 24 },
        { x: 152, y: 136, r: 28 },
        { x: 125, y: 96, r: 18 },
        { x: 168, y: 102, r: 15 },
        { x: 86, y: 146, r: 16 },
      ];
      for (const les of lesions) {
        ctx.beginPath();
        ctx.arc(les.x, les.y, les.r + 5, 0, Math.PI * 2);
        ctx.fillStyle = '#d9a426';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(les.x, les.y, les.r, 0, Math.PI * 2);
        ctx.fillStyle = '#6b2d14';
        ctx.fill();

        ctx.strokeStyle = '#2b1105';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(les.x, les.y, les.r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  const previewUrl = canvas.toDataURL('image/png');
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/png')
  );
  const file = new File([blob], `${mode}.png`, { type: 'image/png' });
  return { file, previewUrl };
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onImageSelected,
  previewUrl,
  fileName,
  loading,
  compact = false,
  onReset,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleSelectedFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setCameraError(null);
    onImageSelected(file, url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSelectedFile(file);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleSelectedFile(file);
    }
  };

  const handleSampleClick = async (mode: SampleMode) => {
    setCameraError(null);
    const { file, previewUrl: url } = await generateSyntheticLeafFile(mode);
    onImageSelected(file, url);
  };

  const startWebcam = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 80);
    } catch {
      setCameraError('Không tìm thấy camera. Vui lòng chọn ảnh từ thiết bị hoặc dùng mẫu thử.');
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const captureFromWebcam = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/png');
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png')
    );
    const file = new File([blob], 'webcam_leaf.png', { type: 'image/png' });
    stopWebcam();
    onImageSelected(file, url);
  };

  return (
    <div className="space-y-3">
      <input
        id="leaf-file-upload"
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Vùng hiển thị Camera / Preview / Dropzone */}
      {cameraActive ? (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-emerald-400 shadow-sm">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={captureFromWebcam}
              className="cursor-pointer inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Camera className="w-4 h-4" aria-hidden="true" />
              <span>Chụp &amp; Chẩn đoán</span>
            </button>
            <button
              type="button"
              onClick={stopWebcam}
              className="cursor-pointer inline-flex items-center gap-1 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-medium px-3 py-2 rounded-full transition-colors duration-200"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Đóng</span>
            </button>
          </div>
        </div>
      ) : previewUrl ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`relative w-full ${
            compact ? 'h-56' : 'aspect-video'
          } rounded-2xl overflow-hidden bg-slate-900 border transition-colors duration-200 flex items-center justify-center ${
            dragActive ? 'border-emerald-500 ring-2 ring-emerald-400' : 'border-slate-200'
          }`}
        >
          <img
            src={previewUrl}
            alt="Ảnh lá cây đã chọn"
            className="max-h-full max-w-full object-contain"
          />

          {loading && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-400" aria-hidden="true" />
              <span className="text-xs font-medium">Đang phân tích mẫu lá...</span>
            </div>
          )}

          <div className="absolute top-2.5 left-2.5 bg-slate-900/75 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg max-w-[65%] truncate">
            {fileName || 'leaf.png'}
          </div>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              aria-label="Quét mới"
              title="Quét mới"
              className="cursor-pointer absolute top-2.5 right-2.5 bg-slate-900/75 hover:bg-slate-900 text-white p-1.5 rounded-lg transition-colors duration-200"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}

          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow transition-colors duration-200 disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Đổi ảnh</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={startWebcam}
              className="cursor-pointer inline-flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow transition-colors duration-200 disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Camera</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !loading && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !loading) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          aria-label="Tải ảnh lá cây lên để chẩn đoán"
          className={`cursor-pointer w-full py-10 px-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
            dragActive
              ? 'border-emerald-600 bg-emerald-50/80'
              : 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/70'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="w-6 h-6" aria-hidden="true" />
            )}
          </div>
          <p className="text-sm font-semibold text-slate-900">
            {loading ? 'Đang chẩn đoán ảnh lá...' : 'Kéo thả hoặc nhấn chọn ảnh lá cây'}
          </p>
          <p className="text-xs text-slate-600 mt-1">Hỗ trợ JPG, PNG, WEBP • Tự động phân tích ngay</p>

          <div className="mt-4 flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm">
              <UploadCloud className="w-4 h-4" aria-hidden="true" />
              <span>Chọn ảnh</span>
            </span>
            <button
              type="button"
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                startWebcam();
              }}
              className="cursor-pointer inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <Camera className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>Mở Camera</span>
            </button>
          </div>
        </div>
      )}

      {cameraError && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
          {cameraError}
        </p>
      )}

      {/* Hàng nút Mẫu thử nhanh gọn 1-Click */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-xs font-medium text-slate-600">Dùng thử nhanh:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSampleClick('diseased_sharp')}
            className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors duration-200 disabled:opacity-50"
          >
            <Flame className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
            <span>Lá bệnh</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSampleClick('blurry_shake')}
            className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 transition-colors duration-200 disabled:opacity-50"
          >
            <EyeOff className="w-3.5 h-3.5 text-rose-700" aria-hidden="true" />
            <span>Ảnh mờ</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSampleClick('healthy_sharp')}
            className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition-colors duration-200 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>Lá khỏe</span>
          </button>
        </div>
      </div>
    </div>
  );
};
