import { useState } from 'react';
import { Star, Trash2, ChevronRight, MapPin, Navigation } from 'lucide-react';
import type { TransitStop, FavoriteTransitStop } from '../../types';
import { useFavoriteStops } from '../../hooks/useFavoriteStops';
import { StopArrivalsSheet } from './StopArrivalsSheet';
import { TransitPlannerSheet } from './TransitPlannerSheet';
import type { Coordinates } from '../../types';
import type { Job } from '../../types';

interface FavoritesPanelProps {
  hubCoord: Coordinates;
  jobs: Job[];
}

function toStop(favorite: FavoriteTransitStop): TransitStop {
  return {
    stopId: favorite.stopId,
    stopName: favorite.customName || favorite.stopName,
    latitude: favorite.latitude,
    longitude: favorite.longitude,
  };
}

export function FavoritesPanel({ hubCoord, jobs }: FavoritesPanelProps) {
  const { favorites, removeStop } = useFavoriteStops();
  const [arrivalsStop, setArrivalsStop] = useState<TransitStop | null>(null);
  const [arrivalsOpen, setArrivalsOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerStop, setPlannerStop] = useState<TransitStop | null>(null);

  if (favorites.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-5 dark:border-amber-500/20 dark:bg-[#17181b] space-y-3">
      <div className="flex items-center gap-2">
        <Star size={16} className="fill-amber-400 text-amber-400" />
        <h3 className="text-sm font-black text-slate-900 dark:text-white">Favorite Stops</h3>
      </div>
      <div className="space-y-2">
        {favorites.map((favorite) => {
          const stop = toStop(favorite);
          return (
            <div
              key={favorite.id}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5"
            >
              <MapPin size={15} className="shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-slate-900 dark:text-white">{stop.stopName}</p>
              </div>
              <button
                onClick={() => {
                  setPlannerStop(stop);
                  setPlannerOpen(true);
                }}
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black text-blue-600 transition hover:bg-blue-500/10 dark:text-blue-400"
              >
                <Navigation size={11} /> Plan
              </button>
              <button
                onClick={() => {
                  setArrivalsStop(stop);
                  setArrivalsOpen(true);
                }}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-emerald-500"
              >
                Arrivals <ChevronRight size={11} />
              </button>
              <button
                onClick={() => removeStop(favorite.stopId)}
                className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:text-rose-500"
                title="Remove favorite"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <StopArrivalsSheet
        stop={arrivalsStop}
        isOpen={arrivalsOpen}
        onClose={() => setArrivalsOpen(false)}
        onPlanFromStop={(stop) => {
          setArrivalsOpen(false);
          setPlannerStop(stop);
          setPlannerOpen(true);
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
