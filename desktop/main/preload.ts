import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  checkBlur: (imageBuffer: ArrayBuffer, threshold?: number) => Promise<{ isBlurry: boolean; variance: number; threshold: number; message: string }>;
  predictDisease: (payload: { imageBuffer: ArrayBuffer; cropFilter?: string }) => Promise<any>;
  getOfflineTreatment: (payload: { cropName: string; diseaseName: string; severity: number }) => Promise<any>;
  diagnoseE2E: (payload: {
    imageBuffer: ArrayBuffer;
    cropFilter?: string;
    networkMode?: 'hybrid' | 'online' | 'offline';
    blurThreshold?: number;
    userNotes?: string;
    forceAnalyze?: boolean;
  }) => Promise<any>;
}

contextBridge.exposeInMainWorld('electronAPI', {
  checkBlur: (imageBuffer: ArrayBuffer, threshold?: number) => ipcRenderer.invoke('ai:check-blur', imageBuffer, threshold),
  predictDisease: (payload: any) => ipcRenderer.invoke('ai:predict', payload),
  getOfflineTreatment: (payload: any) => ipcRenderer.invoke('db:get-treatment', payload),
  diagnoseE2E: (payload: any) => ipcRenderer.invoke('ai:diagnose-e2e', payload),
});
