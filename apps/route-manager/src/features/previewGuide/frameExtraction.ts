import type { ExtractedFrame } from './types';

export const VIDEO_LIMITS = { maxBytes: 250 * 1024 * 1024, maxDurationSeconds: 12 * 60, sampleIntervalSeconds: 1 };

export function validatePreviewRecording(file?: File | null): string | null {
  if (!file) return 'Choose a screen recording to continue.';
  if (!file.type.startsWith('video/')) return 'Choose a video screen recording.';
  if (file.size > VIDEO_LIMITS.maxBytes) return 'This recording is too large to process on this phone. Trim it to the job preview and try again.';
  return null;
}

export function grayscaleSignature(data: Uint8ClampedArray, width: number, height: number, cells = 16): Uint8Array {
  const result = new Uint8Array(cells * cells);
  for (let cy = 0; cy < cells; cy++) for (let cx = 0; cx < cells; cx++) {
    const x = Math.min(width - 1, Math.floor((cx + .5) * width / cells));
    const y = Math.min(height - 1, Math.floor((cy + .5) * height / cells));
    const i = (y * width + x) * 4;
    result[cy * cells + cx] = Math.round(data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114);
  }
  return result;
}

export function signatureDifference(a: Uint8Array, b: Uint8Array): number {
  if (a.length !== b.length) return 1;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / (a.length * 255);
}

export function blurScore(data: Uint8ClampedArray, width: number, height: number): number {
  let edges = 0, samples = 0;
  for (let y = 2; y < height - 2; y += 4) for (let x = 2; x < width - 2; x += 4) {
    const p = (y * width + x) * 4, q = (y * width + x + 2) * 4;
    edges += Math.abs(data[p] - data[q]) + Math.abs(data[p + 1] - data[q + 1]); samples += 2;
  }
  return samples ? edges / samples : 0;
}

function seek(video: HTMLVideoElement, time: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const abort = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
    const cleanup = () => { video.removeEventListener('seeked', done); signal?.removeEventListener('abort', abort); };
    video.addEventListener('seeked', done, { once: true }); signal?.addEventListener('abort', abort, { once: true }); video.currentTime = time;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('A preview page could not be created.')), 'image/jpeg', quality));
}

export async function extractPreviewFrames(file: File, options: { signal?: AbortSignal; onProgress?: (progress: number, label: string) => void } = {}): Promise<ExtractedFrame[]> {
  const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.preload = 'metadata';
  const url = URL.createObjectURL(file); video.src = url;
  try {
    await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error('This phone cannot read that recording. Try an MP4 recording or trim and export it again.')); });
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('The recording duration could not be read.');
    if (video.duration > VIDEO_LIMITS.maxDurationSeconds) throw new Error('This recording is too long. Trim it to the job preview and try again.');
    const width = Math.min(video.videoWidth, 1080), height = Math.round(width * video.videoHeight / video.videoWidth);
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const thumb = document.createElement('canvas'); thumb.width = 180; thumb.height = Math.round(180 * height / width);
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); const tctx = thumb.getContext('2d');
    if (!ctx || !tctx || !width || !height) throw new Error('The recording could not be decoded on this phone.');
    const frames: ExtractedFrame[] = []; let last: Uint8Array | null = null;
    const count = Math.max(1, Math.ceil(video.duration / VIDEO_LIMITS.sampleIntervalSeconds));
    for (let i = 0; i < count; i++) {
      options.signal?.throwIfAborted(); const time = Math.min(i, Math.max(0, video.duration - .05)); await seek(video, time, options.signal);
      ctx.drawImage(video, 0, 0, width, height); const pixels = ctx.getImageData(0, 0, width, height); const sig = grayscaleSignature(pixels.data, width, height);
      const difference = last ? signatureDifference(last, sig) : 1; const sharpness = blurScore(pixels.data, width, height);
      if (!last || difference >= .035) {
        tctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
        const candidate = { image: await canvasBlob(canvas, .88), thumbnail: await canvasBlob(thumb, .7), sourceTimeSeconds: time, difference, blurScore: sharpness };
        const previous = frames.at(-1);
        if (previous && difference < .07 && candidate.blurScore > previous.blurScore * 1.25) frames[frames.length - 1] = candidate; else frames.push(candidate);
        last = sig;
      }
      options.onProgress?.(Math.round(((i + 1) / count) * 100), i < count * .55 ? 'Finding clear pages' : i < count * .85 ? 'Removing duplicates' : 'Building Preview Guide');
    }
    if (!frames.length) throw new Error('No clear preview pages were found. Scroll more slowly and try again.');
    return frames;
  } finally { URL.revokeObjectURL(url); video.removeAttribute('src'); video.load(); }
}
