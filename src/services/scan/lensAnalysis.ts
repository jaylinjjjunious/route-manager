/**
 * Multi-resolution analysis pipeline for Smart Aisle Scan lens cleanliness.
 *
 * Produces analysis copies at multiple resolutions for different purposes:
 * - Coarse (320px): fast rolling lens check during live preview
 * - Standard (640px): photo validation quality gate
 * - Fine (960px): detailed region analysis and cause classification
 *
 * Each resolution feeds into region-based analysis (center, edges, quadrants)
 * and produces a cause classification (smudge, haze, fingerprint, condensation,
 * scratch, low-light, low-detail).
 *
 * Calibration profiles override the default thresholds for different devices
 * or environmental conditions.
 */

import type { LensCleanlinessResult, LensCleanlinessStatus } from '../../types';

// ─── Resolution Profiles ──────────────────────────────────────────

export interface AnalysisResolutionProfile {
  name: string;
  maxWidth: number;
  jpegQuality: number;
  purpose: string;
}

export const ANALYSIS_RESOLUTIONS: Record<string, AnalysisResolutionProfile> = {
  coarse: { name: 'coarse', maxWidth: 320, jpegQuality: 0.5, purpose: 'Rolling lens check during live preview' },
  standard: { name: 'standard', maxWidth: 640, jpegQuality: 0.6, purpose: 'Photo validation quality gate' },
  fine: { name: 'fine', maxWidth: 960, jpegQuality: 0.7, purpose: 'Detailed region analysis and cause classification' },
} as const;

// ─── Region Analysis ──────────────────────────────────────────────

export interface RegionAnalysis {
  region: 'center' | 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'top_edge' | 'bottom_edge' | 'left_edge' | 'right_edge';
  laplacianMean: number;
  laplacianVariance: number;
  localContrast: number;
  edgeDensity: number;
}

export interface MultiRegionResult {
  regions: RegionAnalysis[];
  centerToEdgeRatio: number;
  edgeConsistency: number;
  quadrantVariance: number;
}

// ─── Cause Classification ─────────────────────────────────────────

export type CameraQualityCause =
  | 'smudge'
  | 'haze'
  | 'fingerprint'
  | 'condensation'
  | 'scratch'
  | 'low_light'
  | 'low_detail'
  | 'motion_blur'
  | 'clean'
  | 'unknown';

export interface CauseClassification {
  primary: CameraQualityCause;
  secondary: CameraQualityCause | null;
  confidence: number;
  reasoning: string[];
}

// ─── Calibration Profile ──────────────────────────────────────────

export interface LensCalibrationProfile {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  description: string;
  deviceHint?: string;
  thresholds: {
    minGlobalContrast: number;
    maxGlobalContrast: number;
    centerEdgeRatioThreshold: number;
    lowDetailMinVariance: number;
    persistenceRequired: number;
    highConfidenceThreshold: number;
    regionLaplacianFloor: number;
    edgeConsistencyFloor: number;
    hazeBlockFraction: number;
  };
}

const CALIBRATION_STORAGE_KEY = 'smart_aisle_lens_calibration';

const DEFAULT_THRESHOLDS: LensCalibrationProfile['thresholds'] = {
  minGlobalContrast: 30,
  maxGlobalContrast: 70,
  centerEdgeRatioThreshold: 0.55,
  lowDetailMinVariance: 2,
  persistenceRequired: 3,
  highConfidenceThreshold: 0.7,
  regionLaplacianFloor: 5,
  edgeConsistencyFloor: 0.3,
  hazeBlockFraction: 0.35,
};

export function getDefaultCalibration(): LensCalibrationProfile {
  return {
    id: 'default',
    name: 'Default',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Default lens cleanliness thresholds',
    thresholds: { ...DEFAULT_THRESHOLDS },
  };
}

export function loadCalibrationProfile(): LensCalibrationProfile {
  try {
    const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (raw) {
      const profile = JSON.parse(raw) as LensCalibrationProfile;
      if (profile?.thresholds && typeof profile.version === 'number') {
        return profile;
      }
    }
  } catch {
    // Ignore
  }
  return getDefaultCalibration();
}

export function saveCalibrationProfile(profile: LensCalibrationProfile): void {
  try {
    localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore
  }
}

export function resetCalibrationProfile(): LensCalibrationProfile {
  const profile = getDefaultCalibration();
  saveCalibrationProfile(profile);
  return profile;
}

// ─── Multi-Resolution Analysis ────────────────────────────────────

function makeImageDataFromCanvas(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function createResolutionCopy(
  dataUrl: string,
  profile: AnalysisResolutionProfile,
): Promise<{ dataUrl: string; width: number; height: number; imageData: ImageData }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, profile.maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No canvas context')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', profile.jpegQuality),
        width: w,
        height: h,
        imageData,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

