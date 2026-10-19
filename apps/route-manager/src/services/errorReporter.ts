import { supabase } from "../lib/supabase";
import { addDebugError } from "../debug/debugStore";

/**
 * Privacy-safe, self-hosted client error reporter.
 *
 * Captures window errors, unhandled rejections, and explicit reports, keeps a
 * small in-memory batch, and flushes it to the authenticated `POST /api/errors`
 * endpoint. Messages are sanitized and bounded before they leave the device;
 * no file contents, secrets, or query strings are ever included. Reports are
 * disabled entirely when the user opts out (persisted preference).
 */

export interface ErrorReportInput {
  message: string;
  category: string;
  source?: string;
  pathname?: string;
}

interface PendingReport {
  message: string;
  category: string;
  source: string;
  pathname: string;
  userAgent: string;
}

const FLUSH_INTERVAL_MS = 10_000;
const MAX_QUEUE = 40;
const MAX_BATCH = 25;
const MAX_FIELD_LENGTH = 300;
const PREFERENCE_KEY = "error_reporting_enabled";

let initialized = false;
let enabled = true;
let queue: PendingReport[] = [];
let flushTimer: number | null = null;
let flushInProgress = false;

const sanitize = (value: string, maxLength: number): string =>
  (value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength);

function safePathname(): string {
  try {
    return sanitize(window.location.pathname, 200);
  } catch {
    return "";
  }
}

function safeUserAgent(): string {
  try {
    return sanitize(navigator.userAgent, 200);
  } catch {
    return "";
  }
}

export function isErrorReportingEnabled(): boolean {
  return enabled;
}

export function setErrorReportingEnabled(on: boolean): void {
  enabled = on;
  try {
    if (on) {
      localStorage.setItem(PREFERENCE_KEY, "1");
    } else {
      localStorage.removeItem(PREFERENCE_KEY);
      queue = [];
    }
  } catch {
    // private browsing — keep in-memory preference only
  }
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

async function flush(): Promise<void> {
  if (flushInProgress || queue.length === 0 || !enabled) return;
  flushInProgress = true;
  const batch = queue.splice(0, MAX_BATCH);
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      queue.unshift(...batch);
      return;
    }
    const response = await fetch("/api/errors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ reports: batch }),
    });
    if (!response.ok) {
      queue.unshift(...batch);
    }
  } catch {
    queue.unshift(...batch);
  } finally {
    flushInProgress = false;
  }
}

/** Records an error locally and queues it for the authenticated server log. */
export function reportError(input: ErrorReportInput): void {
  if (!enabled) return;
  const message = sanitize(input.message, MAX_FIELD_LENGTH);
  const category = sanitize(input.category, 40) || "app";
  const source = sanitize(input.source || "", 200);
  const pathname = sanitize(input.pathname || safePathname(), 200);
  if (!message) return;

  addDebugError({
    category,
    message,
    source: source || "errorReporter",
    pathname,
    statusCode: null,
    retryable: false,
  });

  queue.push({ message, category, source, pathname, userAgent: safeUserAgent() });
  if (queue.length > MAX_QUEUE) queue.shift();
  scheduleFlush();
}

/** Sends a synthetic error to verify end-to-end error monitoring works. */
export async function sendTestError(): Promise<boolean> {
  reportError({
    message: "Test error from Debug Center",
    category: "test",
    source: "DebugCenter",
    pathname: safePathname(),
  });
  flushInProgress = false;
  await flush();
  return queue.length === 0;
}

/** Loads the opt-out preference and installs the global capture handlers. */
export function initErrorReporting(): void {
  if (initialized) return;
  initialized = true;

  try {
    enabled = localStorage.getItem(PREFERENCE_KEY) === null ? true : localStorage.getItem(PREFERENCE_KEY) === "1";
  } catch {
    enabled = true;
  }

  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    reportError({
      message: event.message || "window error",
      category: "window_error",
      source: event.filename || "",
      pathname: safePathname(),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    reportError({
      message,
      category: "unhandled_rejection",
      source: "",
      pathname: safePathname(),
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
}
