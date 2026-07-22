/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DashboardJobDetailSheet
 *
 * A mobile-friendly bottom-sheet / modal that displays a full JobCard
 * for a selected route stop from the Dashboard "Today's Route" section.
 * Reuses the JobCard component as the single source of truth for job-detail design.
 */

import React from 'react';
import { X, Navigation, Clock, MapPin } from 'lucide-react';
import JobCard from './JobCard';
import type { Job } from '../types';

interface DashboardJobDetailSheetProps {
  job: Job;
  routeIndex: number | null;
  legDistance: number;
  rideMinutes: number;
  navLink: string;
  isOutlier: boolean;
  jobAccessLocked: boolean;
  onToggleComplete: (id: string) => void;
  onEdit: (job: Job) => void;
  onDelete: (id: string) => void;
  onDuplicate: (job: Job) => void;
  onToggleRoute: (id: string) => void;
  onUpdateStatus?: (id: string, updates: Partial<Job>) => void;
  onOpenInJobs: () => void;
  onClose: () => void;
}

export default function DashboardJobDetailSheet({
  job,
  routeIndex,
  legDistance,
  rideMinutes,
  navLink,
  isOutlier,
  jobAccessLocked,
  onToggleComplete,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleRoute,
  onUpdateStatus,
  onOpenInJobs,
  onClose,
}: DashboardJobDetailSheetProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-job-detail-title"
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl dark:border-white/10 dark:bg-[#111214]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Compact route-info header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-3">
            {routeIndex !== null && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-black text-white">
                {routeIndex + 1}
              </span>
            )}
            <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
              {legDistance > 0 && (
                <span className="flex items-center gap-1">
                  <Navigation size={12} className="text-emerald-500" />
                  {legDistance.toFixed(1)} mi
                </span>
              )}
              {rideMinutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-amber-500" />
                  {rideMinutes} min
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-indigo-500" />
                Stop {routeIndex !== null ? routeIndex + 1 : '—'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
            aria-label="Close job details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable JobCard content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <JobCard
            job={job}
            isOutlier={isOutlier}
            onToggleComplete={onToggleComplete}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onToggleRoute={onToggleRoute}
            onUpdateStatus={onUpdateStatus}
            jobAccessLocked={jobAccessLocked}
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 dark:border-white/10">
          <a
            href={navLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-sm font-black uppercase text-white transition hover:bg-emerald-500"
            aria-label={`Navigate to ${job.storeName}`}
          >
            <Navigation size={15} />
            <span>Navigate</span>
          </a>
          <button
            type="button"
            onClick={onOpenInJobs}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-sm font-black uppercase text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <span>Open in Jobs</span>
          </button>
        </div>
      </section>
    </div>
  );
}
