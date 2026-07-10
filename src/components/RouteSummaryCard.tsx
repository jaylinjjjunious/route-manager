/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RouteMetrics, EbikeConfig } from '../types';
import { DollarSign, Clock, Zap, Milestone, TrendingUp, CheckSquare, ShieldCheck, ShieldAlert } from 'lucide-react';

interface RouteSummaryCardProps {
  metrics: RouteMetrics;
  config: EbikeConfig;
}

export default function RouteSummaryCard({ metrics, config }: RouteSummaryCardProps) {
  const batteryLimitWarning = metrics.estimatedBatteryUsage > 85;
  const batteryDangerous = metrics.estimatedBatteryUsage > 100;
  
  // Format ride time (e.g., 1h 24m)
  const formatTime = (totalMinutes: number) => {
    if (totalMinutes < 60) return `${totalMinutes} mins`;
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <div id="route-summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Earnings Stat */}
      <div className="road-card relative overflow-hidden p-5 transition-all">
        <div className="flex items-center justify-between">
          <span className="road-label">Total Route Pay</span>
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <DollarSign size={18} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="road-value">
            ${metrics.totalPay.toFixed(2)}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-black text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={14} />
            <span>Guaranteed earnings</span>
          </p>
        </div>
      </div>

      {/* Ride vs Work Time Stat */}
      <div className="road-card relative overflow-hidden p-5 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="road-label">Est. Total Time</span>
            {metrics.isGoogleLive && (
              <span className="mt-0.5 text-[9px] font-bold text-blue-500 dark:text-blue-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Google Maps Live
              </span>
            )}
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <Clock size={18} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="road-value">
            {formatTime(metrics.totalTime)}
          </h3>
          <div className="mt-2 flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
            <span>Ride: {formatTime(metrics.totalRideTime)}</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>Work: {formatTime(metrics.totalWorkTime)}</span>
          </div>
        </div>
      </div>

      {/* Mileage & Battery Stat */}
      <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-xs transition-all ${
        batteryDangerous 
          ? 'border-rose-300 bg-rose-50/40 dark:border-rose-500/20 dark:bg-rose-500/5' 
          : batteryLimitWarning 
          ? 'border-amber-300 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/5'
          : 'border-slate-200 bg-white dark:border-white/5 dark:bg-[#0A0A0A]'
      }`}>
        <div className="flex items-center justify-between">
          <span className="road-label">Battery & Distance</span>
          <div className={`rounded-lg p-2 ${
            batteryDangerous
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
              : batteryLimitWarning
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
              : 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400'
          }`}>
            <Zap size={18} />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline gap-1.5">
            <h3 className={`text-3xl font-extrabold tracking-tight ${
              batteryDangerous ? 'text-rose-700 dark:text-rose-400' : 'text-slate-950 dark:text-white'
            }`}>
              {metrics.estimatedBatteryUsage}%
            </h3>
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">spent</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Milestone size={12} className="inline" />
              {metrics.totalDistance} miles round-trip
            </span>
            {batteryLimitWarning ? (
              <span className={`flex items-center gap-1 font-bold ${
                batteryDangerous ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                <ShieldAlert size={12} />
                {batteryDangerous ? 'DANGER' : 'LOW'}
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Safe</span>
            )}
          </div>
        </div>
      </div>

      {/* Hourly Wage Stat */}
      <div className="road-card relative overflow-hidden p-5 transition-all">
        <div className="flex items-center justify-between">
          <span className="road-label">Est. Hourly Pay</span>
          <div className="rounded-lg bg-cyan-50 p-2 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
            <TrendingUp size={18} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="road-value">
            ${metrics.earningsPerHour.toFixed(2)}/hr
          </h3>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <CheckSquare size={12} />
              {metrics.completedJobsCount} of {metrics.totalJobsCount} jobs done
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


