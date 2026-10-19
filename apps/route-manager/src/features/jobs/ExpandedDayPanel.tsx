/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ExpandedDayPanel
 *
 * Inline panel shown beneath the weekly strip when a day is selected. Shows
 * day stats, a job list, unresolved issues, and Phase 1 actions. Weather,
 * transit, and speech data render as explicit Phase 2/3 placeholders — no
 * fabricated values.
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Route as RouteIcon,
  Volume2,
  Wallet,
  X,
} from 'lucide-react';
import type { Job } from '../../types';
import type { ScheduledDaySummary } from './jobSchedule';
import { formatScheduledDate, planningIssues } from './jobSchedule';
import { getDistanceInMiles } from '../../utils/geoUtils';
import type { Coordinates } from '../../types';

interface ExpandedDayPanelProps {
  day: ScheduledDaySummary;
  today: string;
  todayJobsCount: number;
  todayPay: number;
  todayWorkMinutes: number;
  startCoord: Coordinates;
  avgSpeedMph: number;
  onMoveToDay: (job: Job) => void;
  onOpenJob: (id: string) => void;
  onPlanThisDay: (day: ScheduledDaySummary) => void;
  onAddJob: () => void;
  onMoveExisting: () => void;
  onCollapse: () => void;
}

function formatDurationMinutes(totalMinutes: number): string {
  const rounded = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h${minutes > 0 ? `${String(minutes).padStart(2, '0')}m` : ''}`;
}

export function ExpandedDayPanel({
  day,
  today,
  todayJobsCount,
  todayPay,
  todayWorkMinutes,
  startCoord,
  avgSpeedMph,
  onMoveToDay,
  onOpenJob,
  onPlanThisDay,
  onAddJob,
  onMoveExisting,
  onCollapse,
}: ExpandedDayPanelProps) {
  const [showReview, setShowReview] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [planMessage, setPlanMessage] = useState<string | null>(null);

  const isToday = day.date === today;

  const travelMinutes = useMemo(() => {
    let total = 0;
    let origin = startCoord;
    for (const job of day.jobs) {
      const miles = getDistanceInMiles(origin, job.coordinates);
      total += (miles / avgSpeedMph) * 60;
      origin = job.coordinates;
    }
    return total;
  }, [day.jobs, startCoord, avgSpeedMph]);

  const issueJobs = useMemo(
    () => day.jobs.filter((job) => planningIssues(job).length > 0),
    [day.jobs],
  );

  const handlePlan = () => {
    if (isToday) {
      onPlanThisDay(day);
      setPlanMessage('Route order computed for today.');
    } else {
      setPlanMessage('Route order is computed on the day. Scheduling looks good.');
    }
  };

  const dateLabel = isToday ? `Today, ${formatScheduledDate(day.date)}` : formatScheduledDate(day.date);

  return (
    <section
      className="col-span-2 lg:col-span-4 road-card border-2 border-blue-700/40 p-4 transition-all motion-reduce:transition-none dark:border-blue-500/30 sm:p-5"
      aria-label={`Schedule for ${day.date}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">
            Day Plan
          </p>
          <h3 className="mt-0.5 text-2xl font-black leading-tight text-slate-950 dark:text-white">
            {dateLabel}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowCompare((prev) => !prev);
              setShowReview(false);
            }}
            className="road-action rounded-[8px] bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
          >
            Compare Days
          </button>
          <button
            type="button"
            onClick={handlePlan}
            className="road-action rounded-[8px] bg-blue-700 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-600"
          >
            Plan This Day
          </button>
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse day panel"
            className="road-icon-button rounded-[8px] bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {planMessage && (
        <p className="mt-2 rounded-[8px] bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
          {planMessage}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-[8px] bg-slate-50 p-3 dark:bg-white/5">
          <p className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
            <Calendar size={11} /> Jobs
          </p>
          <p className="mt-0.5 text-2xl font-black text-slate-950 dark:text-white">
            {day.jobs.length}
          </p>
        </div>
        <div className="rounded-[8px] bg-slate-50 p-3 dark:bg-white/5">
          <p className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
            <Wallet size={11} /> Pay
          </p>
          <p className="mt-0.5 text-2xl font-black text-slate-950 dark:text-white">
            ${day.pay.toFixed(2)}
          </p>
        </div>
        <div className="rounded-[8px] bg-slate-50 p-3 dark:bg-white/5">
          <p className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
            <Clock size={11} /> Work
          </p>
          <p className="mt-0.5 text-2xl font-black text-slate-950 dark:text-white">
            {formatDurationMinutes(day.workMinutes)}
          </p>
        </div>
        <div className="rounded-[8px] bg-slate-50 p-3 dark:bg-white/5">
          <p className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
            <RouteIcon size={11} /> Ride
          </p>
          <p className="mt-0.5 text-2xl font-black text-slate-950 dark:text-white">
            {formatDurationMinutes(travelMinutes)}
          </p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <p className="rounded-[8px] bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
          Best window: <span className="italic">weather analysis coming in Phase 2</span>
        </p>
        <p className="rounded-[8px] bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
          Transport: <span className="italic">transit analysis coming in Phase 2</span>
        </p>
      </div>

      {showCompare && (
        <div className="mt-3 overflow-x-auto rounded-[8px] border border-slate-200 dark:border-white/10">
          <table className="w-full min-w-[280px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 dark:border-white/10">
                <th className="p-2">Metric</th>
                <th className="p-2">{formatScheduledDate(today)}</th>
                <th className="p-2">{formatScheduledDate(day.date)}</th>
              </tr>
            </thead>
            <tbody className="font-bold text-slate-700 dark:text-slate-200">
              <tr>
                <td className="p-2">Jobs</td>
                <td className="p-2">{todayJobsCount}</td>
                <td className="p-2">{day.jobs.length}</td>
              </tr>
              <tr className="border-t border-slate-100 dark:border-white/5">
                <td className="p-2">Pay</td>
                <td className="p-2">${(today === day.date ? day.pay : todayPay).toFixed(2)}</td>
                <td className="p-2">${day.pay.toFixed(2)}</td>
              </tr>
              <tr className="border-t border-slate-100 dark:border-white/5">
                <td className="p-2">Work time</td>
                <td className="p-2">{formatDurationMinutes(today === day.date ? day.workMinutes : todayWorkMinutes)}</td>
                <td className="p-2">{formatDurationMinutes(day.workMinutes)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3">
        {day.jobs.length === 0 ? (
          <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-4 text-center dark:border-white/10 dark:bg-white/5">
            <p className="text-base font-black text-slate-600 dark:text-slate-300">
              No jobs scheduled for {formatScheduledDate(day.date)}.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={onAddJob}
                className="rounded-[8px] bg-blue-700 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-600"
              >
                Add Job
              </button>
              <button
                type="button"
                onClick={onMoveExisting}
                className="rounded-[8px] bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-300 dark:bg-white/10 dark:text-slate-200"
              >
                Move Existing Job
              </button>
            </div>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {day.jobs.map((job) => {
              const issues = planningIssues(job);
              return (
                <li key={job.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenJob(job.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenJob(job.id);
                      }
                    }}
                    className="flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white p-2.5 transition hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-blue-500/40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-950 dark:text-white">
                        {job.storeName}
                      </span>
                      <span className="block truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {job.dueTime || 'Flex'} · {job.address}
                      </span>
                    </span>
                    {issues.length > 0 ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                        <AlertTriangle size={10} /> Needs Review
                      </span>
                    ) : (
                      <span className="shrink-0 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        ${job.pay.toFixed(2)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onMoveToDay(job);
                      }}
                      className="shrink-0 rounded-[8px] bg-blue-600 px-2 py-1 text-[10px] font-black text-white hover:bg-blue-500"
                    >
                      Move
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {issueJobs.length > 0 && (
        <div className="mt-3 rounded-[8px] border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-black text-rose-700 dark:text-rose-300">
              <AlertTriangle size={13} /> {issueJobs.length} need{issueJobs.length === 1 ? 's' : ''} review
            </p>
            <button
              type="button"
              onClick={() => setShowReview((prev) => !prev)}
              className="rounded-[8px] bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white hover:bg-rose-500"
            >
              {showReview ? 'Hide' : 'Review'} Issues
            </button>
          </div>
          {showReview && (
            <ul className="mt-2 space-y-1.5">
              {day.jobs.map((job) => {
                const issues = planningIssues(job);
                if (issues.length === 0) return null;
                return (
                  <li key={job.id} className="rounded-[8px] bg-white p-2 text-xs dark:bg-white/5">
                    <p className="font-black text-slate-900 dark:text-white">{job.storeName}</p>
                    <ul className="mt-1 space-y-0.5">
                      {issues.map((issue) => (
                        <li key={issue.kind} className="flex items-center gap-1 font-bold text-rose-700 dark:text-rose-300">
                          <span className="h-1 w-1 rounded-full bg-rose-500" />
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-1.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => onMoveToDay(job)}
                        className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white hover:bg-blue-500"
                      >
                        Move to a day
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenJob(job.id)}
                        className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200"
                      >
                        Fix
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled
          title="Available after Companion setup (Phase 3)"
          className="road-action flex items-center gap-1.5 rounded-[8px] bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-400 dark:bg-white/10 dark:text-slate-500"
        >
          <Volume2 size={13} />
          Hear Summary — after Companion setup
        </button>
        <button
          type="button"
          onClick={() => setShowReview((prev) => !prev)}
          className="road-action flex items-center gap-1.5 rounded-[8px] bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
        >
          <CheckCircle2 size={13} />
          Review Jobs
        </button>
        <button
          type="button"
          onClick={onCollapse}
          className="road-action ml-auto rounded-[8px] bg-slate-950 px-3 py-1.5 text-xs font-black uppercase text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
        >
          Collapse
        </button>
      </div>
    </section>
  );
}
