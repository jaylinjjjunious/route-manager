import type {
  AisleScanSession,
  AisleScanPhoto,
  AisleScanWarning,
  PhotoValidation,
  CaptureDirection,
  AisleSide,
  PhotoRole,
  ScanSessionStatus,
  ValidationStatus,
  StitchStatus,
  ScanChecklist,
  AisleScanSessionMode,
  OverlapInfo,
  LensCleanlinessResult,
  LensCleanlinessStatus,
} from '../../types';

export type { LensCleanlinessResult, LensCleanlinessStatus } from '../../types';

const STORAGE_KEY = 'smart_aisle_scan_sessions';
const PHOTOS_KEY = 'smart_aisle_scan_photos';

// ─── Configuration ────────────────────────────────────────────────

export const SCAN_CONFIG = {
  maxAnalysisWidth: 640,
  analysisJpegQuality: 0.6,
  originalJpegQuality: 0.85,
  steadyHoldMs: 700,
  autoCaptureCooldownMs: 1500,
  minBrightness: 40,
  maxBrightness: 220,
  maxMotionPercent: 8,
  minFocusScore: 0.3,
  maxLevelDeviation: 12,
  overlapTargetPercent: 30,
  minOverlapPercent: 15,
  maxDuplicateOverlapPercent: 75,
  thumbnailWidth: 120,
  minSharpnessScore: 18,
  minEdgeDensity: 0.015,
  levelToleranceDegrees: 6,
  maxSceneTiltDegrees: 7,
  // Lens cleanliness analysis thresholds
  lensMinGlobalContrast: 30,
  lensMaxGlobalContrast: 70,
  lensCenterEdgeRatioThreshold: 0.55,
  lensLowDetailMinVariance: 2,
  lensPersistenceRequired: 3,
  lensRollingWindowSize: 6,
  lensHighConfidenceThreshold: 0.7,
  lensMinMotionForSkip: 0.12,
  lensMinBrightnessForAnalysis: 30,
} as const;

// ─── ID Generation ────────────────────────────────────────────────

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Session CRUD ─────────────────────────────────────────────────

function readSessions(): Record<string, AisleScanSession> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSessions(sessions: Record<string, AisleScanSession>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save scan sessions', e);
  }
}

