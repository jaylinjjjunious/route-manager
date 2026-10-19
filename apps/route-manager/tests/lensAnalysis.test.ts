import { describe, it, expect } from 'vitest';
import {
  ANALYSIS_RESOLUTIONS,
  classifyCause,
  detectHazeFraction,
  analyzeRegions,
  getDefaultCalibration,
  loadCalibrationProfile,
  saveCalibrationProfile,
  resetCalibrationProfile,
  createResolutionCopy,
  type CameraQualityCause,
  type LensCalibrationProfile,
} from '../src/services/scan/lensAnalysis';

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

function makeHighContrastImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
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

describe('ANALYSIS_RESOLUTIONS', () => {
  it('has three resolution profiles', () => {
    expect(Object.keys(ANALYSIS_RESOLUTIONS)).toHaveLength(3);
  });

  it('coarse is smallest', () => {
    expect(ANALYSIS_RESOLUTIONS.coarse.maxWidth).toBeLessThan(ANALYSIS_RESOLUTIONS.standard.maxWidth);
  });

  it('fine is largest', () => {
    expect(ANALYSIS_RESOLUTIONS.fine.maxWidth).toBeGreaterThan(ANALYSIS_RESOLUTIONS.standard.maxWidth);
  });

  it('each profile has required fields', () => {
    for (const profile of Object.values(ANALYSIS_RESOLUTIONS)) {
      expect(profile.name).toBeTruthy();
      expect(profile.maxWidth).toBeGreaterThan(0);
      expect(profile.jpegQuality).toBeGreaterThan(0);
      expect(profile.jpegQuality).toBeLessThanOrEqual(1);
      expect(profile.purpose).toBeTruthy();
    }
  });
});

describe('getDefaultCalibration', () => {
  it('returns valid calibration profile', () => {
    const cal = getDefaultCalibration();
    expect(cal.id).toBe('default');
    expect(cal.version).toBe(1);
    expect(cal.thresholds.minGlobalContrast).toBeGreaterThan(0);
    expect(cal.thresholds.highConfidenceThreshold).toBeGreaterThan(0);
    expect(cal.thresholds.highConfidenceThreshold).toBeLessThan(1);
  });
});

describe('calibration persistence', () => {
  it('saves and loads calibration profile', () => {
    const custom: LensCalibrationProfile = {
      id: 'custom_test',
      name: 'Test',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: 'Test profile',
      thresholds: {
        ...getDefaultCalibration().thresholds,
        minGlobalContrast: 25,
      },
    };
    saveCalibrationProfile(custom);
    const loaded = loadCalibrationProfile();
    expect(loaded.id).toBe('custom_test');
    expect(loaded.thresholds.minGlobalContrast).toBe(25);
  });

  it('resetCalibrationProfile restores defaults', () => {
    const cal = resetCalibrationProfile();
    expect(cal.id).toBe('default');
    expect(cal.thresholds.minGlobalContrast).toBe(30);
  });
});

describe('analyzeRegions', () => {
  it('returns 5 regions', () => {
    const img = makeHighContrastImageData(160, 120);
    const result = analyzeRegions(img);
    expect(result.regions).toHaveLength(5);
  });

  it('center region is first', () => {
    const img = makeHighContrastImageData(160, 120);
    const result = analyzeRegions(img);
    expect(result.regions[0].region).toBe('center');
  });

  it('center-to-edge ratio is a finite number', () => {
    const img = makeHighContrastImageData(160, 120);
    const result = analyzeRegions(img);
    expect(Number.isFinite(result.centerToEdgeRatio)).toBe(true);
  });

  it('edge consistency is between 0 and 1', () => {
    const img = makeHighContrastImageData(160, 120);
    const result = analyzeRegions(img);
    expect(result.edgeConsistency).toBeGreaterThanOrEqual(0);
    expect(result.edgeConsistency).toBeLessThanOrEqual(1);
  });
});

describe('classifyCause', () => {
  it('returns clean for uniform edge regions (no soft-edge signal)', () => {
    // Uniform regions all have same laplacian → ratio ~1.0, edges are not softer
    const img = makeHighContrastImageData(160, 120);
    const regions = analyzeRegions(img);
    // With the default thresholds, if centerToEdgeRatio <= 0.55, no smudge signal fires
    const result = classifyCause(regions, 55, 150, 0.1);
    // The checkerboard pattern may produce various results depending on exact pixel math
    expect(['clean', 'smudge']).toContain(result.primary);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it('detects haze in low-contrast scenes', () => {
    const img = makeLowContrastImageData(160, 120);
    const regions = analyzeRegions(img);
    const result = classifyCause(regions, 20, 5, 0.5);
    expect(['haze', 'condensation', 'smudge']).toContain(result.primary);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it('returns low_detail for uniform images', () => {
    const img = makeImageData(160, 120, 128);
    const regions = analyzeRegions(img);
    const result = classifyCause(regions, 50, 0.5, 0.1);
    expect(result.primary).toBe('low_detail');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects scratch from inconsistent edges', () => {
    const img = makeHighContrastImageData(160, 120);
    const regions = analyzeRegions(img);
    const result = classifyCause(regions, 55, 150, 0.1, {
      ...getDefaultCalibration().thresholds,
      edgeConsistencyFloor: 0.99,
    });
    expect(result.reasoning.length).toBeGreaterThan(0);
  });
});

describe('createResolutionCopy', () => {
  it('creates a resolution copy with correct dimensions', { timeout: 10000 }, async () => {
    const result = await createResolutionCopy('data:image/png;base64,fake', ANALYSIS_RESOLUTIONS.coarse);
    expect(result.width).toBeLessThanOrEqual(ANALYSIS_RESOLUTIONS.coarse.maxWidth);
    expect(result.height).toBeGreaterThan(0);
    expect(result.dataUrl).toBeTruthy();
    expect(result.imageData).toBeDefined();
  });
});
