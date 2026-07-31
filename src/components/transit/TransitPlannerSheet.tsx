import { createPortal } from 'react-dom';
import { useMemo, useState } from 'react';
import { X, Navigation, MapPin, Home, Building2, Search, Loader2 } from 'lucide-react';
import type { Job, Coordinates, TransitStop } from '../../types';
import { useTransitTrip } from '../../hooks/useTransitTrip';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { resolveCoordinates } from '../../utils/routeUtils';
import { TransitTripCard } from '../TransitTripCard';

interface TransitPlannerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  hubCoord: Coordinates;
  jobs: Job[];
  fromStop?: TransitStop | null;
}

type DestinationKind = 'job' | 'address';

export function TransitPlannerSheet({
  isOpen,
  onClose,
  hubCoord,
  jobs,
  fromStop,
}: TransitPlannerSheetProps) {
  const location = useCurrentLocation();
  const [destinationKind, setDestinationKind] = useState<DestinationKind>('job');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [address, setAddress] = useState('');

  const origin: { latitude: number; longitude: number } | null = useMemo(() => {
    if (fromStop) return { latitude: fromStop.latitude, longitude: fromStop.longitude };
    if (location.coords) return { latitude: location.coords.latitude, longitude: location.coords.longitude };
    return { latitude: hubCoord.lat, longitude: hubCoord.lng };
  }, [fromStop, location.coords, hubCoord]);

  const destination = useMemo(() => {
    if (destinationKind === 'job') {
      const job = jobs.find((j) => j.id === selectedJobId);
      if (job) return { latitude: job.coordinates.lat, longitude: job.coordinates.lng };
      return null;
    }
    if (destinationKind === 'address') {
      if (address.trim().length === 0) return null;
      const resolved = resolveCoordinates(address);
      return { latitude: resolved.lat, longitude: resolved.lng };
    }
    return null;
  }, [destinationKind, selectedJobId, address, jobs]);

  const transit = useTransitTrip(origin, destination);

  const plan = async () => {
    if (!origin || !destination) return;
    await transit.fetchTrip(origin, destination);
  };

  if (!isOpen) return null;

  const originLabel = fromStop
    ? fromStop.stopName
    : location.coords
      ? 'Current location'
      : `Hub (${hubCoord.lat.toFixed(4)}, ${hubCoord.lng.toFixed(4)})`;

  const activeJobs = jobs.filter((j) => j.coordinates.lat && j.coordinates.lng);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-[#17181b] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 p-4 dark:border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10">
                <Navigation size={17} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Plan a Transit Trip</h3>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="max-h-[70dvh] space-y-4 overflow-y-auto p-4">
          {/* From */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">From</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                {fromStop ? <MapPin size={14} className="shrink-0 text-emerald-500" /> : location.coords ? <Navigation size={14} className="shrink-0 text-blue-500" /> : <Home size={14} className="shrink-0 text-slate-400" />}
                <span className="truncate">{originLabel}</span>
              </div>
              {!fromStop && (
                <button
                  onClick={() => void location.locate()}
                  disabled={location.status === 'locating'}
                  className="shrink-0 rounded-lg bg-slate-200 px-2.5 py-1 text-[10px] font-black text-slate-700 hover:bg-slate-300 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20 disabled:opacity-50"
                >
                  {location.status === 'locating' ? 'Locating…' : 'Use my location'}
                </button>
              )}
            </div>
          </div>

          {/* To */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">To</p>
            <div className="mt-2 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5">
              <button
                onClick={() => setDestinationKind('job')}
                className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-black transition ${
                  destinationKind === 'job' ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Job
              </button>
              <button
                onClick={() => setDestinationKind('address')}
                className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-black transition ${
                  destinationKind === 'address' ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Address
              </button>
            </div>

            {destinationKind === 'job' ? (
              <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto">
                {activeJobs.length === 0 && (
                  <p className="py-3 text-center text-[11px] font-bold text-slate-400">No jobs with locations available.</p>
                )}
                {activeJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                      selectedJobId === job.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                    }`}
                  >
                    <Building2 size={13} className={selectedJobId === job.id ? 'text-blue-500' : 'text-slate-400'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-black text-slate-900 dark:text-white">{job.storeName}</p>
                      <p className="truncate text-[9px] font-bold text-slate-400">{job.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 dark:border-white/10 dark:bg-white/5">
                <Search size={13} className="text-slate-400" />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter an address (e.g. 9000 Ming Ave)"
                  className="w-full bg-transparent py-2 text-xs font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => void plan()}
            disabled={!destination || transit.status === 'loading'}
            className="w-full rounded-xl bg-blue-600 py-3 text-xs font-black text-white transition hover:bg-blue-500 disabled:opacity-40"
          >
            {transit.status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Planning…
              </span>
            ) : (
              'Plan Transit Trip'
            )}
          </button>

          {transit.trip && (
            <div className="space-y-2">
              <TransitTripCard transit={transit} onRefresh={() => void transit.refreshTrip()} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