function readPhotos(): Record<string, AisleScanPhoto> {
  try {
    const raw = localStorage.getItem(PHOTOS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writePhotos(photos: Record<string, AisleScanPhoto>): void {
  try {
    localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
  } catch (e) {
    console.error('Failed to save scan photos', e);
  }
}

export function createSession(
  jobId: string,
  captureDirection: CaptureDirection,
  aisleSide: AisleSide,
  mode: AisleScanSessionMode = 'audit',
): AisleScanSession {
  const session: AisleScanSession = {
    id: uid(),
    jobId,
    mode,
    status: 'capturing',
    captureDirection,
    aisleSide,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    photoSequence: [],
    warnings: [],
    validationStatus: 'not_checked',
    stitchStatus: 'not_started',
    stitchedPreviewDataUrl: null,
    stitchVersion: 0,
    sequenceVersion: 0,
    reviewConfirmedAt: null,
    override: null,
    checklist: {
      beginningCaptured: false,
      endingCaptured: false,
      continuousSequence: true,
      overlapPresent: false,
      topShelvesVisible: false,
      bottomShelvesVisible: false,
      noMajorSkips: true,
      photosClear: true,
      contextPhotoCaptured: false,
      warningsReviewed: false,
      stitchReviewed: false,
      criticalFailuresResolved: false,
    },
  };
  const sessions = readSessions();
  sessions[session.id] = session;
  writeSessions(sessions);
  return session;
}

export function getSession(sessionId: string): AisleScanSession | null {
  return readSessions()[sessionId] || null;
}

export function getActiveSessionForJob(jobId: string): AisleScanSession | null {
  const sessions = readSessions();
  return Object.values(sessions).find(
    s => s.jobId === jobId && !['submitted', 'failed'].includes(s.status)
  ) || null;
}

export function updateSession(
  sessionId: string,
  updates: Partial<AisleScanSession>
): AisleScanSession | null {
  const sessions = readSessions();
  const session = sessions[sessionId];
  if (!session) return null;
  const updated = { ...session, ...updates, updatedAt: new Date().toISOString() };
  sessions[sessionId] = updated;
  writeSessions(sessions);
  return updated;
}

export function deleteSession(sessionId: string): void {
  const sessions = readSessions();
  const session = sessions[sessionId];
  if (session) {
    session.photoSequence.forEach(photoId => deletePhoto(photoId));
    delete sessions[sessionId];
    writeSessions(sessions);
  }
}

// ─── Photo CRUD ───────────────────────────────────────────────────

export function savePhoto(photo: AisleScanPhoto): void {
  const photos = readPhotos();
  photos[photo.id] = photo;
  writePhotos(photos);
}

export function updatePhoto(photoId: string, updates: Partial<AisleScanPhoto>): AisleScanPhoto | null {
  const photos = readPhotos();
  const photo = photos[photoId];
  if (!photo) return null;
  const updated = { ...photo, ...updates };
  photos[photoId] = updated;
  writePhotos(photos);
  return updated;
}

export function markPhotoInactive(photoId: string, source: AisleScanPhoto['removalSource'] = 'thumbnail_x'): AisleScanPhoto | null {
  const photo = getPhoto(photoId);
  if (!photo || !photo.isActive) return photo;
  return updatePhoto(photoId, {
    isActive: false,
    previousSequenceNumber: photo.sequenceNumber,
    removedAt: new Date().toISOString(),
    removalSource: source,
    inactiveReason: source === 'retake' ? 'Replaced by retake' : 'Removed from active aisle sequence',
    includedInStitch: false,
    exclusionReason: 'Removed from active sequence',
  });
}

export function resequenceActivePhotos(sessionId: string): AisleScanPhoto[] {
  const session = getSession(sessionId);
  if (!session) return [];
  const allPhotos = readPhotos();
  const active = session.photoSequence
    .map(id => allPhotos[id])
    .filter((p): p is AisleScanPhoto => !!p && p.isActive);

  active.forEach((photo, index) => {
    allPhotos[photo.id] = {
      ...photo,
      sequenceNumber: index + 1,
      overlapWithPrevious: index === 0 ? null : photo.overlapWithPrevious,
      includedInStitch: true,
      exclusionReason: null,
    };
  });
  writePhotos(allPhotos);
  return active.map(photo => allPhotos[photo.id]);
}

export function getPhoto(photoId: string): AisleScanPhoto | null {
  return readPhotos()[photoId] || null;
}

export function getPhotosByIds(ids: string[]): AisleScanPhoto[] {
  const photos = readPhotos();
  return ids.map(id => photos[id]).filter(Boolean) as AisleScanPhoto[];
}

export function deletePhoto(photoId: string): void {
  const photos = readPhotos();
  delete photos[photoId];
  writePhotos(photos);
}

export function getActivePhotos(sessionId: string): AisleScanPhoto[] {
  const session = getSession(sessionId);
  if (!session) return [];
  return session.photoSequence
    .map(id => readPhotos()[id])
    .filter((p): p is AisleScanPhoto => !!p && p.isActive);
}

// ─── Image Analysis Helpers ───────────────────────────────────────

export function createAnalysisCopy(
  dataUrl: string,
  maxWidth: number = SCAN_CONFIG.maxAnalysisWidth
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No canvas context')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ dataUrl: canvas.toDataURL('image/jpeg', SCAN_CONFIG.analysisJpegQuality), width: w, height: h });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

export function createThumbnail(dataUrl: string): Promise<string> {
  return createAnalysisCopy(dataUrl, SCAN_CONFIG.thumbnailWidth).then(r => r.dataUrl);
}

export function analyzeBrightness(imageData: ImageData): number {
  let sum = 0;
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  return sum / (data.length / 4);
}

export function analyzeMotion(
  current: ImageData,
  previous: ImageData
): number {
  let diff = 0;
  const cData = current.data;
  const pData = previous.data;
  const totalPixels = cData.length / 4;
  for (let i = 0; i < cData.length; i += 16) {
    const rDiff = Math.abs(cData[i] - pData[i]);
    const gDiff = Math.abs(cData[i + 1] - pData[i + 1]);
    const bDiff = Math.abs(cData[i + 2] - pData[i + 2]);
    if (rDiff + gDiff + bDiff > 60) diff++;
  }
  return diff / (totalPixels / 4);
}

export function analyzeLevel(
  current: ImageData,
  width: number
): number {
  const data = current.data;
  const rowSums: number[] = [];
  for (let y = 0; y < Math.min(current.height, 20); y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    }
    rowSums.push(sum / width);
  }
  let maxDiff = 0;
  for (let i = 1; i < rowSums.length; i++) {
    maxDiff = Math.max(maxDiff, Math.abs(rowSimilarity(rowSums, i)));
  }
  return Math.max(0, 1 - maxDiff / 30);
}

function rowSimilarity(sums: number[], i: number): number {
  return sums[i] - sums[i - 1];
}

function analyzeSharpness(imageData: ImageData): { score: number; edgeDensity: number } {
  const { width, height, data } = imageData;
  let laplacianSum = 0;
  let laplacianSq = 0;
  let edgeCount = 0;
  let samples = 0;

  const grayAt = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    return (data[idx] * 0.299) + (data[idx + 1] * 0.587) + (data[idx + 2] * 0.114);
  };

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const center = grayAt(x, y) * 4;
      const laplacian = center - grayAt(x - 1, y) - grayAt(x + 1, y) - grayAt(x, y - 1) - grayAt(x, y + 1);
      const gradient = Math.abs(grayAt(x + 1, y) - grayAt(x - 1, y)) + Math.abs(grayAt(x, y + 1) - grayAt(x, y - 1));
      laplacianSum += laplacian;
      laplacianSq += laplacian * laplacian;
      if (gradient > 28) edgeCount++;
      samples++;
    }
  }

  const mean = samples ? laplacianSum / samples : 0;
  const variance = samples ? Math.max(0, (laplacianSq / samples) - mean * mean) : 0;
  return { score: variance, edgeDensity: samples ? edgeCount / samples : 0 };
}

