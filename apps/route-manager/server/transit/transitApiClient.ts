/**
 * Low-level client for the official Transit API (https://external.transitapp.com/v4).
 *
 * The server-side `TRANSIT_API_KEY` is read from the environment here and is
 * NEVER exposed to the frontend. All calls go through `transitRateLimiter` +
 * `transitService` so the 5-request-per-minute free-tier budget is respected.
 *
 * The upstream v4 API authenticates with an `apiKey` request header (not
 * `x-api-key`). It returns HTTP 429 `{ "message": "API rate limit exceeded" }`
 * when the per-minute budget is exhausted.
 */

import { TransitApiError, isTransitError } from "./transitTypes";
import { getTransitBudgetStore, TransitRequestCategory } from "./transitBudget";

const DEFAULT_BASE_URL = "https://external.transitapp.com/v4";
const REQUEST_TIMEOUT_MS = 15_000;
/** Only network-level failures are retried once; HTTP responses are not retried. */
const MAX_ATTEMPTS = 2;

export interface TransitConfig {
  configured: boolean;
  baseUrl: string;
  networkIds: string[];
}

export function getTransitConfig(): TransitConfig {
  const baseUrl = (process.env.TRANSIT_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiKey = process.env.TRANSIT_API_KEY || "";
  const networkIds = (process.env.TRANSIT_NETWORK_IDS || "GET|Bakersfield")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { configured: !!apiKey, baseUrl, networkIds };
}

export function isTransitConfigured(): boolean {
  return getTransitConfig().configured;
}

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  /** Which monthly-budget category this upstream call belongs to. */
  category?: TransitRequestCategory;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function budgetExhaustedMessage(code: "exhausted" | "reserved" | undefined): string {
  if (code === "reserved") {
    return "The Transit API monthly request budget is nearly exhausted. Live data is reserved for trip planning and arrivals; nonessential refreshes are paused. Cached data is still available.";
  }
  return "The Transit API monthly live-data budget is exhausted. Cached transit data is still available; new live requests resume next month.";
}

async function performRequest<T>(
  baseUrl: string,
  apiKey: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  // NOTE: use `new URL(baseUrl + path)` (not `new URL(path, baseUrl)`) because
  // the base URL contains a path prefix (/v4) that would otherwise be dropped.
  const url = new URL(`${baseUrl}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        apiKey,
        "user-agent": "route-manager/1.0",
      },
      signal: controller.signal,
    });
  } catch {
    throw new TransitApiError(
      "TRANSIT_TEMPORARILY_UNAVAILABLE",
      "Could not reach the Transit API. Check the network and try again.",
      503,
      true,
      false
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (response.status === 429) {
    throw new TransitApiError(
      "TRANSIT_RATE_LIMITED",
      "The Transit API rate limit was reached. Try again in a minute.",
      429,
      false
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new TransitApiError(
      "TRANSIT_AUTH_FAILED",
      "The Transit API rejected the configured server API key.",
      502,
      false
    );
  }

  if (response.status === 404) {
    throw new TransitApiError(
      "TRANSIT_STOP_NOT_FOUND",
      "The requested transit stop was not found.",
      404,
      false
    );
  }

  if (!response.ok) {
    throw new TransitApiError(
      "TRANSIT_TEMPORARILY_UNAVAILABLE",
      `The Transit API returned an unexpected response (${response.status}).`,
      503,
      false
    );
  }

  // The upstream API occasionally returns HTTP 200 with an `error` field
  // (e.g. `{ "error": "couldn't parse request" }`). Treat that as a failure.
  if (body && typeof body === "object" && "error" in body && typeof (body as { error?: unknown }).error === "string") {
    throw new TransitApiError(
      "TRANSIT_TEMPORARILY_UNAVAILABLE",
      (body as { error: string }).error,
      502,
      false
    );
  }

  return body as T;
}

export async function transitRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { configured, baseUrl } = getTransitConfig();
  if (!configured) {
    throw new TransitApiError(
      "TRANSIT_NOT_CONFIGURED",
      "The Transit API key is not configured on the server.",
      503,
      false
    );
  }

  const category = options.category ?? "nearby";
  const budget = getTransitBudgetStore();
  const gate = await budget.canSpend(category);
  if (!gate.allowed) {
    throw new TransitApiError(
      "TRANSIT_MONTHLY_BUDGET_EXHAUSTED",
      budgetExhaustedMessage(gate.code),
      429,
      false
    );
  }

  let lastError: TransitApiError | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const result = await performRequest<T>(baseUrl, process.env.TRANSIT_API_KEY as string, path, options.params);
      await budget.record(category);
      return result;
    } catch (err) {
      if (!isTransitError(err)) throw err;
      // The upstream budget counts every request that reached the upstream
      // server — including ones that returned an HTTP error (e.g. upstream
      // 429/5xx). Network-level failures (no upstream response received) are
      // not counted and are the only errors we retry.
      if (err.reachedUpstream) await budget.record(category);
      if (!err.retryable) throw err;
      lastError = err;
      await sleep(250 * (attempt + 1));
    }
  }
  throw lastError;
}

export async function transitRequestNoThrow<T>(path: string, options?: RequestOptions): Promise<T | null> {
  try {
    return await transitRequest<T>(path, options);
  } catch {
    return null;
  }
}
