export type NetworkMode = 'hybrid' | 'online' | 'offline';

export type SampleMode = 'diseased_sharp' | 'blurry_shake' | 'healthy_sharp';

export interface BlurAnalysisResult {
  is_blurry: boolean;
  laplacian_variance: number;
  threshold: number;
  message: string;
}

export interface TopPrediction {
  label: string;
  crop_name: string;
  disease_name: string;
  disease_vi: string;
  confidence: number;
}

export interface ClassificationResult {
  raw_label: string;
  crop_name: string;
  disease_name: string;
  disease_vi: string;
  confidence: number;
  tta_applied: boolean;
  user_crop_filter?: string | null;
  top_predictions: TopPrediction[];
}

export interface SegmentationResult {
  severity_percentage: number;
  severity_level: string;
  lesion_pixels: number;
  total_pixels: number;
  mask_overlay_base64?: string | null;
}

export interface OfflineSQLiteTreatment {
  found: boolean;
  source: string;
  crop_name?: string;
  disease_name?: string;
  disease_vi?: string;
  severity_threshold?: number;
  chemical_treatment?: string;
  biological_treatment?: string;
  preventive_measures?: string;
  pre_harvest_interval_days?: number;
}

export interface ChemicalTreatmentItem {
  active_ingredient: string;
  product_name: string;
  dosage: string;
  pre_harvest_interval_days: number;
}

export interface BiologicalTreatmentItem {
  method: string;
  description: string;
}

export interface OnlineRAGTreatment {
  crop_name: string;
  disease_name: string;
  severity_level: string;
  immediate_actions: string[];
  chemical_treatments: ChemicalTreatmentItem[];
  biological_treatments: BiologicalTreatmentItem[];
  prevention_guidelines: string[];
  source_documents: string[];
}

export interface DiagnoseE2EResponse {
  status: 'success' | 'rejected_blurry' | string;
  workflow_steps_completed: number;
  inference_time_ms: number;
  network_mode_requested: string;
  active_treatment_source: string;
  blur_check: BlurAnalysisResult;
  classification?: ClassificationResult | null;
  segmentation?: SegmentationResult | null;
  offline_treatment?: OfflineSQLiteTreatment | null;
  online_rag_treatment?: OnlineRAGTreatment | null;
}
