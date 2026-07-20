import { supabase } from "../lib/supabase";
import { authFetchJson } from "./apiClient";

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
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("No valid login session is available.");
  }

  const formData = new FormData();
  formData.append("image", input.imageBlob, "shower-proof.jpg");
  formData.append("barcode", input.barcode);
  formData.append("cycleId", input.cycleId);

  const response = await fetch("/api/shower-proofs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    const message = data?.error || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json() as { proof: ShowerProofRecord };
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
