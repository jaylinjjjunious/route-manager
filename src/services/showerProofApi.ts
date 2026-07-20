import { authFetch, authFetchJson } from "./apiClient";

export type ShowerProofUploadStatus = 'saved' | 'failed';
export type ShowerProofVerificationStatus = 'verified' | 'rejected';

export interface ShowerProofRecord {
  id: string;
  cycleId: string;
  localDate: string;
  barcode: string;
  barcodeEnding: string;
  capturedAt: string;
  storageKey: string;
  imageUrl: string;
  uploadStatus: ShowerProofUploadStatus;
  verificationStatus: ShowerProofVerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UploadShowerProofInput {
  cycleId: string;
  localDate: string;
  barcode: string;
  capturedAt: string;
  imageBlob: Blob;
}

export const uploadShowerProof = async (input: UploadShowerProofInput): Promise<ShowerProofRecord> => {
  const body = new FormData();
  body.set('cycleId', input.cycleId);
  body.set('localDate', input.localDate);
  body.set('barcode', input.barcode);
  body.set('capturedAt', input.capturedAt);
  body.set('image', input.imageBlob, `shower-proof-${input.cycleId}.jpg`);

  const data = await authFetchJson<{ proof: ShowerProofRecord }>('/api/shower-proofs', {
    method: 'POST',
    body,
  });

  return data.proof;
};

export const getCurrentShowerProof = async (cycleId: string): Promise<ShowerProofRecord | null> => {
  const data = await authFetchJson<{ proof: ShowerProofRecord | null }>(`/api/shower-proofs/current?cycleId=${encodeURIComponent(cycleId)}`);
  return data.proof;
};

export const getShowerProofHistory = async (): Promise<ShowerProofRecord[]> => {
  const data = await authFetchJson<{ proofs: ShowerProofRecord[] }>('/api/shower-proofs');
  return data.proofs;
};

export const getShowerProof = async (id: string): Promise<ShowerProofRecord | null> => {
  const data = await authFetchJson<{ proof: ShowerProofRecord | null }>(`/api/shower-proofs/${encodeURIComponent(id)}`);
  return data.proof;
};
