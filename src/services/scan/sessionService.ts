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
} from '../../types';

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

export function validatePhoto(
  analysisDataUrl: string,
  previousAnalysisDataUrl: string | null,
  photoRole: 'beginning' | 'section' | 'ending',
): Promise<PhotoValidation> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(makeValidation(false, ['Unable to analyze image']));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const brightness = analyzeBrightness(imageData);
      const level = analyzeLevel(imageData, canvas.width);
      const warnings: string[] = [];

      if (brightness < SCAN_CONFIG.minBrightness) warnings.push('Image too dark');
      if (brightness > SCAN_CONFIG.maxBrightness) warnings.push('Image too bright');
      if (level < 0.7) warnings.push('Phone not level');

      let motionScore: number | null = null;
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
            if (motionScore > SCAN_CONFIG.maxMotionPercent) warnings.push('Too much movement');
          }
          resolve(makeValidation(warnings.length === 0, warnings, brightness, level, motionScore));
        };
        prevImg.onerror = () => resolve(makeValidation(warnings.length === 0, warnings, brightness, level, null));
        prevImg.src = previousAnalysisDataUrl;
        return;
      }
      resolve(makeValidation(warnings.length === 0, warnings, brightness, level, null));
    };
    img.onerror = () => resolve(makeValidation(false, ['Failed to analyze image']));
    img.src = analysisDataUrl;
  });
}

function makeValidation(
  passed: boolean,
  warnings: string[],
  brightness: number | null = null,
  level: number | null = null,
  motion: number | null = null,
): PhotoValidation {
  return {
    focusScore: null,
    brightnessScore: brightness,
    motionScore: motion,
    levelScore: level,
    obstructionScore: null,
    topShelfVisible: null,
    bottomShelfVisible: null,
    meaningfulCoverage: null,
    passed,
    warnings,
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
    return import.meta.env.VITE_ENABLE_SMART_AISLE_TEST_LAB === 'true';
  } catch {
    return false;
  }
}
