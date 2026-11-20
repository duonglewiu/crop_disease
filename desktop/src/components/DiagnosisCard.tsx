import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Eye,
} from 'lucide-react';
import {
  BlurAnalysisResult,
  ClassificationResult,
  SegmentationResult,
} from '../types/diagnosis';

interface DiagnosisCardProps {
  status: string;
  inferenceTimeMs: number;
  originalPreviewUrl: string | null;
  blurCheck: BlurAnalysisResult;
  classification?: ClassificationResult | null;
  segmentation?: SegmentationResult | null;
  onForceAnalyze?: () => void;
}

function getSeverityMeta(sev: number) {
  if (sev === 0) {
    return {
      label: 'Khỏe mạnh',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      bar: 'bg-emerald-600',
    };
  }
  if (sev < 15) {
    return {
      label: 'Nhẹ',
      badge: 'bg-teal-100 text-teal-900 border-teal-200',
      bar: 'bg-teal-600',
    };
  }
  if (sev <= 40) {
    return {
      label: 'Trung bình',
      badge: 'bg-amber-100 text-amber-900 border-amber-200',
      bar: 'bg-amber-500',
    };
  }
  return {
    label: 'Nghiêm trọng',
    badge: 'bg-rose-100 text-rose-900 border-rose-200',
    bar: 'bg-rose-600',
  };
}

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({
  status,
  inferenceTimeMs,
  originalPreviewUrl,
  blurCheck,
  classification,
  segmentation,
  onForceAnalyze,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (status === 'rejected_blurry' || !classification || !segmentation) {
    return (
      <section
        aria-label="Cảnh báo chất lượng ảnh"
        className="bg-white p-6 rounded-2xl border border-rose-200 shadow-sm space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900">
              Ảnh chưa đủ độ nét để chẩn đoán
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Độ nét đo được{' '}
              <span className="font-semibold text-rose-700 tabular-nums">
                σ² = {blurCheck.laplacian_variance}
              </span>{' '}
              (ngưỡng yêu cầu{' '}
              <span className="font-semibold tabular-nums">≥ {blurCheck.threshold}</span>). Vui
              lòng giữ chắc tay và chụp lại gần tán lá hơn.
            </p>
          </div>
        </div>

        {onForceAnalyze && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onForceAnalyze}
              className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
            >
              <span>Vẫn tiếp tục phân tích</span>
            </button>
          </div>
        )}
      </section>
    );
  }

  const sevPct = segmentation.severity_percentage;
  const sevMeta = getSeverityMeta(sevPct);

  return (
    <section
      aria-label="Kết quả chẩn đoán AI"
      className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4"
    >
      {/* Tiêu đề bệnh chính + Badge mức độ */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {classification.crop_name}
            </span>
            {classification.user_crop_filter && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Đã lọc loài cây
              </span>
            )}
          </div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
            {classification.disease_vi}
          </h2>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border tabular-nums ${sevMeta.badge}`}
        >
          <span>{sevMeta.label}</span>
          <span>•</span>
          <span>{sevPct.toFixed(1)}%</span>
        </span>
      </div>

      {/* 3 chỉ số cốt lõi gọn gàng */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="text-[11px] font-medium text-slate-600 block">Độ tin cậy</span>
          <span className="text-lg font-bold text-slate-900 tabular-nums">
            {(classification.confidence * 100).toFixed(1)}%
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="text-[11px] font-medium text-slate-600 block">Vùng tổn thương</span>
          <span className="text-lg font-bold text-slate-900 tabular-nums">
            {sevPct.toFixed(1)}%
          </span>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${sevMeta.bar}`}
              style={{ width: `${Math.max(Math.min(sevPct, 100), sevPct > 0 ? 4 : 0)}%` }}
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <span className="text-[11px] font-medium text-slate-600 block">Độ nét &amp; Tốc độ</span>
          <div className="flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              {inferenceTimeMs.toFixed(0)} ms
            </span>
          </div>
          <span className="text-[11px] text-slate-600 tabular-nums">
            σ² = {blurCheck.laplacian_variance}
          </span>
        </div>
      </div>

      {/* So sánh trực quan Ảnh gốc & Bản đồ U-Net */}
      {(originalPreviewUrl || segmentation.mask_overlay_base64) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
            <div className="px-2.5 py-1.5 bg-slate-800 text-[11px] font-medium text-slate-200 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Ảnh gốc</span>
            </div>
            {originalPreviewUrl ? (
              <img
                src={originalPreviewUrl}
                alt="Ảnh lá cây đầu vào"
                className="w-full h-36 object-contain"
              />
            ) : (
              <div className="h-36 flex items-center justify-center text-xs text-slate-400">
                Chưa có ảnh
              </div>
            )}
          </div>

          <div className="rounded-xl overflow-hidden border border-emerald-200 bg-slate-900">
            <div className="px-2.5 py-1.5 bg-emerald-950 text-[11px] font-medium text-emerald-100 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>Khoanh vùng U-Net</span>
              </span>
              <span className="font-semibold tabular-nums">{sevPct.toFixed(1)}%</span>
            </div>
            {segmentation.mask_overlay_base64 ? (
              <img
                src={segmentation.mask_overlay_base64}
                alt="Bản đồ phân đoạn vùng bệnh U-Net"
                className="w-full h-36 object-contain"
              />
            ) : (
              <div className="h-36 flex items-center justify-center text-xs text-slate-300 px-3 text-center">
                {segmentation.lesion_pixels.toLocaleString()} px vùng bệnh
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nút mở rộng thông số AI (Progressive Disclosure) */}
      <div className="border-t border-slate-100 pt-2.5">
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          aria-expanded={showDetails}
          className="cursor-pointer w-full flex items-center justify-between text-xs font-medium text-slate-600 hover:text-emerald-800 py-1 transition-colors duration-200"
        >
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Chi tiết mô hình AI &amp; Top-3 xác suất</span>
          </span>
          {showDetails ? (
            <ChevronUp className="w-4 h-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        {showDetails && (
          <div className="mt-2.5 space-y-2 text-xs">
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 bg-slate-50 px-3 py-2 rounded-xl">
              <span>
                Nhãn chuẩn: <code className="text-slate-800">{classification.raw_label}</code>
              </span>
              <span className="tabular-nums">
                Pixel bệnh: <strong>{segmentation.lesion_pixels.toLocaleString()}</strong> /{' '}
                {segmentation.total_pixels.toLocaleString()}
              </span>
              <span>TTA: {classification.tta_applied ? 'Bật' : 'Tắt'}</span>
            </div>

            {classification.top_predictions.map((pred, idx) => (
              <div
                key={pred.label}
                className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl"
              >
                <span className="truncate font-medium text-slate-800 pr-2">
                  #{idx + 1}. {pred.disease_vi}
                </span>
                <span className="font-semibold text-emerald-800 tabular-nums shrink-0">
                  {(pred.confidence * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