function estimateSceneTiltDegrees(imageData: ImageData): number | null {
  const { width, height, data } = imageData;
  const candidates: number[] = [];
  const grayAt = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    return (data[idx] * 0.299) + (data[idx + 1] * 0.587) + (data[idx + 2] * 0.114);
  };

  for (let y = 3; y < height - 3; y += 4) {
    for (let x = 3; x < width - 3; x += 4) {
      const gx = grayAt(x + 2, y) - grayAt(x - 2, y);
      const gy = grayAt(x, y + 2) - grayAt(x, y - 2);
      const mag = Math.abs(gx) + Math.abs(gy);
      if (mag < 42) continue;
      const angle = Math.atan2(gy, gx) * 180 / Math.PI;
      const lineAngle = angle + 90;
      const normalized = ((lineAngle + 90) % 180) - 90;
      const nearHorizontal = Math.abs(normalized) <= 20;
      if (nearHorizontal) candidates.push(normalized);
    }
  }

  if (candidates.length < 18) return null;
  candidates.sort((a, b) => a - b);
  return candidates[Math.floor(candidates.length / 2)];
}

// ─── Lens Cleanliness Analysis ──────────────────────────────────────

export function analyzeLensCleanliness(imageData: ImageData): LensCleanlinessResult {
  const { width, height, data } = imageData;
  const grayAt = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    return (data[idx] * 0.299) + (data[idx + 1] * 0.587) + (data[idx + 2] * 0.114);
  };

  // Global contrast: Michelson contrast of the luminance histogram
  let minLum = 255;
  let maxLum = 0;
  let lumSum = 0;
  let lumSqSum = 0;
  let pixelCount = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const lum = grayAt(x, y);
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

  // Center sharpness (inner 50% region)
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const innerW = Math.floor(width / 4);
  const innerH = Math.floor(height / 4);
  let centerLaplacianSum = 0;
  let centerSamples = 0;
  for (let y = cy - innerH; y < cy + innerH; y += 2) {
    for (let x = cx - innerW; x < cx + innerW; x += 2) {
      if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) continue;
      const center = grayAt(x, y) * 4;
      const laplacian = center - grayAt(x - 1, y) - grayAt(x + 1, y) - grayAt(x, y - 1) - grayAt(x, y + 1);
      centerLaplacianSum += Math.abs(laplacian);
      centerSamples++;
    }
  }
  const centerSharpness = centerSamples > 0 ? centerLaplacianSum / centerSamples : 0;

  // Edge sharpness (outer 25% border region)
  let edgeLaplacianSum = 0;
  let edgeSamples = 0;
  const borderWidth = Math.floor(width / 6);
  const borderHeight = Math.floor(height / 6);
  for (let y = 2; y < height - 2; y += 2) {
    for (let x = 2; x < width - 2; x += 2) {
      const isEdge = x < borderWidth || x >= width - borderWidth || y < borderHeight || y >= height - borderHeight;
      if (!isEdge) continue;
      const center = grayAt(x, y) * 4;
      const laplacian = center - grayAt(x - 1, y) - grayAt(x + 1, y) - grayAt(x, y - 1) - grayAt(x, y + 1);
      edgeLaplacianSum += Math.abs(laplacian);
      edgeSamples++;
    }
  }
  const edgeSharpness = edgeSamples > 0 ? edgeLaplacianSum / edgeSamples : 0;

  // Center-to-edge ratio: low ratio means edges are much softer than center (possible smudge)
  const centerEdgeRatio = edgeSharpness > 0 ? centerSharpness / edgeSharpness : 1;

  // Haze detection: local contrast in blocks — low local contrast suggests veiling glare
  const blockSize = Math.max(8, Math.floor(Math.min(width, height) / 10));
  let lowContrastBlocks = 0;
  let totalBlocks = 0;
  for (let by = 0; by < height - blockSize; by += blockSize) {
    for (let bx = 0; bx < width - blockSize; bx += blockSize) {
      let bMin = 255;
      let bMax = 0;
      for (let dy = 0; dy < blockSize; dy += 2) {
        for (let dx = 0; dx < blockSize; dx += 2) {
          const lum = grayAt(bx + dx, by + dy);
          if (lum < bMin) bMin = lum;
          if (lum > bMax) bMax = lum;
        }
      }
      const localContrast = bMax - bMin;
      totalBlocks++;
      if (localContrast < 15) lowContrastBlocks++;
    }
  }
  const hazeFraction = totalBlocks > 0 ? lowContrastBlocks / totalBlocks : 0;

  // Evaluate signals
  const reasons: string[] = [];
  const guidance: string[] = [];
  let status: LensCleanlinessStatus = 'clear';
  let confidence = 0;

  const hasLowContrast = globalContrast < SCAN_CONFIG.lensMaxGlobalContrast;
  const hasLowDetail = varianceLum < SCAN_CONFIG.lensLowDetailMinVariance;
  const hasSoftEdges = centerEdgeRatio > SCAN_CONFIG.lensCenterEdgeRatioThreshold;
  const hasHaze = hazeFraction > 0.35;

  if (hasLowContrast) {
    reasons.push('Low global contrast across the frame');
  }
  if (hasSoftEdges) {
    reasons.push('Edges are noticeably softer than center');
  }
  if (hasHaze) {
    reasons.push(`Widespread low local contrast (${Math.round(hazeFraction * 100)}% of blocks)`);
  }

  if (hasLowDetail) {
    // Scene may be naturally low-detail (plain wall, etc.)
    status = 'uncertain';
    confidence = 0.2;
    reasons.push('Scene may have limited detail for reliable analysis');
    guidance.push('Point the camera at a detailed shelf or object and try again.');
  } else if (reasons.length === 0) {
    status = 'clear';
    confidence = 0.85;
  } else if (reasons.length === 1 && hasSoftEdges && !hasHaze) {
    // Single soft-edge signal: possible but uncertain
    status = 'possible_smudge';
    confidence = 0.45;
    reasons.push('Possible lens smudge');
    guidance.push('Clean the camera lens with a soft cloth and try again.');
  } else if (reasons.length >= 2 || hasHaze) {
    // Multiple signals or haze: stronger indication
    const ratioScore = hasSoftEdges ? 0.3 : 0;
    const contrastScore = hasLowContrast ? 0.3 : 0;
    const hazeScore = hasHaze ? 0.4 : 0;
    confidence = Math.min(0.85, ratioScore + contrastScore + hazeScore + reasons.length * 0.05);

    if (confidence >= SCAN_CONFIG.lensHighConfidenceThreshold && hasHaze) {
      status = 'possible_haze';
      guidance.push('Wipe the lens with a clean, soft cloth and try again.');
    } else if (hasSoftEdges && hasLowContrast) {
      status = 'possible_smudge';
      guidance.push('Check the lens for fingerprints or fog.');
    } else {
      status = 'possible_smudge';
      guidance.push('Clean the camera lens and try again.');
    }
  } else {
    status = 'uncertain';
    confidence = 0.3;
    guidance.push('Unable to determine lens condition from this frame.');
  }

  return {
    status,
    confidence,
    globalContrast: Math.round(globalContrast * 10) / 10,
    centerSharpness: Math.round(centerSharpness * 100) / 100,
    edgeSharpness: Math.round(edgeSharpness * 100) / 100,
    centerEdgeRatio: Math.round(centerEdgeRatio * 100) / 100,
    persistenceFrames: 0,
    reasons,
    guidance,
  };
}

