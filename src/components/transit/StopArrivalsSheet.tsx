import { createPortal } from 'react-dom';
import { X, RefreshCw, MapPin, Navigation, Clock, Wifi, AlertTriangle, Bus } from 'lucide-react';
import type { TransitStop, TransitArrival } from '../../types';
import { useStopArrivals } from '../../hooks/useStopArrivals';
import { formatMinutesUntil, formatClockTime, formatFreshnessLabel } from '../../services/transit/format';

interface StopArrivalsSheetProps {
  stop: TransitStop | null;
  isOpen: boolean;
  onClose: () => void;
  onPlanFromStop?: (stop: TransitStop) => void;
}

function ArrivalRow({ arrival }: { arrival: TransitArrival }) {
  const cancelled = arrival.isCancelled;
  const realtime = arrival.isRealTime;
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
      cancelled
        ? 'border-red-500/20 bg-red-500/5'
        : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'
    }`}>
      <div className="flex h-9 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: arrival.route.color || '#0f766e' }}>
        <span className="text-xs font-black leading-none">{arrival.route.shortName || '?'}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-black text-slate-900 dark:text-white ${cancelled ? 'line-through opacity-60' : ''}`}>
          {arrival.headsign || 'Transit'}
        </p>
        <p className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
          <Clock size={10} />
          {formatClockTime(arrival.departureTime)}
          {realtime && !cancelled && (
            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
              <Wifi size={10} /> live
            </span>
          )}
        </p>
      </div>
      {cancelled ? (
        <span className="shrink-0 text-[10px] font-black uppercase text-red-500">Cancelled</span>
      ) : (
        <span className="shrink-0 text-xs font-black text-slate-900 dark:text-white">
          {formatMinutesUntil(arrival.departureTime)}
        </span>
      )}
    </div>
  );
}

export function StopArrivalsSheet({ stop, isOpen, onClose, onPlanFromStop }: StopArrivalsSheetProps) {
  const { arrivals, status, error, freshness, refresh } = useStopArrivals(isOpen ? stop : null);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-[#17181b] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 p-4 dark:border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                <MapPin size={17} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">{stop?.stopName || 'Stop'}</h3>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {stop ? `${stop.latitude.toFixed(4)}, ${stop.longitude.toFixed(4)}` : ''}
                  {freshness ? ` · ${formatFreshnessLabel(freshness)}` : ''}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
              <X size={16} />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void refresh()}
              disabled={status === 'loading'}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <RefreshCw size={12} className={status === 'loading' ? 'animate-spin' : ''} />
              Refresh
            </button>
            {onPlanFromStop && stop && (
              <button
                onClick={() => onPlanFromStop(stop)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-700 hover:bg-slate-300 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
              >
                <Navigation size={12} />
                Plan from here
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[60dvh] space-y-2 overflow-y-auto p-4">
          {status === 'idle' && (
            <p className="py-8 text-center text-xs font-bold text-slate-400">Select a stop to see live arrivals.</p>
          )}

          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <p className="text-xs font-bold text-slate-400">Loading arrivals…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
              <AlertTriangle size={20} className="text-amber-500" />
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{error || 'Could not load arrivals.'}</p>
              <button onClick={() => void refresh()} className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                Retry
              </button>
            </div>
          )}

          {status !== 'loading' && status !== 'error' && arrivals.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-white/10">
              <Bus size={20} className="text-slate-400" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No upcoming arrivals at this stop.</p>
            </div>
          )}

          {status !== 'loading' && status !== 'error' && arrivals.length > 0 && (
            <>
              {status === 'stale' && (
                <p className="text-[10px] font-bold text-amber-500">Arrivals may be outdated — tap Refresh.</p>
              )}
              {arrivals.map((arrival) => (
                <ArrivalRow key={arrival.tripId} arrival={arrival} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
