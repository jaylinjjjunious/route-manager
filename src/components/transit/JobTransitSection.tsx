import { Bus, Navigation, Loader2 } from 'lucide-react';
import type { Job } from '../../types';
import { useTransitTrip } from '../../hooks/useTransitTrip';
import { TransitTripCard } from '../TransitTripCard';

interface JobTransitSectionProps {
  job: Job;
  origin: { latitude: number; longitude: number };
}

/** Transit-to-job planning inside the job detail modal. Never mutates job state. */
export function JobTransitSection({ job, origin }: JobTransitSectionProps) {
  const destination = { latitude: job.coordinates.lat, longitude: job.coordinates.lng };
  const transit = useTransitTrip(origin, destination, job);

  const canPlan = transit.status === 'idle' || transit.status === 'error' || transit.status === 'stale';

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <Bus size={14} className="text-emerald-400" />
        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Transit to this job</h4>
      </div>
      {canPlan ? (
        <button
          onClick={() => void transit.fetchTrip(origin, destination, job)}
          disabled={transit.status === 'loading'}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-2 text-[11px] font-black text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {transit.status === 'loading' ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Navigation size={13} />
          )}
          {transit.status === 'stale' ? 'Refresh Transit Route' : 'Plan Transit Route'}
        </button>
      ) : (
        <TransitTripCard transit={transit} currentJob={job} onRefresh={() => void transit.refreshTrip()} />
      )}
    </div>
  );
}
