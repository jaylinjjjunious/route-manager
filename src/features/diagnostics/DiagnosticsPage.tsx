import { useEffect, useState } from 'react';
import { apiFetch, serverUrl } from '../../services/apiOrigin';
import { ToolPageHeader } from '../../components/aio/ToolPageHeader';
import { useAuth } from '../../auth/AuthProvider';
import { useDebug } from '../../debug/useDebug';
import { buildDiagnosticReport } from '../../debug/debugStore';
import { safeDiagnosticText } from '../../debug/sanitizeDiagnostics';
import type { ProbationCheckInState } from '../probation/useProbationCheckIn';

const tabs = ['API', 'Sync', 'Auth', 'Errors', 'System'] as const;
type Tab = typeof tabs[number];

export default function DiagnosticsPage({ onBack, probation }: { onBack: () => void; probation: ProbationCheckInState }) {
  const { user, session, isAdmin } = useAuth();
  const { requestLog, errorLog, clearLogs } = useDebug();
  const [tab, setTab] = useState<Tab>('API');
  const [notice, setNotice] = useState('');
  const [build, setBuild] = useState({ commit: 'Loading', version: 'Unknown' });
  const [runtime, setRuntime] = useState({ serviceWorker: 'Checking', caches: 'Checking' });
  const [online, setOnline] = useState(navigator.onLine);
  const [retrying, setRetrying] = useState(false);
  const allowed = isAdmin || import.meta.env.DEV;

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    apiFetch('/api/build-info').then(async r => {
      if (!r.ok) throw new Error('Build information unavailable');
      const data = await r.json();
      if (active) setBuild({ commit: safeDiagnosticText(String(data.commitSha || 'Unknown')), version: safeDiagnosticText(String(data.version || 'Unknown')) });
    }).catch(() => { if (active) setBuild({ commit: 'Unavailable', version: 'Unknown' }); });
    async function inspect() {
      let serviceWorker = 'Unsupported';
      let cacheCount = 'Unsupported';
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          serviceWorker = `${registration ? 'Registered' : 'Unregistered'}; controlling page: ${navigator.serviceWorker.controller ? 'Yes' : 'No'}`;
        }
      } catch { serviceWorker = 'Unavailable'; }
      try { if ('caches' in window) cacheCount = `${(await caches.keys()).length} caches`; } catch { cacheCount = 'Unavailable'; }
      if (active) setRuntime({ serviceWorker, caches: cacheCount });
    }
    void inspect();
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { active = false; window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, [allowed]);

  const auth = { signedIn: Boolean(session), user: user ? `${user.id.slice(0, 6)}…` : 'None', admin: isAdmin, tokenPresent: Boolean(session?.access_token), expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'Unknown' };
  const sync = { ...probation.syncStatus, lastError: safeDiagnosticText(probation.syncStatus.lastError || ''), pendingRecords: probation.pendingRecordCount };
  const system = { frontendCommit: import.meta.env.VITE_FRONTEND_COMMIT || 'Unknown', serverCommit: build.commit, version: build.version, ...runtime, origin: window.location.origin, online, device: probation.device, browser: navigator.userAgent, standalone: window.matchMedia?.('(display-mode: standalone)').matches ?? false };
  const probationRequests = requestLog.filter(r => r.path.endsWith('/api/probation-check-ins'));
  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ ...buildDiagnosticReport(), system, auth, sync, probationRequests }, null, 2));
      setNotice('Diagnostics copied.');
    } catch { setNotice('Clipboard unavailable. Select and copy the report below.'); }
  }
  async function retry() {
    setRetrying(true);
    try { await probation.syncToServer(); } finally { setRetrying(false); }
  }
  const row = (label: string, value: unknown) => <div key={label} className="border-b border-[var(--color-aio-line)] py-2"><dt className="text-xs font-bold">{label}</dt><dd className="text-sm break-all">{String(value ?? 'Unknown')}</dd></div>;

  return <div className="space-y-4">
    <ToolPageHeader title="Diagnostics Console" subtitle="API and account sync diagnostics" onBack={onBack} />
    {!allowed ? <p>Admin access required.</p> : <>
      <div role="tablist" aria-label="Diagnostics sections" className="flex flex-wrap gap-2">
        {tabs.map(name => <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)} className={`rounded-lg px-3 py-2 text-sm font-bold ${tab === name ? 'bg-[var(--color-aio-primary)] text-white' : 'bg-[var(--color-aio-surface)]'}`}>{name}</button>)}
      </div>
      <div role="tabpanel" aria-label={tab} className="aio-card p-4 space-y-3">
        {tab === 'API' && <><p className="text-sm">Recent requests (up to 50). No headers or request bodies are retained.</p>{requestLog.length === 0 && <p>No requests recorded in this session.</p>}{requestLog.map(r => <article key={r.id} className="border-b border-[var(--color-aio-line)] pb-3 text-sm break-all"><p className="font-bold">{r.method} {r.path}</p><p>{r.status ?? 'Pending / network failure'} · {r.contentType || 'No response type'} · {r.responseKind || 'Unknown'} · Auth: {r.authRequired ? 'Yes' : 'No'} · {r.duration ?? '—'} ms</p><p>{new Date(r.startTime).toISOString()} · {r.success ? 'Success' : r.errorCategory || 'Pending'}</p></article>)}</>}
        {tab === 'Sync' && <><dl>{Object.entries(sync).map(([k,v]) => row(k,v))}{row('API origin', new URL(serverUrl('/api/health'), window.location.href).origin)}{['GET', 'POST'].map(method => { const r = probationRequests.find(item => item.method === method); return row(`Last ${method}`, r ? `${r.path} · ${r.status ?? 'Pending / network failure'} · ${r.contentType || 'Unknown'} · Auth: ${r.authRequired ? 'Yes' : 'No'}` : 'No attempt recorded'); })}</dl><button disabled={retrying} onClick={() => void retry()} className="rounded-lg px-3 py-2 bg-[var(--color-aio-primary)] text-white">{retrying ? 'Retrying…' : 'Retry account sync'}</button></>}
        {tab === 'Auth' && <dl>{Object.entries(auth).map(([k,v]) => row(k,v))}</dl>}
        {tab === 'Errors' && <>{errorLog.length === 0 && <p>No errors recorded.</p>}{errorLog.map(e => <article key={e.id} className="border-b border-[var(--color-aio-line)] py-2 text-sm break-all"><p>{e.timestamp} · {e.source} · {e.category} · {e.statusCode}</p><p>{e.message}</p></article>)}</>}
        {tab === 'System' && <dl>{Object.entries(system).map(([k,v]) => row(k,v))}</dl>}
      </div>
      <div className="flex flex-wrap gap-2"><button onClick={() => void copy()} className="rounded-lg px-3 py-2 bg-[var(--color-aio-primary)] text-white">Copy Diagnostics</button><button onClick={() => { clearLogs(); setNotice('Diagnostics history cleared.'); }} className="rounded-lg px-3 py-2 bg-[var(--color-aio-surface)]">Clear Logs</button></div>
      <p role="status">{notice}</p>
      {notice.startsWith('Clipboard unavailable') && <textarea aria-label="Diagnostic report" readOnly value={JSON.stringify({ ...buildDiagnosticReport(), system, auth, sync, probationRequests }, null, 2)} className="w-full h-48 text-xs" />}
    </>}
  </div>;
}
