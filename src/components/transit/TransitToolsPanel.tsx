import { Bus, Info } from 'lucide-react';
import type { Coordinates, Job } from '../../types';
import { isTransitApiEnabled } from '../../services/transit';
import { NearbyStopsPanel } from './NearbyStopsPanel';
import { FavoritesPanel } from './FavoritesPanel';
import { AlertsPanel } from './AlertsPanel';

interface TransitToolsPanelProps {
  hubCoord: Coordinates;
  jobs: Job[];
  location?: { latitude: number; longitude: number } | null;
}

/** Full Transit section for the Tools tab: nearby stops, favorites, and alerts. */
export function TransitToolsPanel({ hubCoord, jobs, location }: TransitToolsPanelProps) {
  if (!isTransitApiEnabled()) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#17181b] space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-slate-500/10 p-3">
            <Bus size={22} className="text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Live Transit (Official API)</h3>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Live stops, arrivals, alerts, and trip planning are provided by the official Transit API.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
          <Info size={14} className="mt-0.5 shrink-0 text-blue-500" />
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
            Live Transit is not enabled in this build. Set <code className="font-mono">VITE_TRANSIT_PROVIDER=transit</code> and rebuild to use it. Standard bus trip planning still works below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <NearbyStopsPanel hubCoord={hubCoord} jobs={jobs} />
      <FavoritesPanel hubCoord={hubCoord} jobs={jobs} />
      <AlertsPanel location={location ?? { latitude: hubCoord.lat, longitude: hubCoord.lng }} />
    </div>
  );
}
