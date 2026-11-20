import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cloud,
  FlaskConical,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Sprout,
  Zap,
} from 'lucide-react';
import {
  NetworkMode,
  OfflineSQLiteTreatment,
  OnlineRAGTreatment,
} from '../types/diagnosis';

interface TreatmentPanelProps {
  activeSource: string;
  networkMode: NetworkMode;
  offlineTreatment?: OfflineSQLiteTreatment | null;
  onlineRagTreatment?: OnlineRAGTreatment | null;
  loading: boolean;
  onRefreshRAG: () => void;
}

export const TreatmentPanel: React.FC<TreatmentPanelProps> = ({
  networkMode,
  offlineTreatment,
  onlineRagTreatment,
  loading,
  onRefreshRAG,
}) => {
  const [activeTab, setActiveTab] = useState<'rag' | 'sqlite'>('rag');
  const [showSources, setShowSources] = useState(false);

  useEffect(() => {
    if (networkMode === 'offline' || !onlineRagTreatment) {
      setActiveTab('sqlite');
    } else {
      setActiveTab('rag');
    }
  }, [networkMode, onlineRagTreatment]);

  return (
    <section
      aria-label="Phác đồ xử lý và phòng ngừa"
      className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4"
    >
      {/* Header + Tabs chuyển nguồn gọn gàng */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">Phác đồ điều trị khuyến nghị</h3>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('rag')}
              disabled={!onlineRagTreatment}
              className={`cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors duration-200 disabled:opacity-40 ${
                activeTab === 'rag'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
              <span>RAG Online</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sqlite')}
              className={`cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors duration-200 ${
                activeTab === 'sqlite'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" aria-hidden="true" />
              <span>SQLite Offline</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onRefreshRAG}
            disabled={loading}
            title="Cập nhật lại phác đồ"
            aria-label="Cập nhật lại phác đồ"
            className="cursor-pointer p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {activeTab === 'rag' && onlineRagTreatment ? (
        <div className="space-y-3 text-sm text-slate-700">
          {/* 1. Việc cần làm ngay */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
            <h4 className="text-xs font-bold uppercase tracking-wide text-amber-900 flex items-center gap-1.5 mb-2">
              <Zap className="w-4 h-4 text-amber-700" aria-hidden="true" />
              <span>Xử lý ngay</span>
            </h4>
            <ul className="space-y-1 text-xs text-slate-800 leading-relaxed list-disc list-inside">
              {onlineRagTreatment.immediate_actions.slice(0, 3).map((act, idx) => (
                <li key={idx}>{act}</li>
              ))}
            </ul>
          </div>

          {/* 2. Thuốc đặc trị & PHI */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200">
            <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-900 flex items-center gap-1.5 mb-2">
              <FlaskConical className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>Thuốc bảo vệ thực vật</span>
            </h4>
            {onlineRagTreatment.chemical_treatments.length > 0 ? (
              <div className="space-y-2">
                {onlineRagTreatment.chemical_treatments.map((chem, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2.5 rounded-xl border border-emerald-100 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900">
                        {chem.product_name}{' '}
                        <span className="font-normal text-slate-600">
                          ({chem.active_ingredient})
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">{chem.dosage}</div>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 tabular-nums">
                      Cách ly {chem.pre_harvest_interval_days} ngày
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Cây khỏe mạnh — không cần sử dụng thuốc hóa học.
              </p>
            )}
          </div>

          {/* 3. Sinh học & Phòng ngừa 2 cột */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800 flex items-center gap-1.5 mb-1.5">
                <Sprout className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <span>Sinh học</span>
              </h4>
              <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
                {onlineRagTreatment.biological_treatments.map((bio, idx) => (
                  <p key={idx}>
                    <strong className="text-slate-900">{bio.method}:</strong> {bio.description}
                  </p>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800 flex items-center gap-1.5 mb-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <span>Phòng ngừa</span>
              </h4>
              <ul className="space-y-1 text-xs text-slate-700 leading-relaxed list-disc list-inside">
                {onlineRagTreatment.prevention_guidelines.slice(0, 3).map((prev, idx) => (
                  <li key={idx}>{prev}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Nguồn tài liệu RAG ẩn gọn (Progressive Disclosure) */}
          {onlineRagTreatment.source_documents?.length > 0 && (
            <div className="pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSources((p) => !p)}
                className="cursor-pointer w-full flex items-center justify-between text-xs font-medium text-slate-600 hover:text-emerald-800 py-1"
              >
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Nguồn trích dẫn Vector DB ({onlineRagTreatment.source_documents.length})</span>
                </span>
                {showSources ? (
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
              {showSources && (
                <ul className="mt-1.5 space-y-1 text-[11px] text-slate-600 bg-slate-50 px-3 py-2 rounded-xl list-disc list-inside">
                  {onlineRagTreatment.source_documents.map((src, idx) => (
                    <li key={idx}>{src}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : offlineTreatment && offlineTreatment.found ? (
        <div className="space-y-3 text-xs text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-900">
              {offlineTreatment.disease_vi || offlineTreatment.disease_name}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 font-semibold border border-rose-200 tabular-nums">
              Cách ly {offlineTreatment.pre_harvest_interval_days} ngày
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200">
            <h4 className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>Hóa học</span>
            </h4>
            <p className="leading-relaxed text-slate-800">{offlineTreatment.chemical_treatment}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <span>Sinh học</span>
              </h4>
              <p className="leading-relaxed">{offlineTreatment.biological_treatment}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <span>Phòng ngừa</span>
              </h4>
              <p className="leading-relaxed">{offlineTreatment.preventive_measures}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
          Chưa có bản ghi tương ứng trong CSDL Offline. Hãy chuyển sang chế độ{' '}
          <strong>Auto</strong> hoặc <strong>Cloud RAG</strong>.
        </div>
      )}
    </section>
  );
};
