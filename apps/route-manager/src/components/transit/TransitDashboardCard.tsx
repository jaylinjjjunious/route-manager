import { Bus, Star, Wifi, WifiOff, ArrowRight } from 'lucide-react';
import { useTransitStatus } from '../../hooks/useTransitStatus';
import { useFavoriteStops } from '../../hooks/useFavoriteStops';
import { isTransitApiEnabled } from '../../services/transit';

interface TransitDashboardCardProps {
  onOpenTools: () => void;
}

/** Dashboard quick-access card for the official Transit API integration. */
export function TransitDashboardCard({ onOpenTools }: TransitDashboardCardProps) {
  const { status, loaded } = useTransitStatus();
  const { favorites } = useFavoriteStops();

  if (!isTransitApiEnabled()) return null;

  const configured = loaded && status?.configured;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-4 dark:border-emerald-500/20 dark:bg-[#17181b] flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
        <Bus size={20} className="text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Live Transit</h3>
          {configured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
              <Wifi size={9} /> Live
            </span>
          ) : (
            loaded && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase text-amber-600 dark:text-amber-400">
                <WifiOff size={9} /> Not configured
              </span>
            )
          )}
        </div>
        <p className="mt-0.5 truncate text-[10px] font-bold text-slate-400">
          {configured
            ? `${status.rateLimit.remaining} API calls left this minute · ${favorites.length} saved stop${favorites.length === 1 ? '' : 's'}`
            : 'Nearby stops, live arrivals, and trip planning'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {favorites.length > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-black text-amber-600 dark:text-amber-400">
            <Star size={9} className="fill-amber-400 text-amber-400" /> {favorites.length}
          </span>
        )}
        <button
          onClick={onOpenTools}
          className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-black text-white transition hover:bg-emerald-500"
        >
          Transit <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}
