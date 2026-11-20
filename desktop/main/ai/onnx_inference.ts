import * as path from 'path';
import * as ort from 'onnxruntime-node';
import { nativeImage } from 'electron';

let swinSession: ort.InferenceSession | null = null;
let unetSession: ort.InferenceSession | null = null;

const MODEL_DIR = path.resolve(__dirname, '../../../test');

export const CROP_DISEASE_CLASSES = [
  { label: 'Apple___Apple_scab', crop: 'Apple', disease: 'Apple scab', vi: 'Bệnh ghẻ táo (Apple Scab)' },
  { label: 'Apple___Black_rot', crop: 'Apple', disease: 'Black rot', vi: 'Bệnh thối đen táo (Black Rot)' },
  { label: 'Apple___Cedar_apple_rust', crop: 'Apple', disease: 'Cedar apple rust', vi: 'Bệnh gỉ sắt táo (Cedar Apple Rust)' },
  { label: 'Apple___healthy', crop: 'Apple', disease: 'Healthy', vi: 'Lá táo khỏe mạnh (Healthy)' },
  { label: 'Corn___Cercospora_leaf_spot', crop: 'Corn', disease: 'Cercospora leaf spot', vi: 'Bệnh đốm lá xám ngô (Gray Leaf Spot)' },
  { label: 'Corn___Common_rust', crop: 'Corn', disease: 'Common rust', vi: 'Bệnh gỉ sắt thông thường trên ngô' },
  { label: 'Corn___Northern_Leaf_Blight', crop: 'Corn', disease: 'Northern Leaf Blight', vi: 'Bệnh cháy lá lớn miền Bắc trên ngô' },
  { label: 'Corn___healthy', crop: 'Corn', disease: 'Healthy', vi: 'Lá ngô khỏe mạnh (Healthy)' },
  { label: 'Grape___Black_rot', crop: 'Grape', disease: 'Black rot', vi: 'Bệnh thối đen nho (Grape Black Rot)' },
  { label: 'Grape___Esca', crop: 'Grape', disease: 'Esca', vi: 'Bệnh sởi đen / khô vằn nho (Esca)' },
  { label: 'Grape___Leaf_blight', crop: 'Grape', disease: 'Leaf blight', vi: 'Bệnh cháy lá nho (Isariopsis Leaf Spot)' },
  { label: 'Grape___healthy', crop: 'Grape', disease: 'Healthy', vi: 'Lá nho khỏe mạnh (Healthy)' },
  { label: 'Potato___Early_blight', crop: 'Potato', disease: 'Early blight', vi: 'Bệnh đốm vòng khoai tây (Early Blight)' },
  { label: 'Potato___Late_blight', crop: 'Potato', disease: 'Late blight', vi: 'Bệnh mốc sương khoai tây (Late Blight)' },
  { label: 'Potato___healthy', crop: 'Potato', disease: 'Healthy', vi: 'Lá khoai tây khỏe mạnh (Healthy)' },
];

export async function initModels() {
  if (!swinSession) {
    const swinPath = path.join(MODEL_DIR, 'swinv2_plantdisease.onnx');
    swinSession = await ort.InferenceSession.create(swinPath);
    console.log('[ONNX Runtime] Đã nạp thành công Swin Transformer V2 Classifier.');
  }
  if (!unetSession) {
    const unetPath = path.join(MODEL_DIR, 'unet_plantdisease.onnx');
    unetSession = await ort.InferenceSession.create(unetPath);
    console.log('[ONNX Runtime] Đã nạp thành công U-Net Severity Segmentor.');
  }
}

/**
 * Chuyển đổi Buffer ảnh sang Float32Array [1, 3, 256, 256] chuẩn hóa ImageNet
 */
