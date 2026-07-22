/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JobDetailModal
 *
 * A focused mini page / bottom-sheet modal that displays a full JobCard
 * for a selected route stop from the Dashboard "Today's Route" section.
 * Reuses the JobCard component as the single source of truth for job-detail design.
 * Features backdrop blur, scroll lock, and Escape key support.
 */

import React, { useEffect, useRef } from 'react';
import { X, Navigation, Clock, MapPin } from 'lucide-react';
import JobCard from './JobCard';
import type { Job } from '../types';

interface JobDetailModalProps {
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
  onClose: () => void;
}

export default function JobDetailModal({
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
  onClose,
}: JobDetailModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // Lock body scroll while modal is open
  useEffect(() => {
    scrollPositionRef.current = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;

    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollPositionRef.current}px`;
    body.style.width = '100%';

    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollPositionRef.current);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus the close button on mount for accessibility
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handlePanelClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-3 backdrop-blur-[10px] [-webkit-backdrop-filter:blur(10px)] sm:items-center sm:p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-modal-title"
    >
      <div
        ref={panelRef}
        onClick={handlePanelClick}
        className="flex max-h-[84vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#111214] shadow-2xl sm:rounded-2xl"
      >
        {/* Compact route-info header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            {routeIndex !== null && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-black text-white">
                {routeIndex + 1}
              </span>
            )}
            <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400">
              {legDistance > 0 && (
                <span className="flex items-center gap-1">
                  <Navigation size={12} className="text-emerald-400" />
                  {legDistance.toFixed(1)} mi
                </span>
              )}
              {rideMinutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-amber-400" />
                  {rideMinutes} min
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin size={12} className="text-indigo-400" />
                Stop {routeIndex !== null ? routeIndex + 1 : '—'}
              </span>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-400 transition hover:bg-white/15 hover:text-white"
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
        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
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
        </div>
      </div>
    </div>
  );
}
