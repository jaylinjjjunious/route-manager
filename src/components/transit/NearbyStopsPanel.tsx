import { useState } from 'react';
import { MapPin, RefreshCw, Navigation, Star, ChevronRight, Loader2, AlertTriangle, Bus, Crosshair } from 'lucide-react';
import type { Coordinates, TransitStop, Job } from '../../types';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { useNearbyTransitStops } from '../../hooks/useNearbyTransitStops';
import { useFavoriteStops } from '../../hooks/useFavoriteStops';
import { formatDistanceMeters, formatFreshnessLabel } from '../../services/transit/format';
import { StopArrivalsSheet } from './StopArrivalsSheet';
import { TransitPlannerSheet } from './TransitPlannerSheet';

interface NearbyStopsPanelProps {
  hubCoord: Coordinates;
  jobs: Job[];
}

function LocationLabel({ coords }: { coords: { latitude: number; longitude: number } | null }) {
  if (!coords) return <span className="text-slate-400">No location</span>;
  return (
    <span className="truncate">
      {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
    </span>
  );
}

export function NearbyStopsPanel({ hubCoord, jobs }: NearbyStopsPanelProps) {
  const location = useCurrentLocation();
  const [arrivalsStop, setArrivalsStop] = useState<TransitStop | null>(null);
  const [arrivalsOpen, setArrivalsOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerStop, setPlannerStop] = useState<TransitStop | null>(null);

  const coords = location.coords
    ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
    : { latitude: hubCoord.lat, longitude: hubCoord.lng };

  const nearby = useNearbyTransitStops(coords, { radiusMeters: 1500, limit: 10 });
  const { isFavorite, addStop, removeStop } = useFavoriteStops();

  const openArrivals = (stop: TransitStop) => {
    setArrivalsStop(stop);
    setArrivalsOpen(true);
  };

  const openPlanner = (fromStop: TransitStop | null = null) => {
    setPlannerStop(fromStop);
    setPlannerOpen(true);
  };

  const locate = async () => {
    await location.locate();
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-5 dark:border-emerald-500/20 dark:bg-[#17181b] space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-3">
          <Bus size={22} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Nearby Stops & Live Transit</h3>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Live arrivals, trip planning, favorites, and service alerts for the official Transit API.
          </p>
        </div>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <MapPin size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="truncate">
            {location.status === 'granted' ? 'Current location · ' : ''}
            <LocationLabel coords={location.coords ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : { latitude: hubCoord.lat, longitude: hubCoord.lng }} />
          </span>
        </div>
        <button
          onClick={() => void locate()}
          disabled={location.status === 'locating'}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-black text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {location.status === 'locating' ? <Loader2 size={12} className="animate-spin" /> : <Crosshair size={12} />}
          {location.status === 'granted' ? 'Update location' : 'Find stops near me'}
        </button>
      </div>

      {/* Status line */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
          {nearby.freshness ? <span className="text-emerald-600 dark:text-emerald-400">{formatFreshnessLabel(nearby.freshness)}</span> : <span>—</span>}
          {nearby.status === 'stale' && <span className="text-amber-500">stale</span>}
        </div>
        <button
          onClick={() => void nearby.refresh()}
          disabled={nearby.status === 'loading'}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-400"
        >
          <RefreshCw size={11} className={nearby.status === 'loading' ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stops */}
      {nearby.status === 'loading' && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-10 dark:border-white/10">
          <Loader2 size={20} className="animate-spin text-emerald-500" />
          <p className="text-xs font-bold text-slate-400">Loading nearby stops…</p>
        </div>
      )}

      {nearby.status === 'error' && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
          <AlertTriangle size={18} className="text-amber-500" />
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{nearby.error || 'Could not load nearby stops.'}</p>
          <button onClick={() => void nearby.refresh()} className="text-[11px] font-black text-emerald-700 dark:text-emerald-400">
            Retry
          </button>
        </div>
      )}

      {nearby.status !== 'loading' && nearby.status !== 'error' && nearby.stops.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-white/10">
          <MapPin size={20} className="text-slate-400" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No stops found within reach.</p>
          <p className="text-[10px] text-slate-400">Try a wider area or a different location.</p>
        </div>
      )}

      {nearby.stops.length > 0 && (
        <div className="space-y-2">
          {nearby.stops.map((stop) => {
            const saved = isFavorite(stop.stopId);
            return (
              <div
                key={stop.stopId}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/5"
              >
                <button
                  onClick={() => (saved ? removeStop(stop.stopId) : addStop(stop))}
                  className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:text-amber-500"
                  title={saved ? 'Remove favorite' : 'Save favorite'}
                >
                  <Star size={15} className={saved ? 'fill-amber-400 text-amber-400' : ''} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-slate-900 dark:text-white">{stop.stopName}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400">
                      {stop.distanceMeters !== undefined ? formatDistanceMeters(stop.distanceMeters) : ''}
                    </span>
                    {stop.routes && stop.routes.length > 0 && (
                      <span className="flex gap-1">
                        {stop.routes.slice(0, 4).map((route) => (
                          <span
                            key={route.routeId}
                            className="rounded px-1.5 py-0.5 text-[9px] font-black text-white"
                            style={{ backgroundColor: route.color || '#0f766e' }}
                          >
                            {route.shortName}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openArrivals(stop)}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-emerald-500"
                >
                  Arrivals <ChevronRight size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="pt-1">
        <button
          onClick={() => openPlanner()}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-[11px] font-black text-white transition hover:bg-blue-500"
        >
          <Navigation size={13} />
          Plan a Transit Trip
        </button>
      </div>

      <StopArrivalsSheet
        stop={arrivalsStop}
        isOpen={arrivalsOpen}
        onClose={() => setArrivalsOpen(false)}
        onPlanFromStop={(stop) => {
          setArrivalsOpen(false);
          openPlanner(stop);
        }}
      />
      <TransitPlannerSheet
        isOpen={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        hubCoord={hubCoord}
        jobs={jobs}
        fromStop={plannerStop}
      />
    </div>
  );
}
