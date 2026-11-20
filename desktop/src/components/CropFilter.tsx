import React from 'react';
import { Sprout } from 'lucide-react';

export interface CropOption {
  value: string;
  labelVi: string;
}

// 14 loại cây trồng hỗ trợ theo PlantVillage & User-Guided Filtering
export const ALL_CROPS: CropOption[] = [
  { value: 'Potato', labelVi: 'Khoai tây' },
  { value: 'Tomato', labelVi: 'Cà chua' },
  { value: 'Apple', labelVi: 'Táo' },
  { value: 'Corn', labelVi: 'Ngô / Bắp' },
  { value: 'Grape', labelVi: 'Nho' },
  { value: 'Pepper', labelVi: 'Ớt chuông' },
  { value: 'Blueberry', labelVi: 'Việt quất' },
  { value: 'Cherry', labelVi: 'Anh đào' },
  { value: 'Orange', labelVi: 'Cam' },
  { value: 'Peach', labelVi: 'Đào' },
  { value: 'Raspberry', labelVi: 'Mâm xôi' },
  { value: 'Soybean', labelVi: 'Đậu nành' },
  { value: 'Squash', labelVi: 'Bí' },
  { value: 'Strawberry', labelVi: 'Dâu tây' },
];

const FEATURED_CROPS = ALL_CROPS.slice(0, 5);
const EXTRA_CROPS = ALL_CROPS.slice(5);

interface CropFilterProps {
  selectedCrop: string;
  onSelectCrop: (crop: string) => void;
  compact?: boolean;
}

export const CropFilter: React.FC<CropFilterProps> = ({
  selectedCrop,
  onSelectCrop,
  compact = false,
}) => {
  const isExtraSelected = EXTRA_CROPS.some((c) => c.value === selectedCrop);

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor="crop-extra-select"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-900"
        >
          <Sprout className="w-4 h-4 text-emerald-700" aria-hidden="true" />
          <span>Loài cây trồng</span>
        </label>
        <span className="text-xs text-slate-600">
          {selectedCrop
            ? ALL_CROPS.find((c) => c.value === selectedCrop)?.labelVi || selectedCrop
            : 'Tự động nhận diện'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn loài cây trồng">
        <button
          type="button"
          aria-pressed={selectedCrop === ''}
          onClick={() => onSelectCrop('')}
          className={`cursor-pointer px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
            selectedCrop === ''
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60'
          }`}
        >
          Tự động
        </button>

        {FEATURED_CROPS.map((crop) => (
          <button
            key={crop.value}
            type="button"
            aria-pressed={selectedCrop === crop.value}
            onClick={() => onSelectCrop(crop.value)}
            className={`cursor-pointer px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              selectedCrop === crop.value
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60'
            }`}
          >
            {crop.labelVi}
          </button>
        ))}

        <select
          id="crop-extra-select"
          aria-label="Chọn thêm loài cây khác"
          value={isExtraSelected ? selectedCrop : ''}
          onChange={(e) => onSelectCrop(e.target.value)}
          className={`cursor-pointer px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
            isExtraSelected
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
          }`}
        >
          <option value="" className="text-slate-800 bg-white">
            Loài khác (9)...
          </option>
          {EXTRA_CROPS.map((crop) => (
            <option key={crop.value} value={crop.value} className="text-slate-900 bg-white">
              {crop.labelVi} ({crop.value})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
