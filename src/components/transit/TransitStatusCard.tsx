import { useState } from 'react';
import { RefreshCw, Trash2, CheckCircle2, XCircle, Loader2, Bus } from 'lucide-react';
import { useTransitStatus } from '../../hooks/useTransitStatus';

/** Settings diagnostic card for the official Transit API backend integration. */
export function TransitStatusCard() {
  const { status, supported, loaded, error, refresh, clearCache } = useTransitStatus();
  const [clearing, setClearing] = useState(false);

  const doClear = async () => {
    setClearing(true);
    try {
      await clearCache();
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
          <Bus size={14} className="text-emerald-500" /> Official Transit API
        </h3>
        <button
          onClick={() => void refresh()}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
        >
          <RefreshCw size={11} className={loaded && !status ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {!supported && loaded && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
            Official Transit API is not enabled in this build.
          </p>
          <p className="mt-1 text-[10px] text-amber-500/80">
            Set <code className="font-mono">VITE_TRANSIT_PROVIDER=transit</code> and rebuild to enable live stops, arrivals, alerts, and trip planning.
          </p>
        </div>
      )}

      {!loaded && (
        <div className="flex items-center gap-2 py-2 text-[11px] font-bold text-slate-400">
          <Loader2 size={12} className="animate-spin text-emerald-500" /> Checking server status…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <XCircle size={14} className="text-red-400" />
          <p className="text-[11px] font-bold text-red-400">{error}</p>
        </div>
      )}

      {status && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {status.configured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={10} /> CONFIGURED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
                <XCircle size={10} /> NOT CONFIGURED
              </span>
            )}
            {status.configured && (
              <span className="text-[10px] font-bold text-slate-400">
                {status.networks.length > 0 ? status.networks.join(' · ') : 'no networks loaded'}
              </span>
            )}
          </div>

          {status.configured && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Rate Limit</p>
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                  {status.rateLimit.remaining}
                  <span className="text-[10px] font-bold text-slate-400"> / {status.rateLimit.limit} per min</span>
                </p>
                <p className="text-[9px] font-bold text-slate-400">{status.rateLimit.used} used</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Cache</p>
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                  {status.cache.size}
                  <span className="text-[10px] font-bold text-slate-400"> / {status.cache.capacity} entries</span>
                </p>
                <p className="text-[9px] font-bold text-slate-400">
                  Nearby {Math.round(status.ttlSeconds.nearby / 60)}m · Arrivals {status.ttlSeconds.arrivals}s
                </p>
              </div>
            </div>
          )}

          {status.lastError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-red-400">Last Error</p>
              <p className="mt-0.5 truncate text-[10px] font-mono text-red-300">{status.lastError.code} — {status.lastError.message}</p>
            </div>
          )}

          {status.configured && (
            <button
              onClick={() => void doClear()}
              disabled={clearing}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              {clearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Clear Transit Cache
            </button>
          )}
        </div>
      )}
    </div>
  );
}