export interface FrameLensSnapshot {
  lensResult: LensCleanlinessResult;
  motionScore: number;
  brightness: number;
  timestamp: number;
}

export function analyzeFrameLensSnapshot(
  analysisDataUrl: string,
  previousAnalysisDataUrl: string | null,
): Promise<FrameLensSnapshot> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          lensResult: { status: 'unsupported', reasons: ['No canvas context'], guidance: [] },
          motionScore: 0,
          brightness: 128,
          timestamp: Date.now(),
        });
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const brightness = analyzeBrightness(imageData);
      const lensResult = analyzeLensCleanliness(imageData);

      if (previousAnalysisDataUrl) {
        const prevImg = new Image();
        prevImg.onload = () => {
          const prevCanvas = document.createElement('canvas');
          prevCanvas.width = prevImg.width;
          prevCanvas.height = prevImg.height;
          const prevCtx = prevCanvas.getContext('2d');
          let motionScore = 0;
          if (prevCtx) {
            prevCtx.drawImage(prevImg, 0, 0);
            const prevData = prevCtx.getImageData(0, 0, prevCanvas.width, prevCanvas.height);
            motionScore = analyzeMotion(imageData, prevData);
          }
          resolve({ lensResult, motionScore, brightness, timestamp: Date.now() });
        };
        prevImg.onerror = () => resolve({ lensResult, motionScore: 0, brightness, timestamp: Date.now() });
        prevImg.src = previousAnalysisDataUrl;
        return;
      }
      resolve({ lensResult, motionScore: 0, brightness, timestamp: Date.now() });
    };
    img.onerror = () => {
      resolve({
        lensResult: { status: 'unsupported', reasons: ['Failed to load image'], guidance: [] },
        motionScore: 0,
        brightness: 128,
        timestamp: Date.now(),
      });
    };
    img.src = analysisDataUrl;
  });
}

