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

async function getFreshAccessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error("No valid login session is available.");
  }

  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  const expiresSoon = expiresAtMs <= Date.now() + 60_000;

  if (!expiresSoon) {
    return session.access_token;
  }

  const {
    data: { session: refreshedSession },
    error: refreshError,
  } = await supabase.auth.refreshSession();

  if (refreshError || !refreshedSession) {
    throw new Error("Your login session could not be refreshed.");
  }

  return refreshedSession.access_token;
}

export const uploadShowerProof = async (input: UploadShowerProofInput): Promise<ShowerProofRecord> => {
  const accessToken = await getFreshAccessToken();

  const formData = new FormData();
  formData.append("proofImage", input.imageBlob, `shower-proof-${Date.now()}.jpg`);
  formData.append("barcode", input.barcode);
  formData.append("cycleId", input.cycleId);

  let response = await fetch("/api/shower-proofs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (response.status === 401) {
    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession();

    if (refreshError || !refreshedSession?.access_token) {
      throw new Error("Your session needs to be renewed. Sign in again to retry this upload.");
    }

    response = await fetch("/api/shower-proofs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshedSession.access_token}`,
      },
      body: formData,
    });
  }

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