// ─── Region Analysis ──────────────────────────────────────────────

function grayValue(data: Uint8ClampedArray, idx: number): number {
  return (data[idx] * 0.299) + (data[idx + 1] * 0.587) + (data[idx + 2] * 0.114);
}

function analyzeRegion(
  imageData: ImageData,
  x1: number, y1: number, x2: number, y2: number,
): RegionAnalysis {
  const { width, data } = imageData;
  let laplacianSum = 0;
  let laplacianSq = 0;
  let edgeCount = 0;
  let samples = 0;
  let minLum = 255;
  let maxLum = 0;

  for (let y = Math.max(1, y1); y < Math.min(y2, imageData.height - 1); y += 2) {
    for (let x = Math.max(1, x1); x < Math.min(x2, width - 1); x += 2) {
      const idx = (y * width + x) * 4;
      const lum = grayValue(data, idx);
      const center = lum * 4;
      const laplacian = center
        - grayValue(data, ((y) * width + (x - 1)) * 4)
        - grayValue(data, ((y) * width + (x + 1)) * 4)
        - grayValue(data, ((y - 1) * width + x) * 4)
        - grayValue(data, ((y + 1) * width + x) * 4);
      const gradient = Math.abs(
        grayValue(data, ((y) * width + (x + 1)) * 4) - grayValue(data, ((y) * width + (x - 1)) * 4)
      ) + Math.abs(
        grayValue(data, ((y + 1) * width + x) * 4) - grayValue(data, ((y - 1) * width + x) * 4)
      );

      laplacianSum += Math.abs(laplacian);
      laplacianSq += laplacian * laplacian;
      if (gradient > 28) edgeCount++;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
      samples++;
    }
  }

  const mean = samples > 0 ? laplacianSum / samples : 0;
  const variance = samples > 0 ? Math.max(0, (laplacianSq / samples) - mean * mean) : 0;

  const regionMap: Record<string, RegionAnalysis['region']> = {
    center: 'center',
    top_left: 'top_left',
    top_right: 'top_right',
    bottom_left: 'bottom_left',
    bottom_right: 'bottom_right',
  };

  const regionKey = x1 === 0 && y1 === 0 ? 'top_left'
    : x2 === width && y1 === 0 ? 'top_right'
    : x1 === 0 && y2 === imageData.height ? 'bottom_left'
    : x2 === width && y2 === imageData.height ? 'bottom_right'
    : 'center';

  return {
    region: regionKey,
    laplacianMean: Math.round(mean * 100) / 100,
    laplacianVariance: Math.round(variance * 100) / 100,
    localContrast: maxLum - minLum,
    edgeDensity: samples > 0 ? edgeCount / samples : 0,
  };
}

export function analyzeRegions(imageData: ImageData): MultiRegionResult {
  const { width, height } = imageData;
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const hw = Math.floor(width / 4);
  const hh = Math.floor(height / 4);

  // Center region (inner 50%)
  const center = analyzeRegion(imageData, cx - hw, cy - hh, cx + hw, cy + hh);

  // Corner regions (each 25%)
  const topLeft = analyzeRegion(imageData, 0, 0, cx, cy);
  const topRight = analyzeRegion(imageData, cx, 0, width, cy);
  const bottomLeft = analyzeRegion(imageData, 0, cy, cx, height);
  const bottomRight = analyzeRegion(imageData, cx, cy, width, height);

  const regions = [center, topLeft, topRight, bottomLeft, bottomRight];

  // Center-to-edge ratio
  const edgeMean = (topLeft.laplacianMean + topRight.laplacianMean + bottomLeft.laplacianMean + bottomRight.laplacianMean) / 4;
  const centerToEdgeRatio = edgeMean > 0 ? center.laplacianMean / edgeMean : 1;

  // Edge consistency: how similar are the four edge regions
  const edgeMeans = [topLeft.laplacianMean, topRight.laplacianMean, bottomLeft.laplacianMean, bottomRight.laplacianMean];
  const edgeAvg = edgeMeans.reduce((a, b) => a + b, 0) / 4;
  const edgeVariance = edgeMeans.reduce((a, v) => a + (v - edgeAvg) ** 2, 0) / 4;
  const edgeConsistency = edgeAvg > 0 ? 1 - Math.min(1, Math.sqrt(edgeVariance) / edgeAvg) : 1;

  // Quadrant variance: how much do the 4 corners differ
  const quadrantVariance = edgeVariance;

  return { regions, centerToEdgeRatio, edgeConsistency, quadrantVariance };
}