export function analyzeRollingLensCleanliness(
  snapshots: FrameLensSnapshot[],
): LensCleanlinessResult {
  if (snapshots.length < 2) {
    return { status: 'uncertain', reasons: ['Insufficient frames for analysis'], guidance: ['Hold steady for a moment.'], persistenceFrames: snapshots.length };
  }

  const recentMotion = snapshots.slice(-3).map(s => s.motionScore);
  const avgRecentMotion = recentMotion.reduce((a, b) => a + b, 0) / recentMotion.length;

  // Skip analysis if motion is high
  if (avgRecentMotion > SCAN_CONFIG.lensMinMotionForSkip) {
    return { status: 'uncertain', reasons: ['Device motion too high for lens analysis'], guidance: ['Hold the phone steady to check the lens.'], persistenceFrames: 0 };
  }

  const avgBrightness = snapshots.reduce((a, s) => a + s.brightness, 0) / snapshots.length;
  if (avgBrightness < SCAN_CONFIG.lensMinBrightnessForAnalysis) {
    return { status: 'uncertain', reasons: ['Lighting too low for reliable lens analysis'], guidance: ['Improve lighting and try again.'], persistenceFrames: 0 };
  }

  // Count frames with haze or smudge signals
  let hazeCount = 0;
  let smudgeCount = 0;
  let clearCount = 0;
  let uncertainCount = 0;
  let totalConfidence = 0;
  let validFrames = 0;
  let latestResult: LensCleanlinessResult = snapshots[snapshots.length - 1].lensResult;

  for (const snap of snapshots) {
    const r = snap.lensResult;
    if (r.status === 'possible_haze' || r.status === 'possible_obstruction') hazeCount++;
    else if (r.status === 'possible_smudge') smudgeCount++;
    else if (r.status === 'clear') clearCount++;
    else uncertainCount++;
    if (r.confidence != null) {
      totalConfidence += r.confidence;
      validFrames++;
    }
  }

  const avgConfidence = validFrames > 0 ? totalConfidence / validFrames : 0;
  const problematicFrames = hazeCount + smudgeCount;
  const persistenceRatio = snapshots.length > 0 ? problematicFrames / snapshots.length : 0;
  const persistenceCount = Math.max(hazeCount, smudgeCount);

  // If most frames are clear, the lens is likely fine
  if (clearCount > snapshots.length * 0.6) {
    return {
      status: 'clear',
      confidence: 0.8,
      persistenceFrames: persistenceCount,
      reasons: [],
      guidance: [],
    };
  }

  // Low-detail scene: uncertain
  const lowDetailFrames = snapshots.filter(s =>
    s.lensResult.reasons.some(r => r.toLowerCase().includes('limited detail'))
  ).length;
  if (lowDetailFrames > snapshots.length * 0.5) {
    return {
      status: 'uncertain',
      confidence: 0.25,
      persistenceFrames: persistenceCount,
      reasons: ['Scene may have limited detail for reliable lens analysis'],
      guidance: ['Point the camera at a detailed shelf or object and try again.'],
    };
  }

  // Persistent haze across multiple frames
  if (persistenceRatio >= 0.5 && persistenceCount >= SCAN_CONFIG.lensPersistenceRequired) {
    const status: LensCleanlinessStatus = hazeCount > smudgeCount ? 'possible_haze' : 'possible_smudge';
    const highConf = avgConfidence >= SCAN_CONFIG.lensHighConfidenceThreshold;
    return {
      status,
      confidence: Math.min(0.85, avgConfidence + 0.1),
      globalContrast: latestResult.globalContrast,
      centerSharpness: latestResult.centerSharpness,
      edgeSharpness: latestResult.edgeSharpness,
      centerEdgeRatio: latestResult.centerEdgeRatio,
      persistenceFrames: persistenceCount,
      reasons: [`Persistent ${status === 'possible_haze' ? 'haze' : 'softness'} across ${persistenceCount} of ${snapshots.length} frames`],
      guidance: highConf
        ? ['Wipe the lens with a clean, soft cloth and try again.']
        : ['Clean the camera lens and try again.'],
    };
  }

  // Some problematic frames but not enough for persistence threshold
  if (problematicFrames > 0) {
    return {
      status: 'uncertain',
      confidence: avgConfidence * 0.6,
      persistenceFrames: persistenceCount,
      reasons: latestResult.reasons.slice(0, 2),
      guidance: ['Hold steady and allow autofocus to settle.'],
    };
  }

  return {
    status: 'clear',
    confidence: 0.7,
    persistenceFrames: 0,
    reasons: [],
    guidance: [],
  };
}

