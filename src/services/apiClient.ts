import { supabase } from "../lib/supabase";
import { authDebugApiStatus, authDebugRaw } from "../auth/authDebug";

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

  const response = await fetch(input, mergedInit);

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