function imageBufferToTensor(imageBuffer: Buffer): Float32Array {
  const float32Data = new Float32Array(1 * 3 * 256 * 256);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  try {
    const img = nativeImage.createFromBuffer(imageBuffer);
    if (!img.isEmpty()) {
      const resized = img.resize({ width: 256, height: 256 });
      const bgra = resized.toBitmap();
      const area = 256 * 256;
      for (let i = 0; i < area; i++) {
        const b = bgra[i * 4] / 255.0;
        const g = bgra[i * 4 + 1] / 255.0;
        const r = bgra[i * 4 + 2] / 255.0;
        float32Data[i] = (r - mean[0]) / std[0];
        float32Data[area + i] = (g - mean[1]) / std[1];
        float32Data[2 * area + i] = (b - mean[2]) / std[2];
      }
      return float32Data;
    }
  } catch (_) {
    // Fallback
  }

  for (let i = 0; i < float32Data.length; i++) {
    float32Data[i] = 0.5;
  }
  return float32Data;
}

/**
 * Pipeline suy luận toàn diện trên Node.js qua ONNX Runtime (Task 3.3 & Task 5.2 User-Guided Filtering).
 */
export async function runInferencePipeline(imageBuffer: Buffer, cropFilter?: string) {
  const t0 = Date.now();
  await initModels();

  const float32Data = imageBufferToTensor(imageBuffer);
  const tensorInput = new ort.Tensor('float32', float32Data, [1, 3, 256, 256]);

  // 1. Chạy mô hình Phân loại (Swin Transformer V2)
  const swinResults = await swinSession!.run({ input: tensorInput });
  const rawLogits = Array.from(swinResults.output.data as Float32Array);

  // Áp dụng User-Guided Crop Filtering nếu người dùng chọn loài cây
  const normalizedFilter = (cropFilter || '').trim().toLowerCase();
  const filteredLogits = rawLogits.map((val, idx) => {
    if (!normalizedFilter) return val;
    const clsCrop = CROP_DISEASE_CLASSES[idx]?.crop.toLowerCase();
    return clsCrop === normalizedFilter ? val : -1e9;
  });

  const hasValidFilterMatch = filteredLogits.some((v) => v > -1e8);
  const activeLogits = hasValidFilterMatch ? filteredLogits : rawLogits;

  // Tính Softmax
  const maxLogit = Math.max(...activeLogits);
  const expVals = activeLogits.map((v) => Math.exp(v - maxLogit));
  const sumExp = expVals.reduce((a, b) => a + b, 0);
  const probs = expVals.map((v) => v / sumExp);

  const rankedIndices = probs
    .map((p, idx) => ({ p, idx }))
    .sort((a, b) => b.p - a.p);

  const best = rankedIndices[0];
  const bestMeta = CROP_DISEASE_CLASSES[best.idx] || CROP_DISEASE_CLASSES[0];

  // 2. Chạy mô hình Phân đoạn (U-Net Severity)
  const unetResults = await unetSession!.run({ input: tensorInput });
  const maskData = unetResults.output.data as Float32Array;

  let lesionCount = 0;
  for (let i = 0; i < maskData.length; i++) {
    const prob = 1.0 / (1.0 + Math.exp(-maskData[i]));
    if (prob > 0.52) lesionCount++;
  }
  const severityPercentage =
    bestMeta.disease === 'Healthy'
      ? 0
      : Math.round((lesionCount / maskData.length) * 10000) / 100;

  return {
    crop: bestMeta.crop,
    diseaseName: bestMeta.disease,
    diseaseVi: bestMeta.vi,
    rawLabel: bestMeta.label,
    confidence: Math.round(best.p * 10000) / 10000,
    severityPercentage,
    topPredictions: rankedIndices.slice(0, 3).map((item) => ({
      label: CROP_DISEASE_CLASSES[item.idx].label,
      crop_name: CROP_DISEASE_CLASSES[item.idx].crop,
      disease_name: CROP_DISEASE_CLASSES[item.idx].disease,
      disease_vi: CROP_DISEASE_CLASSES[item.idx].vi,
      confidence: Math.round(item.p * 10000) / 10000,
    })),
    inferenceTimeMs: Date.now() - t0,
  };
}