export function validatePhoto(
  analysisDataUrl: string,
  previousAnalysisDataUrl: string | null,
  photoRole: 'beginning' | 'section' | 'ending',
  deviceLevelDegrees: number | null = null,
): Promise<PhotoValidation> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(makeValidation(false, ['Unable to analyze image'], ['Try again.']));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const brightness = analyzeBrightness(imageData);
      const legacyLevel = analyzeLevel(imageData, canvas.width);
      const sharpness = analyzeSharpness(imageData);
      const sceneTilt = estimateSceneTiltDegrees(imageData);
      const warnings: string[] = [];
      const guidance: string[] = [];

      let sharpnessStatus: PhotoValidation['sharpnessStatus'] = 'pass';
      if (sharpness.score < SCAN_CONFIG.minSharpnessScore && sharpness.edgeDensity >= SCAN_CONFIG.minEdgeDensity) {
        sharpnessStatus = 'fail';
        warnings.push('Image is blurry');
        guidance.push('Hold steady and wait for focus.');
      } else if (sharpness.edgeDensity < SCAN_CONFIG.minEdgeDensity) {
        sharpnessStatus = 'uncertain';
      }

      let brightnessStatus: PhotoValidation['brightnessStatus'] = 'pass';
      if (brightness < SCAN_CONFIG.minBrightness) {
        brightnessStatus = 'fail';
        warnings.push('Image too dark');
        guidance.push('Improve lighting.');
      }
      if (brightness > SCAN_CONFIG.maxBrightness) {
        brightnessStatus = 'fail';
        warnings.push('Image too bright');
        guidance.push('Reduce glare or move slightly.');
      }

      let levelStatus: PhotoValidation['levelStatus'] = 'pass';
      const deviceTilt = deviceLevelDegrees !== null ? Math.abs(deviceLevelDegrees) : null;
      const sceneTiltAbs = sceneTilt !== null ? Math.abs(sceneTilt) : null;
      if (deviceTilt !== null && deviceTilt > SCAN_CONFIG.levelToleranceDegrees) {
        levelStatus = 'fail';
        warnings.push('Photo not level');
        guidance.push('Level the phone.');
      } else if (sceneTiltAbs !== null && sceneTiltAbs > SCAN_CONFIG.maxSceneTiltDegrees) {
        levelStatus = 'fail';
        warnings.push('Photo not level');
        guidance.push('Straighten shelves in the frame.');
      } else if (deviceTilt === null && sceneTilt === null) {
        levelStatus = 'uncertain';
        if (photoRole === 'beginning' || photoRole === 'ending') guidance.push('Level could not be automatically verified; review alignment.');
      }

      let motionScore: number | null = null;
      const lensCleanliness = analyzeLensCleanliness(imageData);
      const finish = () => {
        const motionStatus: PhotoValidation['motionStatus'] = motionScore !== null && motionScore > SCAN_CONFIG.maxMotionPercent ? 'fail' : motionScore === null ? 'unsupported' : 'pass';
        const passed = !warnings.length;
        resolve(makeValidation(passed, warnings, guidance, brightness, legacyLevel, motionScore, sharpness.score, {
          sharpnessStatus,
          brightnessStatus,
          motionStatus,
          levelStatus,
          deviceLevelDegrees,
          sceneLevelDegrees: sceneTilt,
          levelToleranceDegrees: SCAN_CONFIG.levelToleranceDegrees,
        }, lensCleanliness));
      };

      if (previousAnalysisDataUrl) {
        const prevImg = new Image();
        prevImg.onload = () => {
          const prevCanvas = document.createElement('canvas');
          prevCanvas.width = prevImg.width;
          prevCanvas.height = prevImg.height;
          const prevCtx = prevCanvas.getContext('2d');
          if (prevCtx) {
            prevCtx.drawImage(prevImg, 0, 0);
            const prevData = prevCtx.getImageData(0, 0, prevCanvas.width, prevCanvas.height);
            motionScore = analyzeMotion(imageData, prevData);
            if (motionScore > SCAN_CONFIG.maxMotionPercent) {
              warnings.push('Too much movement');
              guidance.push('Move more slowly.');
            }
          }
          finish();
        };
        prevImg.onerror = finish;
        prevImg.src = previousAnalysisDataUrl;
        return;
      }
      finish();
    };
    img.onerror = () => resolve(makeValidation(false, ['Failed to analyze image'], ['Try again.']));
    img.src = analysisDataUrl;
  });
}

function makeValidation(
  passed: boolean,
  warnings: string[],
  guidance: string[] = [],
  brightness: number | null = null,
  level: number | null = null,
  motion: number | null = null,
  sharpness: number | null = null,
  statuses: Partial<PhotoValidation> = {},
  lensCleanliness?: LensCleanlinessResult,
): PhotoValidation {
  return {
    focusScore: sharpness,
    brightnessScore: brightness,
    motionScore: motion,
    levelScore: level,
    obstructionScore: null,
    topShelfVisible: null,
    bottomShelfVisible: null,
    meaningfulCoverage: null,
    passed,
    warnings,
    guidance,
    lensCleanliness,
    ...statuses,
  };
}

// ─── Canvas Utilities ─────────────────────────────────────────────

export function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No canvas context')); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number = 0.85): string {
  return canvas.toDataURL('image/jpeg', quality);
}

export function captureFrameFromVideo(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg', SCAN_CONFIG.originalJpegQuality);
}

// ─── Coverage Analysis ────────────────────────────────────────────

