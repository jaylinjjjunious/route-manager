export interface DebugRequest {
  id: number;
  path: string;
  method: string;
  status: number | null;
  startTime: number;
  duration: number | null;
  success: boolean;
  errorCategory: string;
  authRequired: boolean;
  retryOccurred: boolean;
}

export interface DebugError {
  id: number;
  timestamp: string;
  category: string;
  message: string;
  source: string;
  pathname: string;
  statusCode: number | null;
  retryable: boolean;
}

export interface DebugCameraState {
  lastPermissionResult: string;
  lastCameraError: string;
  lastScannerStartTime: string;
  lastScannerCloseTime: string;
  streamActive: boolean;
  barcodeDetectorMode: string;
  lastDetectedBarcode: string;
}

const MAX_REQUESTS = 50;
const MAX_ERRORS = 100;

let requestId = 0;
let errorId = 0;

let listeners: Array<() => void> = [];

function notify() {
  for (const fn of listeners) fn();
}

const requestLog: DebugRequest[] = [];
const errorLog: DebugError[] = [];

export const debugCameraState: DebugCameraState = {
  lastPermissionResult: '(none)',
  lastCameraError: '(none)',
  lastScannerStartTime: '(none)',
  lastScannerCloseTime: '(none)',
  streamActive: false,
  barcodeDetectorMode: 'native',
  lastDetectedBarcode: '(none)',
};

let enhancedDiagnostics = false;
let enhancedDiagnosticsExpiry = 0;

export function isEnhancedDiagnostics(): boolean {
  if (!enhancedDiagnostics) return false;
  if (Date.now() > enhancedDiagnosticsExpiry) {
    enhancedDiagnostics = false;
    return false;
  }
  return true;
}

export function setEnhancedDiagnostics(on: boolean) {
  enhancedDiagnostics = on;
  enhancedDiagnosticsExpiry = on ? Date.now() + 24 * 60 * 60 * 1000 : 0;
  try {
    if (on) {
      localStorage.setItem('debug_enhanced_diagnostics', JSON.stringify({ on: true, expiry: enhancedDiagnosticsExpiry }));
    } else {
      localStorage.removeItem('debug_enhanced_diagnostics');
    }
  } catch { /* private browsing */ }
  notify();
}

export function loadEnhancedDiagnosticsPreference() {
  try {
    const raw = localStorage.getItem('debug_enhanced_diagnostics');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.on && parsed.expiry && Date.now() < parsed.expiry) {
        enhancedDiagnostics = true;
        enhancedDiagnosticsExpiry = parsed.expiry;
      } else {
        localStorage.removeItem('debug_enhanced_diagnostics');
      }
    }
  } catch { /* ignore */ }
}

export function subscribeDebug(fn: () => void): () => void {
  listeners = [...listeners, fn];
  return () => { listeners = listeners.filter(l => l !== fn); };
}

export function getRequestLog(): readonly DebugRequest[] {
  return requestLog;
}

export function getErrorLog(): readonly DebugError[] {
  return errorLog;
}

export function clearErrorLog() {
  errorLog.length = 0;
  notify();
}

export function clearRequestLog() {
  requestLog.length = 0;
  notify();
}

export function clearAllDebugLogs() {
  requestLog.length = 0;
  errorLog.length = 0;
  notify();
}

export function addDebugRequest(entry: Omit<DebugRequest, 'id'>) {
  const req: DebugRequest = { id: ++requestId, ...entry };
  requestLog.unshift(req);
  while (requestLog.length > MAX_REQUESTS) requestLog.pop();
  notify();
}

export function updateDebugRequest(id: number, updates: Partial<DebugRequest>) {
  const req = requestLog.find(r => r.id === id);
  if (req) {
    Object.assign(req, updates);
    notify();
  }
}

export function addDebugError(entry: Omit<DebugError, 'id' | 'timestamp'>) {
  const err: DebugError = {
    id: ++errorId,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  errorLog.unshift(err);
  while (errorLog.length > MAX_ERRORS) errorLog.pop();
  notify();
}

export function captureSafeErrorInfo(error: unknown): { message: string; category: string } {
  if (error instanceof Error) {
    const msg = error.message || String(error);
    if (msg.includes('auth') || msg.includes('401') || msg.includes('token')) {
      return { message: 'Authentication error', category: 'auth' };
    }
    if (msg.includes('camera') || msg.includes('getUserMedia') || msg.includes('NotAllowed')) {
      return { message: 'Camera access error', category: 'camera' };
    }
    if (msg.includes('barcode') || msg.includes('BarcodeDetector')) {
      return { message: 'Barcode scanner error', category: 'barcode' };
    }
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
      return { message: 'Network error', category: 'network' };
    }
    if (msg.includes('Supabase') || msg.includes('supabase')) {
      return { message: 'Supabase error', category: 'supabase' };
    }
    const safeMsg = msg.length > 120 ? msg.slice(0, 120) + '…' : msg;
    return { message: safeMsg, category: 'app' };
  }
  return { message: 'Unknown error', category: 'unknown' };
}

export function buildDiagnosticSummary(): string {
  const lines: string[] = [
    `Route Manager — Diagnostic Summary`,
    `Generated: ${new Date().toISOString()}`,
    `URL: ${window.location.pathname}`,
    `Online: ${navigator.onLine}`,
    `Secure: ${window.isSecureContext}`,
    `Recent errors: ${errorLog.length}`,
    `Recent requests: ${requestLog.length}`,
    `Failed requests: ${requestLog.filter(r => !r.success).length}`,
  ];
  if (errorLog.length > 0) {
    lines.push('', 'Recent Errors:');
    for (const e of errorLog.slice(0, 10)) {
      lines.push(`  [${e.timestamp}] ${e.category}: ${e.message}`);
    }
  }
  return lines.join('\n');
}

export function buildDiagnosticReport(): Record<string, unknown> {
  return {
    generated: new Date().toISOString(),
    pathname: window.location.pathname,
    online: navigator.onLine,
    secureContext: window.isSecureContext,
    userAgent: navigator.userAgent,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    devicePixelRatio: window.devicePixelRatio,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    errors: errorLog.slice(0, 20).map(e => ({
      timestamp: e.timestamp,
      category: e.category,
      message: e.message,
      source: e.source,
    })),
    failedRequests: requestLog.filter(r => !r.success).slice(0, 20).map(r => ({
      path: r.path,
      method: r.method,
      status: r.status,
      duration: r.duration,
      category: r.errorCategory,
    })),
  };
}

export function updateCameraDebug(updates: Partial<DebugCameraState>) {
  Object.assign(debugCameraState, updates);
  notify();
}
