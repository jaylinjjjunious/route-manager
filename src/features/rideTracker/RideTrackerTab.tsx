import React from 'react';
import { EndOfDaySummary } from './EndOfDaySummary';
import {
  Timer,
  Play,
  Pause,
  Square,
  Clock,
  MapPin,
  TrendingUp,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';
import type { RideTrackerTabProps } from './types';

const RideTrackerTab: React.FC<RideTrackerTabProps> = (props) => {
  const {
    trackerStatus,
    trackerRideTime,
    trackerStoreTime,
    trackerTotalDayTime,
    trackerStartBattery,
    currentBattery,
    trackerJobsCompleted,
    trackerSessions,
    ebikeConfig,
    jobs,
    routeAJobs,
    completedRouteAJobs,
    isJobDone,
    tomorrowJobs,
    onStartRide,
    onArrivedAtStore,
    onResumeRide,
    onEndDay,
    onResetCurrentSession,
    onToggleJobComplete,
    onClearHistory,
    onMoveUnfinishedToTomorrow,
  } = props;

  return (
    <div className="space-y-6 animate-fade-in" id="tab-view-tracker">
      {trackerStatus === 'completed' ? (
        <EndOfDaySummary
          completedJobs={jobs.filter((j) => j.routeId === 'A' && isJobDone(j))}
          remainingJobs={jobs.filter((j) => j.routeId === 'A' && !isJobDone(j))}
          totalMoneyEarned={jobs
            .filter((j) => j.routeId === 'A' && isJobDone(j))
            .reduce((sum, j) => sum + j.pay, 0)}
          rideTime={trackerRideTime}
          storeTime={trackerStoreTime}
          batteryUsed={Math.max(0, trackerStartBattery - currentBattery)}
          distance={parseFloat(
            ((trackerRideTime / 3600) * ebikeConfig.avgSpeedMph).toFixed(1)
          )}
          ebikeConfig={ebikeConfig}
          jobsMovedToTomorrow={tomorrowJobs}
          onMoveUnfinishedToTomorrow={onMoveUnfinishedToTomorrow}
          onResetTracker={onResetCurrentSession}
        />
      ) : (
        <>
          {/* Header and Telemetry */}
          <div className="road-card p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Timer
                    className={`w-6 h-6 ${
                      trackerStatus === 'riding' ? 'animate-spin' : ''
                    }`}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Active Ride Telemetry Tracker
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Differentiate active ride tracking from store visits to
                    calibrate real-world range.
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-3">
                {(() => {
                  let bg =
                    'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300';
                  let label = 'IDLE / READY';
                  if (trackerStatus === 'riding') {
                    bg =
                      'bg-blue-500/10 text-blue-500 border border-blue-500/20 ';
                    label = 'TRACKING ACTIVE RIDE';
                  } else if (trackerStatus === 'at_store') {
                    bg =
                      'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                    label = 'BIKE OFF • PAUSED IN STORE';
                  }
                  return (
                    <span
                      className={`text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 ${bg}`}
                    >
                      {trackerStatus === 'riding' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 " />
                      )}
                      {label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Grid of Main Tracking Controls and Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Middle Column: Tracking Controls & Live Telemetry */}
            <div className="lg:col-span-2 space-y-6">
              {/* MAIN CONTROLS CARD */}
              <div className="road-card p-6 space-y-6">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">
                  Tracking Commands
                </h3>

                {/* BUTTON MATRIX */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Button 1: Start Ride */}
                  <button
                    onClick={onStartRide}
                    disabled={trackerStatus === 'riding'}
                    className={`road-action-lg ${
                      trackerStatus === 'riding'
                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 cursor-not-allowed opacity-50'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/15'
                    }`}
                  >
                    <Play size={18} className="fill-white" />
                    <span>Start Ride</span>
                  </button>

                  {/* Button 2: Arrived at Store */}
                  <button
                    onClick={onArrivedAtStore}
                    disabled={trackerStatus !== 'riding'}
                    className={`road-action-lg ${
                      trackerStatus !== 'riding'
                        ? 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-600 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/15'
                    }`}
                  >
                    <Pause size={18} className="fill-white" />
                    <span>Arrived at Store</span>
                  </button>

                  {/* Button 3: Resume Ride */}
                  <button
                    onClick={onResumeRide}
                    disabled={trackerStatus !== 'at_store'}
                    className={`road-action-lg ${
                      trackerStatus !== 'at_store'
                        ? 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-600 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15'
                    }`}
                  >
                    <Play size={18} className="fill-white" />
                    <span>Resume Ride</span>
                  </button>

                  {/* Button 4: End Day */}
                  <button
                    onClick={onEndDay}
                    disabled={trackerStatus === 'idle'}
                    className={`road-action-lg ${
                      trackerStatus === 'idle'
                        ? 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-600 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/15'
                    }`}
                  >
                    <Square size={18} className="fill-white" />
                    <span>End Day</span>
                  </button>
                </div>

                {/* Reset button if completed or active */}
                {trackerStatus !== 'idle' && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={onResetCurrentSession}
                      className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all flex items-center gap-1"
                    >
                      <RotateCcw size={12} />
                      <span>Reset Current Tracker Session</span>
                    </button>
                  </div>
                )}
              </div>

              {/* TELEMETRY READOUT METRICS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* STAT 1: RIDE TIME */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5  flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Ride Time
                    </span>
                    <Play size={12} className="text-emerald-500" />
                  </div>
                  <div className="mt-4">
                    <span className="block text-xl font-black text-slate-900 dark:text-white font-mono">
                      {(() => {
                        const h = Math.floor(trackerRideTime / 3600);
                        const m = Math.floor((trackerRideTime % 3600) / 60);
                        const s = trackerRideTime % 60;
                        return `${h.toString().padStart(2, '0')}:${m
                          .toString()
                          .padStart(2, '0')}:${s
                          .toString()
                          .padStart(2, '0')}`;
                      })()}
                    </span>
                    <span className="block text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">
                      Bike on & Moving
                    </span>
                  </div>
                </div>

                {/* STAT 2: STORE TIME */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5  flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Store Time
                    </span>
                    <Pause size={12} className="text-amber-500" />
                  </div>
                  <div className="mt-4">
                    <span className="block text-xl font-black text-slate-900 dark:text-white font-mono">
                      {(() => {
                        const h = Math.floor(trackerStoreTime / 3600);
                        const m = Math.floor((trackerStoreTime % 3600) / 60);
                        const s = trackerStoreTime % 60;
                        return `${h.toString().padStart(2, '0')}:${m
                          .toString()
                          .padStart(2, '0')}:${s
                          .toString()
                          .padStart(2, '0')}`;
                      })()}
                    </span>
                    <span className="block text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">
                      Bike off & Paused
                    </span>
                  </div>
                </div>

                {/* STAT 3: TOTAL DAY TIME */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5  flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Total Session
                    </span>
                    <Clock size={12} className="text-indigo-500" />
                  </div>
                  <div className="mt-4">
                    <span className="block text-xl font-black text-slate-900 dark:text-white font-mono">
                      {(() => {
                        const h = Math.floor(trackerTotalDayTime / 3600);
                        const m = Math.floor((trackerTotalDayTime % 3600) / 60);
                        const s = trackerTotalDayTime % 60;
                        return `${h.toString().padStart(2, '0')}:${m
                          .toString()
                          .padStart(2, '0')}:${s
                          .toString()
                          .padStart(2, '0')}`;
                      })()}
                    </span>
                    <span className="block text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">
                      Total elapsed time
                    </span>
                  </div>
                </div>

                {/* STAT 4: ESTIMATED DISTANCE */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5  flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Est. Distance
                    </span>
                    <MapPin size={12} className="text-blue-500" />
                  </div>
                  <div className="mt-4">
                    <span className="block text-xl font-black text-slate-900 dark:text-white font-mono">
                      {((trackerRideTime / 3600) * ebikeConfig.avgSpeedMph).toFixed(
                        2
                      )}{' '}
                      mi
                    </span>
                    <span className="block text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">
                      At {ebikeConfig.avgSpeedMph} MPH avg speed
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTIVE JOBS CHECKLIST SECTION */}
              {trackerStatus !== 'idle' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6  space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">
                        Route A Stops & Tasks
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Check off stops as you complete them to record data for
                        this session.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-500 font-mono">
                      {trackerJobsCompleted.length} Completed
                    </span>
                  </div>

                  {routeAJobs.length > 0 ? (
                    <div className="space-y-2.5">
                      {routeAJobs.map((job) => {
                        const isDone = isJobDone(job);
                        return (
                          <div
                            key={job.id}
                            className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                              isDone
                                ? 'bg-blue-500/[0.02] border-blue-500/20 text-slate-400 line-through dark:text-slate-500'
                                : 'bg-slate-50/50 border-slate-200 dark:bg-white/[0.02] dark:border-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => onToggleJobComplete(job.id)}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  isDone
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white border-slate-300 hover:border-slate-400 dark:bg-neutral-950 dark:border-neutral-800'
                                }`}
                              >
                                <CheckSquare
                                  size={16}
                                  className={
                                    isDone ? 'opacity-100' : 'opacity-0'
                                  }
                                />
                              </button>
                              <div className="flex-1 min-w-0 pr-4">
                                <span className="block text-xs font-black truncate">
                                  {job.storeName}
                                </span>
                                <span className="block text-[10px] opacity-75 font-mono truncate">
                                  {job.address}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                isDone
                                  ? 'bg-blue-500/10 text-blue-500'
                                  : 'bg-slate-100 text-slate-500 dark:bg-white/5'
                              }`}
                            >
                              ${job.pay.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No stops assigned to Route A yet. Go to the Jobs tab to
                      assign stops.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Ride History */}
            <div className="space-y-6">
              {/* HISTORY LOG OF SAVED DAYS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6  space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-slate-500" />
                    <span>Tracked History</span>
                  </h3>
                  {trackerSessions.length > 0 && (
                    <button
                      onClick={onClearHistory}
                      className="text-[9px] font-bold text-red-500 hover:underline uppercase"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {trackerSessions.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {trackerSessions.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 bg-slate-50 dark:bg-white/[0.01] border border-slate-200/50 dark:border-white/5 rounded-xl space-y-2 text-[11px]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">
                            {s.date}
                          </span>
                          <span className="text-slate-400 font-black">
                            Saved
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-slate-400 text-[10px]">
                          <div>Ride: {Math.floor(s.rideTime / 60)} min</div>
                          <div>Store: {Math.floor(s.storeTime / 60)} min</div>
                          <div>Dist: {s.distance} mi</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200/60 dark:border-white/5 rounded-xl">
                    <span className="block text-xs font-bold">
                      No ride logs saved yet
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      Complete a route and click &quot;End Day&quot; to log
                      statistics.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RideTrackerTab;