export function analyzeCoveragePairwise(
  photos: AisleScanPhoto[]
): AisleScanWarning[] {
  const warnings: AisleScanWarning[] = [];
  for (let i = 1; i < photos.length; i++) {
    const prev = photos[i - 1];
    const curr = photos[i];
    const overlap = curr.overlapWithPrevious;
    if (overlap && overlap.estimatedPercent !== null) {
      if (overlap.estimatedPercent < SCAN_CONFIG.minOverlapPercent) {
        warnings.push({
          id: uid(),
          photoId: curr.id,
          type: 'weak_overlap',
          message: `Weak overlap between Section ${prev.sequenceNumber} and Section ${curr.sequenceNumber}`,
          severity: 'warning',
          resolved: false,
        });
      }
      if (overlap.estimatedPercent > SCAN_CONFIG.maxDuplicateOverlapPercent) {
        warnings.push({
          id: uid(),
          photoId: curr.id,
          type: 'duplicate',
          message: `Section ${curr.sequenceNumber} may duplicate Section ${prev.sequenceNumber}`,
          severity: 'warning',
          resolved: false,
        });
      }
    }
    if (!curr.validation.passed) {
      curr.validation.warnings.forEach(w => {
        warnings.push({
          id: uid(),
          photoId: curr.id,
          type: w.toLowerCase().includes('dark') ? 'dark' : w.toLowerCase().includes('blur') ? 'blur' : 'gap',
          message: `Section ${curr.sequenceNumber}: ${w}`,
          severity: 'warning',
          resolved: false,
        });
      });
    }
  }
  return warnings;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function estimateOverlap(prev: AisleScanPhoto, curr: AisleScanPhoto): Promise<OverlapInfo> {
  try {
    const prevCanvas = await dataUrlToCanvas(prev.analysisDataUrl);
    const currCanvas = await dataUrlToCanvas(curr.analysisDataUrl);
    const width = Math.min(prevCanvas.width, currCanvas.width, 160);
    const height = Math.min(prevCanvas.height, currCanvas.height, 120);
    const prevSample = document.createElement('canvas');
    const currSample = document.createElement('canvas');
    prevSample.width = currSample.width = width;
    prevSample.height = currSample.height = height;
    const prevCtx = prevSample.getContext('2d')!;
    const currCtx = currSample.getContext('2d')!;
    prevCtx.drawImage(prevCanvas, prevCanvas.width - width, 0, width, height, 0, 0, width, height);
    currCtx.drawImage(currCanvas, 0, 0, width, height, 0, 0, width, height);
    const diff = analyzeMotion(currCtx.getImageData(0, 0, width, height), prevCtx.getImageData(0, 0, width, height));
    const score = clamp(1 - diff, 0, 1);
    return {
      score,
      estimatedPercent: Math.round(clamp(score * 55, 0, 55)),
      confidence: clamp(score, 0.05, 0.95),
    };
  } catch {
    return { score: null, estimatedPercent: null, confidence: null };
  }
}

export async function recalculateSessionAfterSequenceChange(sessionId: string): Promise<AisleScanSession | null> {
  const session = getSession(sessionId);
  if (!session) return null;
  const active = resequenceActivePhotos(sessionId);
  const allPhotos = readPhotos();

  for (let i = 0; i < active.length; i++) {
    const photo = allPhotos[active[i].id];
    if (!photo) continue;
    allPhotos[photo.id] = {
      ...photo,
      sequenceNumber: i + 1,
      overlapWithPrevious: i === 0 ? null : await estimateOverlap(active[i - 1], photo),
      includedInStitch: true,
      exclusionReason: null,
    };
  }
  writePhotos(allPhotos);

  const recalculatedPhotos = getActivePhotos(sessionId);
  const warnings = analyzeCoveragePairwise(recalculatedPhotos);
  const hasBeginning = recalculatedPhotos.some(p => p.role === 'beginning');
  const hasEnding = recalculatedPhotos.some(p => p.role === 'ending');
  const hasSection = recalculatedPhotos.some(p => p.role === 'section');
  if (!hasBeginning) {
    warnings.push({ id: uid(), photoId: sessionId, type: 'gap', message: 'A beginning boundary photo is required.', severity: 'critical', resolved: false });
  }
  if (!hasEnding && session.status === 'stitch_review') {
    warnings.push({ id: uid(), photoId: sessionId, type: 'gap', message: 'An ending boundary photo is required.', severity: 'critical', resolved: false });
  }
  if (!hasSection) {
    warnings.push({ id: uid(), photoId: sessionId, type: 'gap', message: 'More aisle coverage is required before stitching.', severity: 'critical', resolved: false });
  }

  const preview = recalculatedPhotos.length >= 2 && hasBeginning && hasSection ? await stitchPhotos(recalculatedPhotos) : null;
  return updateSession(sessionId, {
    warnings,
    validationStatus: warnings.some(w => w.severity === 'critical') ? 'blocked' : warnings.length ? 'review_required' : 'ready',
    stitchedPreviewDataUrl: preview,
    stitchStatus: preview ? (warnings.length ? 'review_recommended' : 'successful') : 'failed',
    stitchVersion: (session.stitchVersion || 0) + 1,
    sequenceVersion: (session.sequenceVersion || 0) + 1,
    checklist: {
      ...session.checklist,
      beginningCaptured: hasBeginning,
      endingCaptured: hasEnding,
      continuousSequence: warnings.every(w => w.type !== 'gap' && w.type !== 'weak_overlap'),
      overlapPresent: recalculatedPhotos.length > 1 && warnings.every(w => w.type !== 'weak_overlap'),
      contextPhotoCaptured: recalculatedPhotos.some(p => p.role === 'context') || hasBeginning,
      photosClear: recalculatedPhotos.every(p => p.validation.passed),
      warningsReviewed: false,
      stitchReviewed: false,
      criticalFailuresResolved: !warnings.some(w => w.severity === 'critical'),
    },
  });
}
// ─── Simple Stitching (Canvas Panorama) ───────────────────────────

export async function stitchPhotos(photos: AisleScanPhoto[]): Promise<string | null> {
  if (photos.length === 0) return null;
  if (photos.length === 1) return photos[0].dataUrl;

  const canvases: HTMLCanvasElement[] = [];
  for (const photo of photos) {
    try {
      canvases.push(await dataUrlToCanvas(photo.dataUrl));
    } catch {
      continue;
    }
  }
  if (canvases.length < 2) return canvases[0]?.toDataURL('image/jpeg', 0.8) || null;

  const targetHeight = Math.max(...canvases.map(c => c.height));
  const scale = 400 / targetHeight;
  const scaledCanvases = canvases.map(c => {
    const w = Math.round(c.width * scale);
    const h = Math.round(c.height * scale);
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(c, 0, 0, w, h);
    return out;
  });

  const overlapFraction = 0.25;
  let totalWidth = scaledCanvases[0].width;
  for (let i = 1; i < scaledCanvases.length; i++) {
    totalWidth += scaledCanvases[i].width * (1 - overlapFraction);
  }

  const result = document.createElement('canvas');
  result.width = Math.round(totalWidth);
  result.height = targetHeight;
  const ctx = result.getContext('2d')!;
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, result.width, result.height);

  let x = 0;
  for (let i = 0; i < scaledCanvases.length; i++) {
    const c = scaledCanvases[i];
    const overlapPx = i > 0 ? Math.round(c.width * overlapFraction) : 0;
    if (i > 0) x -= overlapPx;
    const destHeight = targetHeight;
    const destWidth = Math.round(c.width * (destHeight / c.height));
    ctx.drawImage(c, x, 0, destWidth, destHeight);
    if (i < scaledCanvases.length - 1) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + destWidth - overlapPx, 0, overlapPx, destHeight);
      ctx.globalAlpha = 1;
    }
    x += destWidth;
  }

  return result.toDataURL('image/jpeg', 0.75);
}

