import React from 'react';
import { Navigation, CheckCircle2, CheckSquare, Hourglass } from 'lucide-react';
import type { RideModeSurfaceProps } from './types';

const RideModeSurface: React.FC<RideModeSurfaceProps> = ({
  onEndRideMode,
  nextRouteAJob,
  completingJobIds,
  nextStopNavLink,
  onToggleComplete,
  onMarkUnderReview,
  routeListStops,
  getRouteBadgeClasses,
  getRouteBadgeLabel,
  getStreetName,
  formatDuration,
  trackerTotalDayTime,
  trackerRideTime,
  trackerStoreTime,
  rideBatteryUsed,
  remainingRouteAJobs,
  completedRouteAJobs,
  rideDistance,
  rideEarningsPerHour,
  rideAverageSpeed,
  rideEarned,
  trackerJobsCompleted,
}) => {
  return (
    <div className="animate-fade-in space-y-4" id="ride-mode-v2">
      <div className="flex flex-col gap-3 rounded-[8px] border-4 border-slate-950 bg-slate-950 p-4 text-white dark:border-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-black uppercase tracking-widest text-emerald-300">Ride Mode V2</p>
          <h2 className="text-5xl font-black leading-none tracking-tight sm:text-6xl">Execute Route</h2>
        </div>
        <button
          type="button"
          onClick={onEndRideMode}
          className="min-h-20 rounded-[8px] bg-rose-600 px-6 text-3xl font-black uppercase text-white shadow-lg transition hover:bg-rose-500"
        >
          🏁 End Ride
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <section className={`col-span-2 rounded-[8px] border-4 border-slate-950 bg-white p-4 shadow-lg transition-all duration-500 dark:border-white dark:bg-[#17181b] lg:col-span-4 ${nextRouteAJob && completingJobIds.includes(nextRouteAJob.id) ? 'scale-[0.99] border-emerald-500 bg-emerald-50 opacity-80' : ''}`}>
          <p className="text-base font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Next Stop</p>
          <h3 className="mt-2 truncate text-6xl font-black leading-none text-slate-950 dark:text-white">
            {nextRouteAJob?.storeName || 'Route Clear'}
          </h3>
          <p className="mt-2 truncate text-2xl font-black text-slate-700 dark:text-slate-200">
            {nextRouteAJob?.address || 'No active stop'}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a
              href={nextStopNavLink}
              target="_blank"
              referrerPolicy="no-referrer"
              className="flex min-h-24 items-center justify-center gap-3 rounded-[8px] bg-emerald-600 px-4 text-3xl font-black uppercase text-white shadow-lg transition hover:bg-emerald-500"
            >
              <Navigation size={34} />
              <span>Navigate</span>
            </a>
            <button
              type="button"
              disabled={!nextRouteAJob || Boolean(nextRouteAJob && completingJobIds.includes(nextRouteAJob.id))}
              onClick={() => nextRouteAJob && (nextRouteAJob.status === 'under_review' ? onToggleComplete(nextRouteAJob.id) : onMarkUnderReview(nextRouteAJob.id))}
              className={`flex min-h-24 items-center justify-center gap-3 rounded-[8px] px-4 text-3xl font-black uppercase text-white shadow-lg transition disabled:bg-emerald-600 ${
                nextRouteAJob?.status === 'under_review'
                  ? 'bg-blue-700 hover:bg-blue-600'
                  : 'bg-indigo-700 hover:bg-indigo-600'
              }`}
            >
              {nextRouteAJob && completingJobIds.includes(nextRouteAJob.id) ? <CheckCircle2 size={34} /> : nextRouteAJob?.status === 'under_review' ? <CheckSquare size={34} /> : <Hourglass size={34} />}
              <span>{nextRouteAJob && completingJobIds.includes(nextRouteAJob.id) ? 'Done' : nextRouteAJob?.status === 'under_review' ? 'Complete Job' : 'Under Review'}</span>
            </button>
          </div>
        </section>

        <section className="col-span-2 rounded-[8px] border-4 border-slate-950 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.16)] transition-all duration-500 dark:border-white dark:bg-[#17181b] lg:col-span-2">
          <h3 className="text-3xl font-black text-slate-950 dark:text-white">Current Route</h3>
          <div className="mt-3 space-y-2">
            {routeListStops.length === 0 ? (
              <p className="rounded-[8px] bg-emerald-100 p-4 text-2xl font-black text-emerald-900">Route clear</p>
            ) : routeListStops.map((job, idx) => (
              <div key={job.id} className={`rounded-[8px] border-2 p-3 ${idx === 0 ? 'border-blue-700 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]'}`}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-[8px] text-xl font-black ${idx === 0 ? 'bg-blue-700 text-white' : 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'}`}>{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-2xl font-black leading-tight text-slate-950 dark:text-white">{job.storeName}</p>
                      <span className={`shrink-0 rounded-[8px] px-2 py-0.5 text-xs font-black uppercase ${getRouteBadgeClasses(job)}`}>
                        {getRouteBadgeLabel(job)}
                      </span>
                    </div>
                    <p className="truncate text-base font-black text-slate-600 dark:text-slate-300">{getStreetName(job.address)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[8px] bg-slate-950 p-4 text-white">
          <p className="text-base font-black uppercase">Ride Timer</p>
          <p className="mt-2 text-5xl font-black leading-none">{formatDuration(trackerTotalDayTime)}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-black uppercase">
            <span>Ride {formatDuration(trackerRideTime)}</span>
            <span>Store {formatDuration(trackerStoreTime)}</span>
            <span>Used {rideBatteryUsed}%</span>
          </div>
        </section>
        <section className="rounded-[8px] bg-blue-700 p-4 text-white">
          <p className="text-base font-black uppercase">Jobs Left</p>
          <p className="mt-2 text-5xl font-black leading-none">{remainingRouteAJobs.length}</p>
        </section>
        <section className="rounded-[8px] bg-emerald-600 p-4 text-white">
          <p className="text-base font-black uppercase">Completed</p>
          <p className="mt-2 text-5xl font-black leading-none">{completedRouteAJobs.length}</p>
        </section>
        <section className="rounded-[8px] bg-amber-400 p-4 text-slate-950">
          <p className="text-base font-black uppercase">Distance</p>
          <p className="mt-2 text-5xl font-black leading-none">{rideDistance}</p>
          <p className="text-xl font-black">mi</p>
        </section>
        <section className="rounded-[8px] bg-white p-4 text-slate-950 dark:bg-white dark:text-slate-950">
          <p className="text-base font-black uppercase">$/Hour</p>
          <p className="mt-2 text-5xl font-black leading-none">${rideEarningsPerHour}</p>
          <p className="text-xl font-black">{rideAverageSpeed} mph</p>
        </section>

        <section className="rounded-[8px] bg-slate-950 p-4 text-white">
          <p className="text-base font-black uppercase">Earned</p>
          <p className="mt-2 text-5xl font-black leading-none">${rideEarned.toFixed(0)}</p>
          <p className="text-xl font-black">{trackerJobsCompleted.length} stops</p>
        </section>
      </div>
    </div>
  );
};

export default RideModeSurface;
