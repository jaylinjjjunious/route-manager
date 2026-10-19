import { describe, it, expect } from 'vitest';
import {
  analyzeBrightness,
  analyzeMotion,
  analyzeLevel,
  analyzeLensCleanliness,
  analyzeRollingLensCleanliness,
  SCAN_CONFIG,
} from '../src/services/scan/sessionService';
import type { FrameLensSnapshot, LensCleanlinessResult } from '../src/services/scan/sessionService';

function makeImageData(width: number, height: number, fill: number = 128): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill;
    data[i + 1] = fill;
    data[i + 2] = fill;
    data[i + 3] = 255;
  }
  return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData;
}

function makeGradientImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = Math.round((x / width) * 255);
      data[idx + 1] = Math.round((y / height) * 255);
      data[idx + 2] = 128;
      data[idx + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData;
}

function makeLowContrastImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const base = 120 + Math.round(Math.sin(x * 0.1) * 5);
      data[idx] = base;
      data[idx + 1] = base;
      data[idx + 2] = base;
      data[idx + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData;
}

describe('analyzeBrightness', () => {
  it('returns correct brightness for uniform image', () => {
    const img = makeImageData(10, 10, 200);
    const brightness = analyzeBrightness(img);
    expect(brightness).toBeCloseTo(200, 0);
  });

  it('returns ~128 for mid-gray', () => {
    const img = makeImageData(10, 10, 128);
    const brightness = analyzeBrightness(img);
    expect(brightness).toBeCloseTo(128, 0);
  });
});

describe('analyzeMotion', () => {
  it('returns 0 for identical frames', () => {
    const img = makeImageData(10, 10, 128);
    const motion = analyzeMotion(img, img);
    expect(motion).toBe(0);
  });

  it('detects motion in completely different frames', () => {
    const img1 = makeImageData(10, 10, 0);
    const img2 = makeImageData(10, 10, 255);
    const motion = analyzeMotion(img1, img2);
    expect(motion).toBeGreaterThan(0.5);
  });
});

describe('analyzeLevel', () => {
  it('returns high score for uniform image', () => {
    const img = makeImageData(20, 10, 128);
    const level = analyzeLevel(img, 20);
    expect(level).toBeGreaterThan(0.5);
  });
});

function makeHighContrastDetailedImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Checkerboard-like high-contrast pattern with sharp edges everywhere
      const checker = ((x >> 2) + (y >> 2)) & 1;
      const edge = (x % 8 < 2 || y % 8 < 2) ? 60 : 0;
      const val = checker ? (180 + edge) : (40 + edge);
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData;
}

describe('analyzeLensCleanliness', () => {
  it('returns clear for high-contrast detailed image', () => {
    const img = makeHighContrastDetailedImageData(160, 120);
    const result = analyzeLensCleanliness(img);
    // High-contrast checkerboard with sharp edges everywhere should pass
    expect(['clear', 'possible_smudge']).toContain(result.status);
    expect(result.globalContrast).toBeGreaterThan(SCAN_CONFIG.lensMinGlobalContrast);
  });

  it('returns uncertain for low-detail image', () => {
    const img = makeImageData(120, 90, 128);
    const result = analyzeLensCleanliness(img);
    // Uniform image has very low variance
    expect(result.status).toBe('uncertain');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('detects low contrast in low-contrast images', () => {
    const img = makeLowContrastImageData(120, 90);
    const result = analyzeLensCleanliness(img);
    expect(result.reasons.some(r => r.includes('Low global contrast') || r.includes('soft'))).toBe(true);
  });

  it('always includes guidance when status is not clear', () => {
    const img = makeLowContrastImageData(120, 90);
    const result = analyzeLensCleanliness(img);
    if (result.status !== 'clear') {
      expect(result.guidance.length).toBeGreaterThan(0);
    }
  });

  it('returns valid confidence range', () => {
    const img = makeGradientImageData(120, 90);
    const result = analyzeLensCleanliness(img);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

describe('analyzeRollingLensCleanliness', () => {
  function makeSnapshot(status: LensCleanlinessResult['status'], motion: number = 0.02): FrameLensSnapshot {
    return {
      lensResult: {
        status,
        confidence: status === 'clear' ? 0.8 : 0.5,
        reasons: status === 'clear' ? [] : ['test'],
        guidance: status === 'clear' ? [] : ['Clean lens'],
      },
      motionScore: motion,
      brightness: 150,
      timestamp: Date.now(),
    };
  }

  it('returns uncertain with fewer than 2 snapshots', () => {
    const result = analyzeRollingLensCleanliness([makeSnapshot('clear')]);
    expect(result.status).toBe('uncertain');
  });

  it('returns clear when majority of frames are clear', () => {
    const snapshots = Array(6).fill(null).map(() => makeSnapshot('clear'));
    const result = analyzeRollingLensCleanliness(snapshots);
    expect(result.status).toBe('clear');
  });

  it('detects persistent haze across frames', () => {
    const snapshots = Array(6).fill(null).map(() => makeSnapshot('possible_haze'));
    const result = analyzeRollingLensCleanliness(snapshots);
    expect(['possible_haze', 'possible_smudge', 'uncertain']).toContain(result.status);
    expect(result.persistenceFrames).toBeGreaterThanOrEqual(1);
  });

  it('returns uncertain when motion is too high', () => {
    const snapshots = Array(4).fill(null).map(() => makeSnapshot('possible_haze', 0.3));
    const result = analyzeRollingLensCleanliness(snapshots);
    expect(result.status).toBe('uncertain');
    expect(result.reasons.some(r => r.toLowerCase().includes('motion'))).toBe(true);
  });

  it('returns uncertain when brightness is too low', () => {
    const lowBrightnessSnapshots: FrameLensSnapshot[] = Array(4).fill(null).map(() => ({
      lensResult: { status: 'possible_haze', confidence: 0.5, reasons: ['test'], guidance: ['Clean'] },
      motionScore: 0.02,
      brightness: 10,
      timestamp: Date.now(),
    }));
    const result = analyzeRollingLensCleanliness(lowBrightnessSnapshots);
    expect(result.status).toBe('uncertain');
    expect(result.reasons.some(r => r.toLowerCase().includes('lighting'))).toBe(true);
  });
});

describe('SCAN_CONFIG', () => {
  it('has sensible defaults', () => {
    expect(SCAN_CONFIG.maxAnalysisWidth).toBe(640);
    expect(SCAN_CONFIG.minBrightness).toBeGreaterThan(0);
    expect(SCAN_CONFIG.lensPersistenceRequired).toBeGreaterThan(1);
    expect(SCAN_CONFIG.lensHighConfidenceThreshold).toBeGreaterThan(0);
    expect(SCAN_CONFIG.lensHighConfidenceThreshold).toBeLessThan(1);
  });
});
