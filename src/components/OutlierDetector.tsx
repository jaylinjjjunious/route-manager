/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { OutlierReport, OutlierStatus } from '../types';
import { ShieldAlert, CheckCircle, ArrowRightLeft, Sparkles, Compass, Clock, Zap } from 'lucide-react';

interface OutlierDetectorProps {
  outliers: OutlierReport[];
  onMoveToRouteB: (jobId: string) => void;
}

export default function OutlierDetector({ outliers, onMoveToRouteB }: OutlierDetectorProps) {
  const getStatusStyle = (status: OutlierStatus) => {
    switch (status) {
      case 'do_now':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
      case 'push_to_b':
        return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50';
      case 'wait_for_more':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
    }
  };

  const getStatusLabel = (status: OutlierStatus) => {
    switch (status) {
      case 'do_now':
        return 'High Pay: Do Now';
      case 'push_to_b':
        return 'Inefficient: Push to Route B';
      case 'wait_for_more':
        return 'Wait for More Nearby';
    }
  };

  if (outliers.length === 0) {
    return (
      <div id="outliers-clean-panel" className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
        <div className="flex items-start gap-3.5">
          <div className="rounded-full bg-emerald-100 p-1.5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>No Geographic Outliers Detected</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                Optimal Clustering
              </span>
            </h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
              All active stops in Route A are tightly clustered. You will waste minimal battery on empty travel miles and maximize your e-bike earnings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="outlier-warnings-container" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <ShieldAlert size={18} />
          <h3 className="text-sm font-bold tracking-tight">Geographic Outlier Alerts ({outliers.length})</h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Range Safeguards
        </span>
      </div>

      <div className="space-y-3">
        {outliers.map((report) => (
          <div
            key={report.jobId}
            id={`outlier-item-${report.jobId}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all dark:border-white/5 dark:bg-[#0A0A0A] hover:dark:border-white/10"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {/* Header Details */}
              <div className="space-y-1 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {report.storeName}
                  </h4>
                  <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getStatusStyle(report.status)}`}>
                    {getStatusLabel(report.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                  {report.explanation}
                </p>
              </div>

              {/* Action Button */}
              {report.status !== 'do_now' && (
                <button
                  id={`action-push-b-${report.jobId}`}
                  onClick={() => onMoveToRouteB(report.jobId)}
                  className="flex flex-shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 dark:hover:bg-amber-950/40"
                >
                  <ArrowRightLeft size={13} />
                  <span>Push to Route B</span>
                </button>
              )}
            </div>

            {/* Travel Overhead Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-slate-100/60 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <Compass size={14} className="text-slate-400" />
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Isolation</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">~{report.distanceToNearest} miles out</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Unpaid Ride</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">+{report.timeIncreaseMinutes} mins</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-slate-400" />
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">EB5 Battery Cost</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">-{report.batteryCostPercent}%</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

