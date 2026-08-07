/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ShowerProof } from './types';
import { authFetch } from '../../services/apiClient';

const MAX_SHOWER_PROOF_SIDE = 720;
const SHOWER_PROOF_JPEG_QUALITY = 0.58;
const SHOWER_BACKEND_TIMEOUT_MS = 15000;
export const REQUIRED_SHOWER_BARCODE = '075371003233';

/**
 * Resize an image file to a max side of 720px and return as a JPEG data URL.
 * Falls back to the original FileReader result if canvas/context is unavailable.
 */
export const resizeProofImage = (file: File): Promise<string> => {
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Could not read proof file'));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, MAX_SHOWER_PROOF_SIDE / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(String(reader.result || ''));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', SHOWER_PROOF_JPEG_QUALITY));
      };
      image.onerror = () => resolve(String(reader.result || ''));
      image.src = String(reader.result || '');
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read proof file'));
    reader.readAsDataURL(file);
  });
};

/* ── Backend load ── */

export interface LoadShowerProofResult {
  found: boolean;
  proof?: Partial<ShowerProof>;
  folderPath?: string;
}

/**
 * Fetch the current-cycle shower proof from the backend and normalize the
 * response into a partial ShowerProof object.
 */
export const loadShowerProofForCycle = async (cycleKey: string): Promise<LoadShowerProofResult> => {
  const response = await authFetch(`/api/shower-proof?cycleKey=${encodeURIComponent(cycleKey)}`);
  if (!response.ok) return { found: false };

  const data = await response.json();
  const row = data?.proof;
  if (!row) return { found: false };

  const proofDataUrl = row.proof_data_url || row.proofDataUrl || '';
  const proofName = row.proof_name || row.proofName || '';
  const barcodeValue = row.barcode_value || row.barcodeValue || '';
  const confirmedAt = row.confirmed_at || row.confirmedAt || '';
  const folderPath = row.folder_path || row.folderPath || '';

  return {
    found: true,
    folderPath,
    proof: {
      cycleKey,
      proofName,
      proofDataUrl,
      proofAttachment: proofName && proofDataUrl ? { name: proofName, dataUrl: proofDataUrl } : undefined,
      barcodeValue,
      scannedBarcode: barcodeValue,
      barcodeVerified: barcodeValue === REQUIRED_SHOWER_BARCODE,
      barcodeVerifiedAt: confirmedAt || row.updated_at?.toString() || row.updatedAt?.toString() || new Date().toISOString(),
      confirmedAt,
      showerConfirmed: Boolean(confirmedAt && proofDataUrl && barcodeValue === REQUIRED_SHOWER_BARCODE),
      showerConfirmedAt: confirmedAt || undefined,
      backendFolderPath: folderPath,
    },
  };
};

/* ── Backend save ── */

export interface SaveShowerProofPayload {
  cycleKey: string;
  proofName?: string;
  proofDataUrl?: string;
  barcodeValue?: string;
  confirmedAt?: string;
  eventType: 'proof_attached' | 'barcode_scanned' | 'barcode_rejected' | 'flash_updated' | 'proof_confirmed';
  flashAvailable?: boolean;
  flashUsed?: boolean;
}

export interface SaveShowerProofResult {
  success: boolean;
  folderPath: string;
  error?: string;
}

/**
 * Persist a shower-proof event to the backend.
 * Returns the folder path on success or an error message on failure.
 */
export const saveShowerProofEvent = async (payload: SaveShowerProofPayload): Promise<SaveShowerProofResult> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), SHOWER_BACKEND_TIMEOUT_MS);

  try {
    const response = await authFetch('/api/shower-proof', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        detail
          ? `Backend save failed with ${response.status}: ${detail.slice(0, 120)}`
          : `Backend save failed with ${response.status}`
      );
    }

    const data = await response.json();
    const folderPath = data?.proof?.folderPath || '';
    return { success: true, folderPath };
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === 'AbortError'
        ? 'Backend save timed out. Check signal and try again.'
        : error instanceof Error && error.message.includes('Session expired')
          ? 'Your session expired. Please sign in again.'
          : error instanceof Error
            ? error.message
            : 'Could not save shower proof to backend.';
    return { success: false, folderPath: '', error: message };
  } finally {
    window.clearTimeout(timeout);
  }
};

/* ── Record normalization ── */

/**
 * Normalize a backend ShowerProofRecord (from Mission Control / ShowerGatePanel)
 * into a local ShowerProof object.
 */
export const normalizeShowerProofRecord = (record: {
  id: string;
  cycleId: string;
  localDate: string;
  barcode: string;
  capturedAt: string;
  storageKey: string;
  imageUrl: string;
  uploadStatus: 'saved' | 'failed';
  verificationStatus: 'verified' | 'rejected';
  createdAt: string;
  updatedAt: string;
}): ShowerProof => {
  const confirmedAt = record.capturedAt || new Date().toISOString();
  return {
    cycleKey: record.cycleId,
    proofId: record.id,
    proofName: record.storageKey.split('/').pop() || 'shower-proof.jpg',
    storageKey: record.storageKey,
    imageUrl: record.imageUrl,
    barcodeValue: record.barcode,
    scannedBarcode: record.barcode,
    barcodeVerified: true,
    barcodeVerifiedAt: confirmedAt,
    confirmedAt,
    showerConfirmed: true,
    showerConfirmedAt: confirmedAt,
    backendFolderPath: record.storageKey,
    capturedAt: record.capturedAt,
    localDate: record.localDate,
    uploadStatus: record.uploadStatus,
    verificationStatus: record.verificationStatus,
  };
};
