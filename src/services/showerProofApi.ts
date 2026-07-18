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

const parseJson = async <T extends object>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) {
    const message = data && 'error' in data && data.error ? data.error : `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return data as T;
};

export const uploadShowerProof = async (input: UploadShowerProofInput): Promise<ShowerProofRecord> => {
  const body = new FormData();
  body.set('cycleId', input.cycleId);
  body.set('localDate', input.localDate);
  body.set('barcode', input.barcode);
  body.set('capturedAt', input.capturedAt);
  body.set('image', input.imageBlob, `shower-proof-${input.cycleId}.jpg`);

  const data = await parseJson<{ proof: ShowerProofRecord }>(await fetch('/api/shower-proofs', {
    method: 'POST',
    body,
  }));

  return data.proof;
};

export const getCurrentShowerProof = async (cycleId: string): Promise<ShowerProofRecord | null> => {
  const data = await parseJson<{ proof: ShowerProofRecord | null }>(await fetch(`/api/shower-proofs/current?cycleId=${encodeURIComponent(cycleId)}`));
  return data.proof;
};

export const getShowerProofHistory = async (): Promise<ShowerProofRecord[]> => {
  const data = await parseJson<{ proofs: ShowerProofRecord[] }>(await fetch('/api/shower-proofs'));
  return data.proofs;
};

export const getShowerProof = async (id: string): Promise<ShowerProofRecord | null> => {
  const data = await parseJson<{ proof: ShowerProofRecord | null }>(await fetch(`/api/shower-proofs/${encodeURIComponent(id)}`));
  return data.proof;
};