// ─── Haze Detection (Multi-Block) ────────────────────────────────

export function detectHazeFraction(imageData: ImageData, threshold: number = 15): number {
  const { width, height, data } = imageData;
  const blockSize = Math.max(8, Math.floor(Math.min(width, height) / 10));
  let lowContrastBlocks = 0;
  let totalBlocks = 0;

  for (let by = 0; by < height - blockSize; by += blockSize) {
    for (let bx = 0; bx < width - blockSize; bx += blockSize) {
      let bMin = 255;
      let bMax = 0;
      for (let dy = 0; dy < blockSize; dy += 2) {
        for (let dx = 0; dx < blockSize; dx += 2) {
          const lum = grayValue(data, ((by + dy) * width + (bx + dx)) * 4);
          if (lum < bMin) bMin = lum;
          if (lum > bMax) bMax = lum;
        }
      }
      totalBlocks++;
      if ((bMax - bMin) < threshold) lowContrastBlocks++;
    }
  }

  return totalBlocks > 0 ? lowContrastBlocks / totalBlocks : 0;
}

// ─── Cause Classification ─────────────────────────────────────────

export function classifyCause(
  multiRegion: MultiRegionResult,
  globalContrast: number,
  varianceLum: number,
  hazeFraction: number,
  calibration: LensCalibrationProfile['thresholds'] = DEFAULT_THRESHOLDS,
): CauseClassification {
  const reasoning: string[] = [];
  let primary: CameraQualityCause = 'unknown';
  let secondary: CameraQualityCause | null = null;
  let confidence = 0;

  const { centerToEdgeRatio, edgeConsistency } = multiRegion;
  const centerRegion = multiRegion.regions[0];

  // Low detail check
  if (varianceLum < calibration.lowDetailMinVariance) {
    primary = 'low_detail';
    confidence = 0.3;
    reasoning.push(`Scene variance ${varianceLum.toFixed(1)} below threshold ${calibration.lowDetailMinVariance}`);
    return { primary, secondary: null, confidence, reasoning };
  }

  const signals: Array<{ cause: CameraQualityCause; weight: number; reason: string }> = [];

  // Edge softness → smudge or fingerprint
  if (centerToEdgeRatio > calibration.centerEdgeRatioThreshold) {
    const softness = centerToEdgeRatio - calibration.centerEdgeRatioThreshold;
    signals.push({
      cause: 'smudge',
      weight: softness * 2,
      reason: `Center-to-edge ratio ${centerToEdgeRatio.toFixed(2)} exceeds threshold ${calibration.centerEdgeRatioThreshold}`,
    });
    signals.push({
      cause: 'fingerprint',
      weight: softness * 1.5,
      reason: 'Edge softness pattern consistent with fingerprint oils',
    });
  }

  // Haze fraction → haze or condensation
  if (hazeFraction > calibration.hazeBlockFraction) {
    signals.push({
      cause: 'haze',
      weight: hazeFraction * 2.5,
      reason: `Low local contrast in ${Math.round(hazeFraction * 100)}% of blocks`,
    });
    if (hazeFraction > 0.5) {
      signals.push({
        cause: 'condensation',
        weight: hazeFraction * 1.5,
        reason: 'Widespread low contrast may indicate moisture on lens',
      });
    }
  }

  // Low global contrast
  if (globalContrast < calibration.maxGlobalContrast) {
    signals.push({
      cause: 'haze',
      weight: (calibration.maxGlobalContrast - globalContrast) / calibration.maxGlobalContrast,
      reason: `Global contrast ${globalContrast.toFixed(1)} below threshold ${calibration.maxGlobalContrast}`,
    });
  }

  // Inconsistent edges → possible scratch (one edge much sharper than others)
  if (edgeConsistency < 0.5) {
    signals.push({
      cause: 'scratch',
      weight: (1 - edgeConsistency) * 2,
      reason: `Edge inconsistency ${(edgeConsistency * 100).toFixed(0)}% suggests localized damage`,
    });
  }

  // Sort by weight
  signals.sort((a, b) => b.weight - a.weight);

  if (signals.length === 0) {
    primary = 'clean';
    confidence = 0.85;
    reasoning.push('No contamination signals detected');
    return { primary, secondary: null, confidence, reasoning };
  }

  primary = signals[0].cause;
  confidence = Math.min(0.85, signals[0].weight / 2);
  reasoning.push(signals[0].reason);

  if (signals.length > 1 && signals[1].weight > signals[0].weight * 0.5) {
    secondary = signals[1].cause;
    reasoning.push(signals[1].reason);
  }

  return { primary, secondary, confidence, reasoning };
}

// ─── Combined Multi-Resolution Analysis ───────────────────────────

