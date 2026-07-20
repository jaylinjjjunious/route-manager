import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, Copy, Download, Trash2, RefreshCw,
  Activity, Wifi, WifiOff, Globe, Shield, Smartphone, Camera,
  AlertTriangle, Clock, CheckCircle2, XCircle, Search, Filter,
  Bug, Server, Key, Eye, EyeOff,
} from 'lucide-react';
import { useDebug } from '../../debug/useDebug';
import {
  buildDiagnosticSummary,
  buildDiagnosticReport,
  debugCameraState,
} from '../../debug/debugStore';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';
import { authDebugStorageCheck, authDebugPathname, getAuthDebugState } from '../../auth/authDebug';

function Section({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors min-h-[48px]"
      >
        <Icon size={18} className="text-blue-500 flex-shrink-0" />
        <span className="flex-1 text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">{title}</span>
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/5">{children}</div>}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-[11px] font-bold text-slate-400 min-w-[120px] flex-shrink-0">{label}</span>
      <span className={`text-[11px] font-bold break-all ${color || 'text-slate-700 dark:text-slate-300'}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
      ok ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
    }`}>
      {ok ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
      {label}
    </span>
  );
}

interface HealthStatus {
  status: string;
  time: string;
  responseMs: number | null;
  lastSuccess: string;
  lastFailure: string;
}

export default function DebugCenter() {
  const debug = useDebug();
  const { session, user, loading } = useAuth();
  const [health, setHealth] = useState<HealthStatus>({ status: 'unknown', time: '', responseMs: null, lastSuccess: '', lastFailure: '' });
  const [authCheck, setAuthCheck] = useState<string>('');
  const [requestFilter, setRequestFilter] = useState<'all' | 'failed' | '4xx' | '5xx' | 'network'>('all');
  const [authState, setAuthState] = useState(() => getAuthDebugState());
  const [showSecrets, setShowSecrets] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    authDebugStorageCheck();
    authDebugPathname();
    setAuthState(getAuthDebugState());
    const iv = setInterval(() => {
      authDebugStorageCheck();
      authDebugPathname();
      setAuthState(getAuthDebugState());
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const runHealthCheck = useCallback(async () => {
    const start = Date.now();
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      const ms = Date.now() - start;
      setHealth({
        status: data.status || 'unknown',
        time: data.time || '',
        responseMs: ms,
        lastSuccess: new Date().toISOString(),
        lastFailure: health.lastFailure,
      });
    } catch (e) {
      const ms = Date.now() - start;
      setHealth({
        status: 'error',
        time: '',
        responseMs: ms,
        lastSuccess: health.lastSuccess,
        lastFailure: new Date().toISOString(),
      });
    }
  }, [health.lastFailure]);

  useEffect(() => { runHealthCheck(); }, []);

  const testApiConnection = useCallback(async () => {
    setAuthCheck('loading...');
    try {
      const res = await fetch('/api/debug/auth-check', {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const data = await res.json();
      setAuthCheck(data.authenticated ? `Authenticated (user: ${data.userPresent ? 'yes' : 'no'})` : 'Not authenticated');
    } catch {
      setAuthCheck('Connection failed');
    }
  }, [session]);

  const refreshAuthStatus = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setAuthState(getAuthDebugState());
    void data;
  }, []);

  const copySummary = useCallback(async () => {
    const text = buildDiagnosticSummary();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* blocked */ }
  }, []);

  const downloadReport = useCallback(() => {
    const report = buildDiagnosticReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-manager-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const filteredRequests = debug.requestLog.filter(r => {
    if (requestFilter === 'failed') return !r.success;
    if (requestFilter === '4xx') return r.status !== null && r.status >= 400 && r.status < 500;
    if (requestFilter === '5xx') return r.status !== null && r.status >= 500;
    if (requestFilter === 'network') return r.status === null;
    return true;
  });

  const uptime = Math.floor((Date.now() - debug.sessionStartTime) / 1000);
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

  const hasMapKey = !!(import.meta as any).env?.VITE_GOOGLE_MAPS_KEY || !!(import.meta as any).env?.VITE_MAPS_KEY;
  const hasSupabaseUrl = !!(import.meta as any).env?.VITE_SUPABASE_URL;
  const hasSupabaseKey = !!(import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  const ua = navigator.userAgent;
  const uaSummary = ua.length > 80 ? ua.slice(0, 80) + '…' : ua;
  const isMobile = /Mobi|Android|iPhone/i.test(ua);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasMediaDevices = !!(navigator.mediaDevices);
  const hasGetUserMedia = !!(navigator.mediaDevices?.getUserMedia);
  const hasBarcodeDetector = typeof (window as any).BarcodeDetector !== 'undefined';

  return (
    <div className="space-y-4">
      <Section title="System Status" icon={Server} defaultOpen>
        <div className="space-y-1">
          <Row label="App version" value="1.0.0" />
          <Row label="Build timestamp" value={new Date().toISOString().slice(0, 10)} />
          <Row label="Current pathname" value={window.location.pathname} />
          <Row label="Online" value={navigator.onLine ? 'yes' : 'no'} color={navigator.onLine ? 'text-emerald-500' : 'text-red-500'} />
          <Row label="Secure context" value={window.isSecureContext ? 'yes' : 'no'} color={window.isSecureContext ? 'text-emerald-500' : 'text-amber-500'} />
          <Row label="Mode" value={import.meta.env.DEV ? 'development' : 'production'} />
          <Row label="Public domain" value={window.location.hostname} />
          <Row label="Service health" value={health.status} color={health.status === 'ok' ? 'text-emerald-500' : 'text-red-500'} />
          {health.responseMs !== null && <Row label="Health response" value={`${health.responseMs}ms`} />}
          {health.lastSuccess && <Row label="Last health OK" value={new Date(health.lastSuccess).toLocaleTimeString()} />}
          {health.lastFailure && <Row label="Last health fail" value={new Date(health.lastFailure).toLocaleTimeString()} />}
          <Row label="Session uptime" value={uptimeStr} />
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Environment Variables</p>
          <div className="flex flex-wrap gap-2">
            <StatusBadge ok={hasSupabaseUrl} label={`Supabase URL: ${hasSupabaseUrl ? 'configured' : 'missing'}`} />
            <StatusBadge ok={hasSupabaseKey} label={`Supabase key: ${hasSupabaseKey ? 'configured' : 'missing'}`} />
            <StatusBadge ok={hasMapKey} label={`Maps key: ${hasMapKey ? 'configured' : 'missing'}`} />
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
              Gemini key: server-side
            </span>
          </div>
        </div>
      </Section>

      <Section title="Authentication" icon={Key}>
        <div className="space-y-1">
          <Row label="Provider" value="Supabase" />
          <Row label="AuthProvider mounted" value={authState.authProviderMounted ? 'yes' : 'no'} color={authState.authProviderMounted ? 'text-emerald-500' : 'text-red-500'} />
          <Row label="Auth loading" value={String(loading)} color={loading ? 'text-amber-500' : 'text-emerald-500'} />
          <Row label="Session present" value={authState.sessionPresent ? 'yes' : 'no'} color={authState.sessionPresent ? 'text-emerald-500' : 'text-red-500'} />
          <Row label="User present" value={authState.userPresent ? 'yes' : 'no'} color={authState.userPresent ? 'text-emerald-500' : 'text-red-500'} />
          <Row label="User ID present" value={user?.id ? 'yes' : 'no'} />
          <Row label="Last auth event" value={authState.lastAuthEvent} />
          <Row label="Event time" value={authState.lastAuthEventTime} />
          <Row label="Storage entry" value={authState.supabaseStorageExists ? 'exists' : 'gone'} color={authState.supabaseStorageExists ? 'text-emerald-500' : 'text-red-500'} />
          <Row label="Sign-out called" value={authState.signOutCalled ? 'yes' : 'no'} color={authState.signOutCalled ? 'text-amber-500' : 'text-slate-400'} />
          {authState.signOutCaller && <Row label="Sign-out caller" value={authState.signOutCaller} />}
        </div>
        {authCheck && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
            <Row label="API auth check" value={authCheck} color={authCheck.includes('Authenticated') ? 'text-emerald-500' : 'text-amber-500'} />
          </div>
        )}
      </Section>

      <Section title="API Requests" icon={Activity}>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(['all', 'failed', '4xx', '5xx', 'network'] as const).map(f => (
            <button
              key={f}
              onClick={() => setRequestFilter(f)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all min-h-[32px] ${
                requestFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
              }`}
            >
              {f} {f === 'failed' ? `(${debug.requestLog.filter(r => !r.success).length})` : ''}
            </button>
          ))}
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filteredRequests.length === 0 && (
            <p className="text-[11px] text-slate-400 italic py-2">No requests recorded yet.</p>
          )}
          {filteredRequests.map(r => (
            <div key={r.id} className={`flex items-center gap-2 text-[10px] font-mono py-1 px-2 rounded ${
              !r.success ? 'bg-red-50 dark:bg-red-500/5' : 'bg-slate-50 dark:bg-white/[0.02]'
            }`}>
              <span className={`font-black min-w-[36px] ${!r.success ? 'text-red-500' : 'text-emerald-500'}`}>
                {r.status || 'ERR'}
              </span>
              <span className="text-slate-500 font-bold">{r.method}</span>
              <span className="flex-1 truncate text-slate-700 dark:text-slate-300">{r.path}</span>
              {r.duration !== null && <span className="text-slate-400">{r.duration}ms</span>}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Browser and Device" icon={Smartphone}>
        <div className="space-y-1">
          <Row label="User agent" value={uaSummary} />
          <Row label="Viewport" value={`${window.innerWidth}x${window.innerHeight}`} />
          <Row label="Pixel ratio" value={String(window.devicePixelRatio)} />
          <Row label="Touch support" value={hasTouch ? 'yes' : 'no'} />
          <Row label="Device type" value={isMobile ? 'mobile' : 'desktop'} />
          <Row label="Online" value={navigator.onLine ? 'yes' : 'no'} color={navigator.onLine ? 'text-emerald-500' : 'text-red-500'} />
          <Row label="Language" value={navigator.language} />
          <Row label="Timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
          <Row label="Local time" value={new Date().toLocaleString()} />
          <Row label="Storage available" value={(() => { try { localStorage.setItem('__test', '1'); localStorage.removeItem('__test'); return 'yes'; } catch { return 'no'; } })()} />
          <Row label="Camera API" value={hasMediaDevices ? 'available' : 'unavailable'} color={hasMediaDevices ? 'text-emerald-500' : 'text-amber-500'} />
          <Row label="BarcodeDetector" value={hasBarcodeDetector ? 'available' : 'unavailable'} color={hasBarcodeDetector ? 'text-emerald-500' : 'text-slate-400'} />
          <Row label="Service worker" value={'serviceWorker' in navigator ? 'supported' : 'unsupported'} />
        </div>
      </Section>

      <Section title="Camera and Permissions" icon={Camera}>
        <div className="space-y-1">
          <Row label="Secure context" value={window.isSecureContext ? 'yes' : 'no'} color={window.isSecureContext ? 'text-emerald-500' : 'text-amber-500'} />
          <Row label="mediaDevices" value={hasMediaDevices ? 'yes' : 'no'} color={hasMediaDevices ? 'text-emerald-500' : 'text-red-500'} />
          <Row label="getUserMedia" value={hasGetUserMedia ? 'yes' : 'no'} color={hasGetUserMedia ? 'text-emerald-500' : 'text-red-500'} />
          <Row label="Last permission" value={debugCameraState.lastPermissionResult} />
          <Row label="Last camera error" value={debugCameraState.lastCameraError} />
          <Row label="Scanner started" value={debugCameraState.lastScannerStartTime} />
          <Row label="Scanner closed" value={debugCameraState.lastScannerCloseTime} />
          <Row label="Stream active" value={debugCameraState.streamActive ? 'yes' : 'no'} color={debugCameraState.streamActive ? 'text-emerald-500' : 'text-slate-400'} />
          <Row label="Barcode mode" value={debugCameraState.barcodeDetectorMode} />
          <Row label="Last barcode" value={debugCameraState.lastDetectedBarcode} />
        </div>
      </Section>

      <Section title="Recent Errors" icon={AlertTriangle}>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {debug.errorLog.length === 0 && (
            <p className="text-[11px] text-slate-400 italic py-2">No errors recorded.</p>
          )}
          {debug.errorLog.map(e => (
            <div key={e.id} className="flex items-start gap-2 text-[10px] py-1.5 px-2 rounded bg-red-50 dark:bg-red-500/5">
              <span className="text-red-400 flex-shrink-0 font-mono">{new Date(e.timestamp).toLocaleTimeString()}</span>
              <span className="text-red-600 dark:text-red-400 font-black uppercase min-w-[48px]">{e.category}</span>
              <span className="text-slate-700 dark:text-slate-300 flex-1 break-all">{e.message}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Diagnostic Actions" icon={Bug}>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={runHealthCheck} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black py-3 rounded-xl transition-all min-h-[48px]">
            <RefreshCw size={14} /> Run Health Check
          </button>
          <button onClick={testApiConnection} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black py-3 rounded-xl transition-all min-h-[48px]">
            <Wifi size={14} /> Test API Connection
          </button>
          <button onClick={refreshAuthStatus} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black py-3 rounded-xl transition-all min-h-[48px]">
            <Key size={14} /> Refresh Auth Status
          </button>
          <button onClick={debug.clearLogs} className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-black py-3 rounded-xl transition-all min-h-[48px] dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15">
            <Trash2 size={14} /> Clear Debug Log
          </button>
          <button onClick={copySummary} className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-black py-3 rounded-xl transition-all min-h-[48px] dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15">
            <Copy size={14} /> {copied ? 'Copied!' : 'Copy Summary'}
          </button>
          <button onClick={downloadReport} className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-black py-3 rounded-xl transition-all min-h-[48px] dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15">
            <Download size={14} /> Download Report
          </button>
        </div>
      </Section>
    </div>
  );
}
