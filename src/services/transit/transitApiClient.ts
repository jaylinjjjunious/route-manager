import { authFetch } from '../apiClient';

/**
 * Frontend client for the app's own `/api/transit/*` endpoints.
 *
 * The real Transit API key never reaches the browser: every call is proxied
 * through the authenticated Express server. Errors carry a stable `code` so
 * the UI can distinguish rate limits, missing configuration, and stop/trip
 * not-found cases.
 */

export type TransitClientErrorCode =
  | 'TRANSIT_NOT_CONFIGURED'
  | 'TRANSIT_RATE_LIMITED'
  | 'TRANSIT_TEMPORARILY_UNAVAILABLE'
  | 'TRANSIT_INVALID_LOCATION'
  | 'TRANSIT_STOP_NOT_FOUND'
  | 'TRANSIT_TRIP_NOT_FOUND'
  | 'TRANSIT_AUTH_FAILED'
  | 'TRANSIT_MONTHLY_BUDGET_EXHAUSTED'
  | 'AUTH_TOKEN_INVALID';

export class TransitClientError extends Error {
  readonly code: TransitClientErrorCode;
  readonly status: number;

  constructor(code: TransitClientErrorCode, message: string, status: number) {
    super(message);
    this.name = 'TransitClientError';
    this.code = code;
    this.status = status;
  }
}

function isTransitClientError(err: unknown): err is TransitClientError {
  return err instanceof TransitClientError;
}

export function isRateLimited(err: unknown): boolean {
  return isTransitClientError(err) && err.code === 'TRANSIT_RATE_LIMITED';
}

export function isNotConfigured(err: unknown): boolean {
  return isTransitClientError(err) && err.code === 'TRANSIT_NOT_CONFIGURED';
}

async function parseError(response: Response): Promise<never> {
  let data: { error?: string; code?: string } | null = null;
  try {
    data = (await response.json()) as { error?: string; code?: string };
  } catch {
    data = null;
  }
  const code = (data?.code as TransitClientErrorCode | undefined) || 'TRANSIT_TEMPORARILY_UNAVAILABLE';
  throw new TransitClientError(code, data?.error || `Request failed with ${response.status}`, response.status);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authFetch(path, init);
  if (!response.ok) {
    await parseError(response);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new TransitClientError('TRANSIT_TEMPORARILY_UNAVAILABLE', 'The server returned an invalid response.', 502);
  }
}

export function transitGet<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const search = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) search.set(key, String(value));
    }
  }
  const suffix = search.toString();
  return request<T>(suffix ? `${path}?${suffix}` : path);
}

export function transitPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
