import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-leaf-preview');
}

if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = vi.fn();
}

const noop = () => {};
const mockGradient = { addColorStop: noop };

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  createRadialGradient: () => mockGradient,
  fillRect: noop,
  save: noop,
  restore: noop,
  beginPath: noop,
  ellipse: noop,
  arc: noop,
  moveTo: noop,
  lineTo: noop,
  stroke: noop,
  fill: noop,
  drawImage: noop,
})) as any;

HTMLCanvasElement.prototype.toDataURL = vi.fn(
  () => 'data:image/png;base64,MOCK_SYNTHETIC_LEAF'
);

HTMLCanvasElement.prototype.toBlob = vi.fn((callback: BlobCallback) => {
  callback(new Blob(['mock-png-bytes'], { type: 'image/png' }));
});
