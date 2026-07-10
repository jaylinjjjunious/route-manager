/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RouteScoreReport } from '../types';
import { ShieldCheck, ArrowRight, ChevronDown, ChevronUp, Star } from 'lucide-react';

interface RouteScoreGaugeProps {
  scoreReport: RouteScoreReport;
}

export default function RouteScoreGauge({ scoreReport }: RouteScoreGaugeProps) {
  const [expanded, setExpanded] = useState(true);
  const { score, payRating, distanceRating, batterySafetyRating, clusteringRating, suggestions } = scoreReport;

  // Rating color map helper
  const getRatingStyle = (rating: 'excellent' | 'good' | 'fair' | 'poor') => {
    switch (rating) {
      case 'excellent':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40';
      case 'good':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40';
      case 'fair':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40';
      case 'poor':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40';
    }
  };

  // Score color helper
  const getScoreColor = (val: number) => {
    if (val >= 80) return 'stroke-emerald-500 text-emerald-500';
    if (val >= 50) return 'stroke-amber-500 text-amber-500';
    return 'stroke-rose-500 text-rose-500';
  };

  const strokeDashoffset = 251.2 - (251.2 * score) / 100;

  return (
    <div id="route-score-gauge" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all dark:border-white/5 dark:bg-[#0A0A0A]">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left Side: Score Circular Indicator */}
        <div className="flex items-center gap-5">
          <div className="relative h-24 w-24 flex-shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              {/* Back Circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-slate-100 dark:text-white/5"
              />
              {/* Value Circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`transition-all duration-1000 ${getScoreColor(score)}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{score}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <Star size={16} className={score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-rose-500'} />
              <span>Route Quality Score</span>
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              Weighs pay efficiency, stop density, and range buffers. Higher scores indicate maximized profit per mile on your Jasion EB5.
            </p>
          </div>
        </div>

        {/* Right Side: Quick Rating Chips */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-xl border border-slate-100 p-2.5 dark:border-white/5 dark:bg-white/5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pay Rate</span>
            <span className={`inline-block rounded-md border px-2 py-0.5 text-center text-[10px] font-bold uppercase ${getRatingStyle(payRating)}`}>
              {payRating}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-slate-100 p-2.5 dark:border-white/5 dark:bg-white/5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Distance</span>
            <span className={`inline-block rounded-md border px-2 py-0.5 text-center text-[10px] font-bold uppercase ${getRatingStyle(distanceRating)}`}>
              {distanceRating}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-slate-100 p-2.5 dark:border-white/5 dark:bg-white/5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Battery Safe</span>
            <span className={`inline-block rounded-md border px-2 py-0.5 text-center text-[10px] font-bold uppercase ${getRatingStyle(batterySafetyRating)}`}>
              {batterySafetyRating}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-slate-100 p-2.5 dark:border-white/5 dark:bg-white/5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Clustering</span>
            <span className={`inline-block rounded-md border px-2 py-0.5 text-center text-[10px] font-bold uppercase ${getRatingStyle(clusteringRating)}`}>
              {clusteringRating}
            </span>
          </div>
        </div>
      </div>

      {/* Actionable Suggestions Divider */}
      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/5">
        <button
          id="toggle-score-suggestions"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-blue-500" />
            <span>Optimization Insights & Suggestions ({suggestions.length})</span>
          </span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expanded && (
          <div className="mt-3.5 space-y-2.5">
            {suggestions.map((sug, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <ArrowRight size={14} className="mt-0.5 flex-shrink-0 text-indigo-500" />
                <span>{sug}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

