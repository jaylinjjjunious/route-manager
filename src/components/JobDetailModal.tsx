/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JobDetailModal
 *
 * A focused mini page / bottom-sheet modal optimized for phone screens.
 * Uses the same design tokens as JobCard but with a responsive layout
 * specifically designed for narrow modal containers.
 * Features backdrop blur, scroll lock, and Escape key support.
 */

import React, { useEffect, useRef } from 'react';
import { X, Navigation, Clock, MapPin, CheckSquare, Edit2, Trash2, Copy, ArrowRightLeft, ShieldAlert, Calendar, AlertCircle, Sparkles, Hourglass } from 'lucide-react';
import type { Job, JobType } from '../types';
import { isJobCompleted, isRevisionJob } from '../utils/jobState';

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

function getJobTypeStyle(type: JobType) {
  switch (type) {
    case 'retail_audit':
      return 'bg-violet-950/30 text-violet-400 border-violet-900/30';
    case 'merchandising':
      return 'bg-cyan-950/30 text-cyan-400 border-cyan-900/30';
    case 'mystery_shop':
      return 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30';
    case 'field_task':
      return 'bg-amber-950/30 text-amber-400 border-amber-900/30';
    case 'process_serve':
      return 'bg-red-950/30 text-red-300 border-red-900/30';
  }
}

