/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ShowerProof {
  cycleKey: string;
  proofId?: string;
  proofName?: string;
  proofDataUrl?: string;
  proofAttachment?: {
    name: string;
    dataUrl: string;
  };
  storageKey?: string;
  imageUrl?: string;
  barcodeValue?: string;
  scannedBarcode?: string;
  barcodeVerified?: boolean;
  barcodeVerifiedAt?: string;
  confirmedAt?: string;
  showerConfirmed?: boolean;
  showerConfirmedAt?: string;
  backendFolderPath?: string;
  capturedAt?: string;
  localDate?: string;
  uploadStatus?: 'saved' | 'failed';
  verificationStatus?: 'verified' | 'rejected';
}

export type BarcodePermissionStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'error';

export type ShowerProofSyncStatus = 'idle' | 'saving' | 'saved' | 'error';
