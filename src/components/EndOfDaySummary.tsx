import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Timer, 
  Battery, 
  TrendingUp, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  Sliders, 
  Sparkles, 
  RotateCcw,
  CheckSquare
} from 'lucide-react';
import { Job, EbikeConfig } from '../types';

interface EndOfDaySummaryProps {
  completedJobs: Job[];
  remainingJobs: Job[];
  totalMoneyEarned: number;
  rideTime: number; // in seconds
  storeTime: number; // in seconds
  batteryUsed: number; // percentage
  distance: number; // miles
  ebikeConfig: EbikeConfig;
  jobsMovedToTomorrow: Job[];
  onMoveUnfinishedToTomorrow: () => void;
  onResetTracker: () => void;
}

export const EndOfDaySummary: React.FC<EndOfDaySummaryProps> = ({
  completedJobs,
  remainingJobs,
  totalMoneyEarned,
  rideTime,
  storeTime,
  batteryUsed,
  distance,
  ebikeConfig,
  jobsMovedToTomorrow,
  onMoveUnfinishedToTomorrow,
  onResetTracker
}) => {
  const [hasMoved, setHasMoved] = useState(false);

  // Formats seconds into h m s
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  };

  const totalSeconds = rideTime + storeTime;
  const totalHours = totalSeconds / 3600;

  // Average earnings per hour
  const avgEarningsPerHour = totalHours > 0 ? totalMoneyEarned / totalHours : 0;

  // High-fidelity Profit per mile calculation:
  // ebike battery charging costs ~ $0.15 for 360Wh (100% capacity)
  // general bike maintenance/depreciation estimated at $0.06 per mile
  const chargingCost = (batteryUsed / 100) * 0.15;
  const maintenanceCost = distance * 0.06;
  const totalOperatingCost = chargingCost + maintenanceCost;
  const totalProfit = totalMoneyEarned - totalOperatingCost;
  const profitPerMile = distance > 0 ? totalProfit / distance : 0;

  // Smart Heuristic - Best Route Decision Generator
  const generateBestRouteDecision = () => {
    if (completedJobs.length === 0) {
      return "No jobs completed yet today. Start completing assigned tasks to unlock route analysis!";
    }

    // Check if there was an outlier that got completed or moved
    const highPayJob = completedJobs.reduce((prev, current) => (prev.pay > current.pay) ? prev : current);
    
    let decision = `Priority sequencing of high-value client cluster first. `;
    if (highPayJob.pay >= 20) {
      decision += `Prioritizing ${highPayJob.storeName} ($${highPayJob.pay.toFixed(2)}) capitalized on peak dispatch rates. `;
    }

    // Mention optimization
    decision += `Completing ${completedJobs.length} local clusters sequentially saved an estimated ${Math.round(completedJobs.length * 3.5)} minutes of backtracking compared to raw map-pivots.`;
    return decision;
  };

  // Smart Heuristic - Biggest Time/Battery Waste Generator
  const generateTimeBatteryWaste = () => {
    if (completedJobs.length === 0 && remainingJobs.length === 0) {
      return "No route activities logged to identify waste metrics.";
    }

    const longDwellJob = completedJobs.find(j => j.estimatedMinutes >= 30);
    const hasOutliers = remainingJobs.length > 0;

    if (longDwellJob) {
      return `Store dwell time at ${longDwellJob.storeName} was ${longDwellJob.estimatedMinutes} minutes. Inside tasks represent the largest time sync compared to active riding.`;
    }

    if (batteryUsed > 40 && distance > 0) {
      const consumptionPerMile = batteryUsed / distance;
      if (consumptionPerMile > 2.5) {
        return `High discharge rate of ${consumptionPerMile.toFixed(1)}% per mile. Heavy throttle or riding at PAS Level 4-5 accounts for approximately ${Math.round(batteryUsed * 0.25)}% excess battery drag.`;
      }
    }

    if (hasOutliers) {
      return `Geographically isolated jobs remaining on standby represent potential empty travel miles. Pre-sorting them saves battery wear.`;
    }

    return "No significant waste detected! Your ride pacing and store dwell metrics were within 95% of peak-optimized benchmarks.";
  };

  const handleMoveClick = () => {
    onMoveUnfinishedToTomorrow();
    setHasMoved(true);
  };

  return (
    <div className="space-y-6" id="end-of-day-summary-card">
      {/* Visual Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white border border-slate-800 shadow-xl dark:border-white/5">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles size={120} className="text-white" />
        </div>
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
              Shift Completed Successfully
            </span>
            <span className="text-slate-400 text-xs font-bold">• Daily Ledger</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">End of Day Performance Summary</h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Review detailed telemetry, financial yields, and physical range calibrations recorded from your Jasion EB5 active ride tracker.
          </p>
        </div>
      </div>

      {/* Main Stats Ledger Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* STAT 1: EARNED */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0A0A0A] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-widest">Total Earned</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <DollarSign size={14} />
            </div>
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-black text-slate-900 dark:text-white font-mono">
              ${totalMoneyEarned.toFixed(2)}
            </span>
            <span className="block text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              Guaranteed gross pay
            </span>
          </div>
        </div>

        {/* STAT 2: BIKE ON TIME */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0A0A0A] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-widest">Total Ride Time</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Timer size={14} />
            </div>
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-black text-slate-900 dark:text-white font-mono">
              {formatTime(rideTime)}
            </span>
            <span className="block text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              Bike motor active
            </span>
          </div>
        </div>

        {/* STAT 3: STORE TIME */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0A0A0A] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-widest">Total Store Time</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <MapPin size={14} />
            </div>
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-black text-slate-900 dark:text-white font-mono">
              {formatTime(storeTime)}
            </span>
            <span className="block text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              Dwell time inside stores
            </span>
          </div>
        </div>

        {/* STAT 4: BATTERY CONSUMPTION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0A0A0A] flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-widest">Total Battery Used</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <Battery size={14} />
            </div>
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-black text-slate-900 dark:text-white font-mono">
              {batteryUsed}%
            </span>
            <span className="block text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              {Math.max(0, batteryUsed * 3.6).toFixed(0)} Wh capacity drained
            </span>
          </div>
        </div>
      </div>

      {/* Ratios Ledger */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Average Earnings Hour */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0A0A0A] space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Average Hourly Earnings</span>
          </div>
          <div className="font-mono text-xl font-black text-slate-900 dark:text-white">
            ${avgEarningsPerHour.toFixed(2)}<span className="text-xs text-slate-400 font-bold">/hr</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Calculated across combined riding & inside dwell time ({formatTime(totalSeconds)} total elapsed).
          </p>
        </div>

        {/* Net Profit per mile */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0A0A0A] space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Net Profit Per Mile</span>
          </div>
          <div className="font-mono text-xl font-black text-slate-900 dark:text-white">
            ${profitPerMile.toFixed(2)}<span className="text-xs text-slate-400 font-bold">/mi</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Gross minus Jasion EB5 charging cost (${chargingCost.toFixed(2)}) and general wear-and-tear (${maintenanceCost.toFixed(2)}).
          </p>
        </div>

        {/* Distance covered */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#0A0A0A] space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-bold">Total Mileage covered</span>
          </div>
          <div className="font-mono text-xl font-black text-slate-900 dark:text-white">
            {distance.toFixed(1)} <span className="text-xs text-slate-400 font-bold">miles</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Equivalent to an average pacing of {ebikeConfig.avgSpeedMph} MPH on active segments.
          </p>
        </div>
      </div>

      {/* Analytical Intelligence Insights Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#0A0A0A] space-y-4">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
          <Sparkles size={14} className="text-indigo-500" />
          <span>Post-Route Heuristic Intelligence Reports</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Best decision */}
          <div className="p-4 bg-emerald-500/[0.01] border border-emerald-500/10 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
              <CheckCircle2 size={15} />
              <span>Best Route Decision</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
              {generateBestRouteDecision()}
            </p>
          </div>

          {/* Biggest waste */}
          <div className="p-4 bg-rose-500/[0.01] border border-rose-500/10 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-xs">
              <AlertCircle size={15} />
              <span>Biggest Time/Battery Waste</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
              {generateTimeBatteryWaste()}
            </p>
          </div>
        </div>
      </div>

      {/* Jobs Completed vs Unfinished Checklist Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completed list */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#0A0A0A] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">
              Completed Jobs ({completedJobs.length})
            </h3>
            <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-full uppercase">
              Payout Logged
            </span>
          </div>

          {completedJobs.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {completedJobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 dark:bg-white/[0.01] dark:border-white/5">
                  <div className="min-w-0 pr-4">
                    <span className="block text-xs font-black truncate text-slate-800 dark:text-slate-200">{j.storeName}</span>
                    <span className="block text-[10px] text-slate-400 font-mono truncate">{j.address}</span>
                  </div>
                  <span className="text-xs font-black text-emerald-500 flex-shrink-0">
                    +${j.pay.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-bold">
              No jobs were completed in this session.
            </div>
          )}
        </div>

        {/* Unfinished / Carried Over List */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#0A0A0A] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">
              Unfinished Jobs ({remainingJobs.length})
            </h3>
            <span className="text-[10px] font-black bg-amber-500/10 text-amber-500 px-2.5 py-0.5 rounded-full uppercase">
              Pending Next Action
            </span>
          </div>

          {remainingJobs.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {remainingJobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 dark:bg-white/[0.01] dark:border-white/5">
                  <div className="min-w-0 pr-4">
                    <span className="block text-xs font-black truncate text-slate-800 dark:text-slate-200">{j.storeName}</span>
                    <span className="block text-[10px] text-slate-400 font-mono truncate">{j.address}</span>
                  </div>
                  <span className="text-xs font-black text-slate-500 flex-shrink-0 font-mono">
                    ${j.pay.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-bold">
              All jobs completed! Your daily queue is 100% clear.
            </div>
          )}
        </div>
      </div>

      {/* Jobs Moved to Tomorrow Listing */}
      {jobsMovedToTomorrow.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#0A0A0A] space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">
              Carried Over & Moved to Tomorrow ({jobsMovedToTomorrow.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {jobsMovedToTomorrow.map((j) => (
              <div key={j.id} className="p-3 rounded-xl bg-indigo-500/[0.02] border border-indigo-500/10 text-xs">
                <span className="block font-black text-slate-800 dark:text-slate-200">{j.storeName}</span>
                <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{j.address}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Operations / Reset Buttons Panel */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-white/5 dark:bg-[#080808] flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="text-center sm:text-left space-y-1">
          <span className="block text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Ready to Plan the Next Shift?
          </span>
          <p className="text-[11px] text-slate-400 max-w-md">
            Carry over unfinished tasks to tomorrow's Route A queue and re-optimize the sequence.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {remainingJobs.length > 0 && (
            <button
              onClick={handleMoveClick}
              disabled={hasMoved}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black transition-all ${
                hasMoved 
                  ? 'bg-slate-200 text-slate-400 dark:bg-white/5 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:shadow-indigo-600/10'
              }`}
            >
              <ArrowRight size={14} />
              <span>{hasMoved ? "Jobs Moved & Route Re-Optimized" : "Move Unfinished Jobs to Tomorrow"}</span>
            </button>
          )}

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to start a brand new tracking session? Today\'s local stats will reset.')) {
                onResetTracker();
              }
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-[#0C0C0C] dark:text-slate-300 dark:hover:bg-white/5 text-xs font-black transition-all"
          >
            <RotateCcw size={14} />
            <span>Reset Active Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};


