import { vi } from 'vitest';

// jsdom does not implement canvas or Image properly; provide minimal stubs
// so analysis functions that create canvases don't crash in unit tests.
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(80 * 60 * 4).fill(128),
    width: 80,
    height: 60,
  })),
  putImageData: vi.fn(),
  createImageData: vi.fn((_w: number, _h: number) => ({
    data: new Uint8ClampedArray(_w * _h * 4).fill(128),
    width: _w,
    height: _h,
  })),
  canvas: document.createElement('canvas'),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createPattern: vi.fn(),
  toDataURL: vi.fn(() => 'data:image/png;base64,fake'),
  toBlob: vi.fn(),
  font: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  textAlign: '',
  textBaseline: '',
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  globalCompositeOperation: 'source-over',
  imageSmoothingEnabled: true,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  setLineDash: vi.fn(),
  lineDashOffset: 0,
})) as any;

Object.defineProperty(HTMLCanvasElement.prototype, 'width', { writable: true, value: 80 });
Object.defineProperty(HTMLCanvasElement.prototype, 'height', { writable: true, value: 60 });
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,fake');

// Mock Image to resolve onload synchronously with a 1x1 pixel
const OriginalImage = globalThis.Image;
globalThis.Image = class MockImage extends OriginalImage {
  constructor() {
    super();
    queueMicrotask(() => {
      if (typeof this.onload === 'function') {
        (this as any).width = 80;
        (this as any).height = 60;
        (this as any).readyState = 4;
        this.onload(new Event('load'));
      }
    });
  }
} as any;

// Stub navigator.mediaDevices if not present
if (!navigator.mediaDevices) {
  (navigator as any).mediaDevices = {
    getUserMedia: vi.fn(() => Promise.resolve({
      getTracks: () => [{ stop: vi.fn(), getSettings: () => ({}) }],
    })),
  };
}
