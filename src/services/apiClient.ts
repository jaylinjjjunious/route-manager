import { supabase } from "../lib/supabase";
import { authDebugApiStatus, authDebugRaw } from "../auth/authDebug";
import { trackFetchRequest, completeFetchRequest, failFetchRequest } from "../debug/apiDiagnostics";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const hasToken = !!authHeaders.Authorization;

  const isFormData = init.body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData && init.headers) {
    const h = init.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : init.headers;
    Object.assign(headers, h);
  }

  const mergedInit: RequestInit = {
    ...init,
    headers: { ...authHeaders, ...headers },
  };

  const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  const method = init.method || 'GET';

  const requestId = trackFetchRequest(url, method, !!authHeaders.Authorization);
  const startTime = Date.now();

  let response: Response;
  try {
    response = await fetch(input, mergedInit);
  } catch (err) {
    failFetchRequest(requestId, err);
    throw err;
  }

  completeFetchRequest(requestId, response.status, Date.now() - startTime);

  authDebugApiStatus(response.status, url);

  if (response.status === 401 && hasToken) {
    authDebugRaw("401 received — backend rejected token. Throwing auth error.");
    throw new Error("Authorization failed. The backend rejected your session.");
  }

  return response;
}

export async function authFetchJson<T extends object>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  const response = await authFetch(input, init);
  const data = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) {
    const message = data && "error" in data && data.error ? data.error : `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export interface ProbationCheckInRecord {
  owner_id: string;
  month_key: string;
  started_at?: string;
  completed_at?: string;
  device: "phone" | "tablet" | "computer";
  verification_level?: "self_confirmed" | "screenshot_documented" | "provider_verified";
  proof_name?: string;
  proof_data_url?: string;
  provider_receipt_id?: string;
  confirmation_url?: string;
  confirmation_message_id?: string;
  events: Array<{
    type: "opened_ce" | "proof_attached" | "completed";
    at: string;
    device: "phone" | "tablet" | "computer";
  }>;
  updated_at: string;
}

export interface ProbationCheckInPayload {
  monthKey: string;
  startedAt?: string;
  completedAt?: string;
  device: "phone" | "tablet" | "computer";
  verificationLevel?: "self_confirmed" | "screenshot_documented" | "provider_verified";
  proofName?: string;
  proofDataUrl?: string;
  providerReceiptId?: string;
  confirmationUrl?: string;
  confirmationMessageId?: string;
  events: Array<{
    type: "opened_ce" | "proof_attached" | "completed";
    at: string;
    device: "phone" | "tablet" | "computer";
  }>;
}

export async function fetchProbationCheckIns(): Promise<{ records: ProbationCheckInRecord[] }> {
  return authFetchJson("/api/probation-check-ins");
}

export async function fetchCurrentProbationCheckIn(): Promise<{ record: ProbationCheckInRecord | null }> {
  return authFetchJson("/api/probation-check-ins/current");
}

export async function saveProbationCheckIn(payload: ProbationCheckInPayload): Promise<{ record: ProbationCheckInRecord }> {
  return authFetchJson("/api/probation-check-ins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function syncProbationCheckIns(records: ProbationCheckInPayload[]): Promise<{ results: Array<{ monthKey: string; success: boolean; error?: string }> }> {
  return authFetchJson("/api/probation-check-ins/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records }),
  });
}