function formatJobType(type: JobType) {
  if (type === 'process_serve') return 'Process Serve';
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getCategory(job: Job, isOutlier: boolean) {
  const isDone = isJobCompleted(job);
  const needsRevision = isRevisionJob(job);

  if (isDone) return 'completed';
  if (job.status === 'under_review') return 'under_review';
  if (job.status === 'postponed') return 'postponed';
  if (job.routeId === 'B') return 'postponed';
  if (isOutlier || job.status === 'outlier') return 'outlier';
  if (needsRevision) return 'revisit';
  return 'ready';
}

const BADGE_STYLES: Record<string, string> = {
  ready: 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10',
  revisit: 'bg-rose-950/40 text-rose-400 border border-rose-500/10',
  under_review: 'bg-indigo-950/40 text-indigo-400 border border-indigo-500/10',
  outlier: 'bg-amber-950/40 text-amber-400 border border-amber-500/10',
  completed: 'bg-blue-950/40 text-blue-400 border border-blue-500/10',
  postponed: 'bg-slate-950/40 text-slate-400 border border-slate-500/10',
};

const BADGE_LABELS: Record<string, string> = {
  ready: 'READY',
  revisit: 'REVISION',
  under_review: 'UNDER REVIEW',
  outlier: 'RISK',
  completed: 'DONE',
  postponed: 'TOMORROW',
};

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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  const category = getCategory(job, isOutlier);
  const isDone = isJobCompleted(job);
  const needsRevision = isRevisionJob(job);

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
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus the close button on mount
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  const handlePanelClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const handleQuickStatusChange = (statusType: 'completed' | 'revisit' | 'under_review' | 'postponed' | 'ready') => {
    if (jobAccessLocked && (statusType === 'completed' || statusType === 'under_review' || statusType === 'revisit')) return;
    if (!onUpdateStatus) {
      if (statusType === 'completed') onToggleComplete(job.id);
      return;
    }
    switch (statusType) {
      case 'completed':
        onUpdateStatus(job.id, { status: 'completed', isCompleted: true, isRevisionRequired: false, revisionStatus: 'Approved' });
        break;
      case 'revisit':
        onUpdateStatus(job.id, { status: 'revisit', isCompleted: false, isRevisionRequired: true });
        break;
      case 'under_review':
        onUpdateStatus(job.id, { status: 'under_review', isCompleted: false, isRevisionRequired: false, revisionStatus: 'Under Review' });
        break;
      case 'postponed':
        onUpdateStatus(job.id, { status: 'postponed', isCompleted: false, isRevisionRequired: false });
        break;
      case 'ready':
        onUpdateStatus(job.id, { status: 'ready', isCompleted: false, isRevisionRequired: false, revisionStatus: job.revisionStatus === 'Under Review' ? undefined : job.revisionStatus });
        break;
    }
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
        onClick={handlePanelClick}
        className="flex w-full max-w-[430px] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#111214] shadow-2xl sm:rounded-2xl"
        style={{ maxHeight: 'min(84dvh, 600px)' }}
      >
        {/* Compact sticky header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
          {routeIndex !== null && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-black text-white">
              {routeIndex + 1}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-black uppercase text-slate-400">
              {legDistance > 0 && (
                <span className="flex items-center gap-1">
                  <Navigation size={11} className="text-emerald-400" />
                  {legDistance.toFixed(1)} mi
                </span>
              )}
              {rideMinutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={11} className="text-amber-400" />
                  {rideMinutes} min
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin size={11} className="text-indigo-400" />
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

        {/* Scrollable body */}
        <div
          ref={bodyRef}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-4"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="min-w-0 space-y-4">
            {/* Status badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`road-pill min-h-7 px-2.5 py-0.5 text-[10px] shadow-xs border ${BADGE_STYLES[category]}`}>
                {category === 'ready' && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />}
                {BADGE_LABELS[category]}
              </span>
              {job.priority && (
                <span className="road-pill min-h-7 px-2.5 py-0.5 text-[10px] shadow-xs border bg-slate-800/40 text-slate-400 border-slate-700/20">
                  {job.priority} Priority
                </span>
              )}
              {job.revisionStatus && job.revisionStatus !== 'None' && (
                <span className={`road-pill min-h-7 px-2.5 py-0.5 text-[10px] shadow-xs border flex items-center gap-0.5 ${
                  job.revisionStatus === 'Needs Revision'
                    ? 'bg-rose-950/40 text-rose-400 border-rose-500/20'
                    : job.revisionStatus === 'Approved'
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                    : 'bg-indigo-950/40 text-indigo-400 border-indigo-500/20'
                }`}>
                  <Sparkles size={9} />
                  <span>{job.revisionStatus}</span>
                </span>
              )}
            </div>

            {/* Job title and pay - stacked on mobile */}
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleQuickStatusChange(isDone ? 'ready' : job.status === 'under_review' ? 'completed' : 'under_review')}
                  disabled={jobAccessLocked && !isDone}
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-500 transition hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-45"
                  title={jobAccessLocked ? 'Shower proof required first' : isDone ? 'Reactivate' : job.status === 'under_review' ? 'Complete after review' : 'Mark under review'}
                >
                  {isDone ? (
                    <CheckSquare size={20} className="text-blue-500" />
                  ) : job.status === 'under_review' ? (
                    <CheckSquare size={20} className="text-indigo-500" />
                  ) : (
                    <Hourglass size={20} />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <h4
                    id="job-detail-modal-title"
                    className={`font-black text-white leading-tight text-lg break-words ${
                      isDone ? 'line-through text-slate-500' : ''
                    }`}
                  >
                    {job.storeName}
                  </h4>
                  <div className="mt-1 flex items-start gap-1 text-sm font-bold text-slate-400">
                    <MapPin size={13} className="mt-0.5 shrink-0" />
                    <span className="break-words">{job.address}</span>
                  </div>
                </div>
              </div>
              {/* Pay block - dedicated area below title */}
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <span className={`text-2xl font-black tracking-tight whitespace-nowrap ${
                  category === 'completed' ? 'text-blue-400' : 'text-emerald-400'
                }`}>
                  ${job.pay.toFixed(2)}
                </span>
                <span className="text-[10px] font-black uppercase text-slate-500">Pay</span>
              </div>
            </div>

            {/* Info grid - responsive 2-col with minmax */}
            <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2">
              <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-[9px] font-black uppercase text-slate-500">Type</p>
                <p className={`mt-0.5 text-xs font-black ${getJobTypeStyle(job.jobType)}`}>
                  <span className="inline-block rounded-md border px-1.5 py-0.5">{formatJobType(job.jobType)}</span>
                </p>
              </div>
              <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-[9px] font-black uppercase text-slate-500">Duration</p>
                <div className="mt-0.5 flex items-center gap-1 text-xs font-black text-slate-300">
                  <Clock size={11} />
                  <span>{job.estimatedMinutes} mins</span>
                </div>
              </div>
              {job.deadline ? (
                <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <p className="text-[9px] font-black uppercase text-slate-500">Deadline</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-300 break-words">{job.deadline}</p>
                </div>
              ) : job.dueTime ? (
                <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <p className="text-[9px] font-black uppercase text-slate-500">Due</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-300 break-words">{job.dueTime}</p>
                </div>
              ) : null}
            </div>

            {/* Notes */}
            {job.notes && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-[9px] font-black uppercase text-slate-500">Notes</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-400 break-words">
                  &ldquo;{job.notes}&rdquo;
                </p>
              </div>
            )}

            {/* Smart merge explanation */}
            {job.smartMergeExplanation && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2">
                <div className="flex items-start gap-1.5">
                  <ShieldAlert size={12} className="mt-0.5 shrink-0 text-blue-400" />
                  <p className="text-[11px] font-bold leading-normal text-blue-300 break-words">{job.smartMergeExplanation}</p>
                </div>
              </div>
            )}

            {/* Process serve details */}
            {job.jobType === 'process_serve' && job.processServe && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2">
                <p className="text-[9px] font-black uppercase text-red-400">Process Serve</p>
                <div className="mt-1 space-y-0.5 text-xs font-bold text-red-200">
                  {job.processServe.company && <p className="break-words">{job.processServe.company}</p>}
                  {job.processServe.caseNumber && <p className="break-words">Case: {job.processServe.caseNumber}</p>}
                  {job.processServe.partyName && <p className="break-words">Party: {job.processServe.partyName}</p>}
                  {job.processServe.attemptStatus && (
                    <p className="text-[10px] uppercase text-red-300">
                      {job.processServe.attemptStatus.replaceAll('_', ' ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Quick status controls */}
            <div>
              <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-500">Quick Status</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickStatusChange(isDone ? 'ready' : job.status === 'under_review' ? 'completed' : 'under_review')}
                  disabled={jobAccessLocked && !isDone}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    isDone
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : job.status === 'under_review'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {isDone || job.status === 'under_review' ? <CheckSquare size={14} /> : <Hourglass size={14} />}
                  <span>{isDone ? 'Done' : job.status === 'under_review' ? 'Complete' : 'Review'}</span>
                </button>
                <button
                  onClick={() => handleQuickStatusChange(needsRevision ? 'ready' : 'revisit')}
                  disabled={jobAccessLocked && !needsRevision}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    needsRevision
                      ? 'border-rose-600 bg-rose-600 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <AlertCircle size={14} />
                  <span>{needsRevision ? 'Needs Fix' : 'Revision'}</span>
                </button>
                <button
                  onClick={() => handleQuickStatusChange(job.status === 'under_review' ? 'ready' : 'under_review')}
                  disabled={jobAccessLocked && job.status !== 'under_review'}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    job.status === 'under_review'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Hourglass size={14} />
                  <span>{job.status === 'under_review' ? 'Reviewing' : 'Under Review'}</span>
                </button>
                <button
                  onClick={() => handleQuickStatusChange(job.status === 'postponed' ? 'ready' : 'postponed')}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-black transition ${
                    job.status === 'postponed'
                      ? 'border-slate-700 bg-slate-700 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Calendar size={14} />
                  <span>Tomorrow</span>
                </button>
                <button
                  onClick={() => onToggleRoute(job.id)}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-black transition ${
                    job.routeId === 'B'
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <ArrowRightLeft size={14} />
                  <span>{job.routeId === 'B' ? 'Route A' : 'Route B'}</span>
                </button>
              </div>
            </div>

            {/* Admin row */}
            <div className="flex items-center justify-between border-t border-dashed border-white/10 pt-3">
              <span className="text-[9px] font-medium text-slate-500">ID: {job.id.split('-').pop()}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEdit(job)}
                  title="Edit job"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => onDuplicate(job)}
                  title="Duplicate job"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <Copy size={13} />
                </button>
                <button
                  onClick={() => onDelete(job.id)}
                  title="Delete job"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:bg-rose-950/30 hover:text-rose-400"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Shower gate warning */}
            {!jobAccessLocked ? null : (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                <span className="text-[11px] font-bold text-amber-300">
                  Shower verification required to complete actions. Details are view-only.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed sticky footer */}
        <div className="flex shrink-0 items-center gap-2 border-t border-white/10 px-4 py-3">
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