// ─── Default Checklist ────────────────────────────────────────────

export function defaultChecklist(): ScanChecklist {
  return {
    beginningCaptured: false,
    endingCaptured: false,
    continuousSequence: true,
    overlapPresent: false,
    topShelvesVisible: false,
    bottomShelvesVisible: false,
    noMajorSkips: true,
    photosClear: true,
    contextPhotoCaptured: false,
    warningsReviewed: false,
    stitchReviewed: false,
    criticalFailuresResolved: false,
  };
}

// ─── Test Lab Helpers ──────────────────────────────────────────────

export function getTestLabSessions(): AisleScanSession[] {
  return Object.values(readSessions()).filter(s => s.mode === 'test_lab');
}

export function getTestLabPhotos(sessionId: string): AisleScanPhoto[] {
  return getActivePhotos(sessionId);
}

export function deleteTestLabSession(sessionId: string): void {
  deleteSession(sessionId);
}

export function deleteAllTestLabData(): { sessionsDeleted: number; photosDeleted: number } {
  const allSessions = readSessions();
  const allPhotos = readPhotos();
  let sessionsDeleted = 0;
  let photosDeleted = 0;

  for (const [id, session] of Object.entries(allSessions)) {
    if (session.mode === 'test_lab') {
      for (const photoId of session.photoSequence) {
        if (allPhotos[photoId]) {
          delete allPhotos[photoId];
          photosDeleted++;
        }
      }
      delete allSessions[id];
      sessionsDeleted++;
    }
  }

  writeSessions(allSessions);
  writePhotos(allPhotos);
  return { sessionsDeleted, photosDeleted };
}

export function getTestLabStorageUsage(): { sessionBytes: number; photoBytes: number } {
  let sessionBytes = 0;
  let photoBytes = 0;

  for (const [key, value] of Object.entries(localStorage)) {
    if (key === STORAGE_KEY) {
      sessionBytes = value.length * 2;
    } else if (key === PHOTOS_KEY) {
      const photos = readPhotos();
      for (const photo of Object.values(photos)) {
        const session = readSessions()[photo.sessionId];
        if (session?.mode === 'test_lab') {
          photoBytes += (photo.dataUrl?.length || 0) * 2 + (photo.analysisDataUrl?.length || 0) * 2;
        }
      }
    }
  }

  return { sessionBytes, photoBytes };
}

export function isTestLabEnabled(): boolean {
  try {
    return import.meta.env.DEV && import.meta.env.VITE_ENABLE_SMART_AISLE_TEST_LAB === 'true';
  } catch {
    return false;
  }
}