export interface LensAnalysisResult {
  status: LensCleanlinessStatus;
  confidence: number;
  cause: CauseClassification;
  regions: MultiRegionResult;
  globalContrast: number;
  centerSharpness: number;
  edgeSharpness: number;
  centerEdgeRatio: number;
  varianceLum: number;
  hazeFraction: number;
  resolutionUsed: string;
  reasons: string[];
  guidance: string[];
  persistenceFrames: number;
}

function determineStatus(
  cause: CauseClassification,
  confidence: number,
  varianceLum: number,
  calibration: LensCalibrationProfile['thresholds'],
): { status: LensCleanlinessStatus; guidance: string[] } {
  if (cause.primary === 'low_detail') {
    return {
      status: 'uncertain',
      guidance: ['Point the camera at a detailed shelf or product and try again.'],
    };
  }

  if (cause.primary === 'clean') {
    return { status: 'clear', guidance: [] };
  }

  if (confidence < 0.3) {
    return {
      status: 'uncertain',
      guidance: ['Unable to determine lens condition from this frame.'],
    };
  }

  const guidanceMap: Record<CameraQualityCause, string[]> = {
    smudge: ['Clean the camera lens with a soft cloth and try again.'],
    haze: ['Wipe the lens with a clean, soft cloth and try again.'],
    fingerprint: ['Wipe the lens to remove fingerprint oils.'],
    condensation: ['Let the lens acclimate and wipe with a dry cloth.'],
    scratch: ['Check the lens for physical damage. If scratched, the device may need service.'],
    motion_blur: ['Hold the phone steady.'],
    low_light: ['Improve lighting conditions.'],
    low_detail: ['Point the camera at a detailed scene.'],
    clean: [],
    unknown: ['Unable to determine lens condition.'],
  };

  const guidance = guidanceMap[cause.primary] || guidanceMap.unknown;

  if (cause.primary === 'smudge' || cause.primary === 'fingerprint') {
    return { status: 'possible_smudge', guidance };
  }
  if (cause.primary === 'haze' || cause.primary === 'condensation') {
    return { status: 'possible_haze', guidance };
  }
  if (cause.primary === 'scratch') {
    return { status: 'possible_obstruction', guidance };
  }

  return { status: 'uncertain', guidance };
}

export async function analyzeLensMultiResolution(
  dataUrl: string,
  calibration?: LensCalibrationProfile,
): Promise<LensAnalysisResult> {
  const profile = calibration || loadCalibrationProfile();
  const thresholds = profile.thresholds;

  // Run at fine resolution for best accuracy
  const result = await createResolutionCopy(dataUrl, ANALYSIS_RESOLUTIONS.fine);
  const { imageData, width, height } = result;

  // Global contrast
  let minLum = 255;
  let maxLum = 0;
  let lumSum = 0;
  let lumSqSum = 0;
  let pixelCount = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const lum = grayValue(imageData.data, (y * width + x) * 4);
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
      lumSum += lum;
      lumSqSum += lum * lum;
      pixelCount++;
    }
  }

  const meanLum = pixelCount > 0 ? lumSum / pixelCount : 128;
  const varianceLum = pixelCount > 0 ? Math.max(0, (lumSqSum / pixelCount) - meanLum * meanLum) : 0;
  const globalContrast = (maxLum + minLum) > 0 ? ((maxLum - minLum) / (maxLum + minLum)) * 100 : 0;

  // Multi-region analysis
  const regions = analyzeRegions(imageData);
  const centerRegion = regions.regions[0];
  const edgeRegionMean = regions.regions.slice(1).reduce((a, r) => a + r.laplacianMean, 0) / 4;

  // Haze fraction
  const hazeFraction = detectHazeFraction(imageData, 15);

  // Cause classification
  const cause = classifyCause(regions, globalContrast, varianceLum, hazeFraction, thresholds);

  // Determine status
  const { status, guidance } = determineStatus(cause, cause.confidence, varianceLum, thresholds);

  const reasons: string[] = [...cause.reasoning];

  return {
    status,
    confidence: cause.confidence,
    cause,
    regions,
    globalContrast: Math.round(globalContrast * 10) / 10,
    centerSharpness: centerRegion.laplacianMean,
    edgeSharpness: edgeRegionMean,
    centerEdgeRatio: Math.round(regions.centerToEdgeRatio * 100) / 100,
    varianceLum: Math.round(varianceLum * 100) / 100,
    hazeFraction: Math.round(hazeFraction * 1000) / 1000,
    resolutionUsed: ANALYSIS_RESOLUTIONS.fine.name,
    reasons,
    guidance,
    persistenceFrames: 0,
  };
}
