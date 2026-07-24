import type { Job, ExtractedJob } from '../types';
import { authFetch } from './apiClient';
import { resolveCoordinates } from '../utils/routeUtils';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES = 10;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];

export const IMPORT_LIMITS = {
  maxFiles: MAX_IMAGES,
  maxFileSizeBytes: MAX_FILE_SIZE,
  maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
  acceptedTypes: ACCEPTED_TYPES,
  acceptedExtensions: '.png,.jpg,.jpeg,.webp,.heic,.heif',
};

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(heic|heif)$/i)) {
    return `Unsupported format: ${file.name}. Use PNG, JPEG, WebP, or HEIC.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name} exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`;
  }
  return null;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function generateTempId(): string {
  return `ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeAddress(raw: string | null): { street: string | null; city: string | null; state: string | null; postalCode: string | null; formatted: string | null } {
  if (!raw) return { street: null, city: null, state: null, postalCode: null, formatted: null };
  const zipMatch = raw.match(/\b(\d{5})(?:-\d{4})?\b/);
  const postalCode = zipMatch ? zipMatch[1] : null;
  const stateMatch = raw.match(/\b(CA|California|TX|Texas|FL|Florida|NY|New York|PA|Pennsylvania|IL|Illinois|OH|Ohio|GA|Georgia|NC|North Carolina|MI|Michigan|NJ|New Jersey|VA|Virginia|WA|Washington|AZ|Arizona|MA|Massachusetts|TN|Tennessee|IN|Indiana|MO|Missouri|MD|Maryland|WI|Wisconsin|CO|Colorado|MN|Minnesota|SC|South Carolina|AL|Alabama|LA|Louisiana|KY|Kentucky|OR|Oregon|OK|Oklahoma|CT|Connecticut|UT|Utah|IA|Iowa|NV|Nevada|AR|Arkansas|MS|Mississippi|KS|Kansas|NM|New Mexico|NE|Nebraska|ID|Idaho|WV|West Virginia|HI|Hawaii|NH|New Hampshire|ME|Maine|MT|Montana|RI|Rhode Island|DE|Delaware|SD|South Dakota|ND|North Dakota|AK|Alaska|VT|Vermont|WY|Wyoming|DC|District of Columbia)\b/i);
  const state = stateMatch ? stateMatch[1] : null;
  return { street: raw, city: null, state, postalCode, formatted: raw };
}

export async function extractJobFromScreenshot(
  file: File,
  imageId: string,
  onProgress?: (step: string) => void
): Promise<ExtractedJob> {
  onProgress?.('Validating image...');
  const validation = validateImageFile(file);
  if (validation) throw new Error(validation);

  onProgress?.('Reading image data...');
  const base64Data = await fileToBase64(file);

  onProgress?.('Sending to AI extraction...');
  const response = await authFetch('/api/import/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Data, mimeType: file.type || 'image/png' }),
  });

  onProgress?.('Processing extraction results...');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Extraction failed');

  const addr = normalizeAddress(data.address);
  const warnings: string[] = [];
  if (!data.address) warnings.push('Missing address');
  if (!data.storeName) warnings.push('Missing company name');
  if (!data.pay || data.pay < 1) warnings.push('Pay unclear');
  if (!data.dueTime) warnings.push('Deadline unclear');

  let confidence = 0.7;
  if (data.storeName && data.address) confidence += 0.15;
  if (data.pay && data.pay > 0) confidence += 0.1;
  if (data.dueTime) confidence += 0.05;
  confidence = Math.min(confidence, 1);

  return {
    temporaryId: generateTempId(),
    sourceImageIds: [imageId],
    companyName: data.storeName || null,
    title: data.notes || null,
    address: {
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      formatted: addr.formatted || data.address || null,
    },
    pay: {
      amount: typeof data.pay === 'number' ? data.pay : null,
      currency: 'USD',
    },
    dueAt: data.dueTime || null,
    estimatedDurationMinutes: typeof data.estimatedMinutes === 'number' ? data.estimatedMinutes : 20,
    jobType: data.jobType || 'field_task',
    instructions: data.notes || null,
    notes: data.notes || null,
    status: null,
    assignmentId: null,
    sourcePlatform: null,
    confidence: {
      overall: confidence,
      fields: {
        companyName: data.storeName ? 0.9 : 0.1,
        address: data.address ? 0.85 : 0.1,
        pay: data.pay ? 0.8 : 0.1,
        dueAt: data.dueTime ? 0.75 : 0.1,
      },
    },
    warnings,
    selected: true,
  };
}

function normalizeForComparison(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

export function detectDuplicate(
  extracted: ExtractedJob,
  existingJobs: Job[]
): string | null {
  for (const job of existingJobs) {
    const nameMatch =
      extracted.companyName &&
      normalizeForComparison(extracted.companyName) === normalizeForComparison(job.storeName);
    const addressMatch =
      extracted.address.formatted &&
      normalizeForComparison(extracted.address.formatted) === normalizeForComparison(job.address);
    if (nameMatch && addressMatch) return job.id;
    if (nameMatch && extracted.pay.amount && extracted.pay.amount === job.pay) {
      return job.id;
    }
  }
  return null;
}

export function detectMergeCandidates(
  items: ExtractedJob[]
): Array<{ primary: ExtractedJob; secondary: ExtractedJob; reason: string }> {
  const candidates: Array<{ primary: ExtractedJob; secondary: ExtractedJob; reason: string }> = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.companyName && normalizeForComparison(a.companyName) === normalizeForComparison(b.companyName)) {
        if (a.address.formatted && b.address.formatted && normalizeForComparison(a.address.formatted) === normalizeForComparison(b.address.formatted)) {
          candidates.push({ primary: a, secondary: b, reason: 'Same company and address' });
        } else if (a.dueAt && b.dueAt && normalizeForComparison(a.dueAt) === normalizeForComparison(b.dueAt)) {
          candidates.push({ primary: a, secondary: b, reason: 'Same company and due time' });
        }
      }
    }
  }
  return candidates;
}

export function extractedJobToJob(
  extracted: ExtractedJob,
  routeId: 'A' | 'B' = 'A'
): Omit<Job, 'id'> {
  const coords = extracted.address.formatted ? resolveCoordinates(extracted.address.formatted) : { lat: 0, lng: 0 };
  const isRev = extracted.status === 'Needs Revision';
  return {
    storeName: extracted.companyName || 'Imported Job',
    address: extracted.address.formatted || extracted.address.street || 'Bakersfield, CA',
    pay: extracted.pay.amount || 0,
    estimatedMinutes: extracted.estimatedDurationMinutes || 20,
    jobType: (extracted.jobType as Job['jobType']) || 'field_task',
    dueTime: extracted.dueAt || '17:00',
    notes: extracted.instructions || extracted.notes || 'Imported via screenshot',
    status: 'ready',
    routeId,
    coordinates: coords,
    priority: 'medium',
    isRevisionRequired: isRev,
    deadline: extracted.dueAt || undefined,
    revisionStatus: extracted.status || undefined,
    smartMergeExplanation: `Imported from screenshot (${extracted.sourceImageIds.length} image(s)). Review before dispatch.`,
  };
}
