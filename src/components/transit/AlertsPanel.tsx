import { AlertTriangle, Info, ShieldAlert, RefreshCw, Loader2 } from 'lucide-react';
import type { TransitAlert } from '../../types';
import { useTransitAlerts } from '../../hooks/useTransitAlerts';
import { formatFreshnessLabel } from '../../services/transit/format';

interface AlertsPanelProps {
  location: { latitude: number; longitude: number };
}

function severityStyle(severity: TransitAlert['severity']) {
  switch (severity) {
    case 'critical':
      return { badge: 'bg-red-500/15 text-red-600 dark:text-red-400', icon: <ShieldAlert size={13} className="text-red-500" />, border: 'border-red-500/30' };
    case 'warning':
      return { badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', icon: <AlertTriangle size={13} className="text-amber-500" />, border: 'border-amber-500/30' };
    default:
      return { badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', icon: <Info size={13} className="text-blue-500" />, border: 'border-blue-500/30' };
  }
}

export function AlertsPanel({ location }: AlertsPanelProps) {
  const { alerts, status, error, freshness, refresh } = useTransitAlerts(location);

  if (status === 'loading' && alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#17181b]">
        <Loader2 size={14} className="animate-spin text-emerald-500" />
        <p className="text-[11px] font-bold text-slate-400">Checking service alerts…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#17181b] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Service Alerts</h3>
          {alerts.length > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-600 dark:text-amber-400">
              {alerts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {freshness && <span className="text-[10px] font-bold text-slate-400">{formatFreshnessLabel(freshness)}</span>}
          <button
            onClick={() => void refresh()}
            disabled={status === 'loading'}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600 disabled:opacity-50 dark:hover:bg-white/10"
            title="Refresh alerts"
          >
            <RefreshCw size={13} className={status === 'loading' ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{error}</p>
          <button onClick={() => void refresh()} className="mt-1 text-[10px] font-black text-emerald-700 dark:text-emerald-400">
            Retry
          </button>
        </div>
      )}

      {!error && alerts.length === 0 && (
        <p className="text-[11px] font-bold text-slate-400">No active service alerts in this area.</p>
      )}

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const style = severityStyle(alert.severity);
            return (
              <div key={alert.id} className={`rounded-xl border bg-white p-3 dark:bg-white/5 ${style.border}`}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">{style.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-[11px] font-black text-slate-900 dark:text-white">{alert.title}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${style.badge}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{alert.description}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {alert.effect && (
                        <span className="rounded bg-slate-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-500">
                          {alert.effect.replace(/_/g, ' ')}
                        </span>
                      )}
                      {alert.affectedRoutes && alert.affectedRoutes.length > 0 && (
                        <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-black text-blue-500">
                          {alert.affectedRoutes.length} route{alert.affectedRoutes.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {alert.affectedStops && alert.affectedStops.length > 0 && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black text-amber-600">
                          {alert.affectedStops.length} stop{alert.affectedStops.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
