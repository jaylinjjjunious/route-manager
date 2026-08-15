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

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Navigation, Clock, MapPin, CheckSquare, Edit2, Trash2, Copy, ArrowRightLeft, ShieldAlert, Calendar, AlertCircle, Sparkles, Hourglass, RefreshCw, CheckCircle2, RotateCcw, Camera, BookOpen } from 'lucide-react';
import type { Job, JobType } from '../../types';
import { isJobCompleted, isRevisionJob, normalizeJobLifecycleState } from './jobState';
import { formatScheduledDate, isValidScheduledDate } from './jobSchedule';
import { summarizeJobTime } from './jobLifecycle';
import { buildJobOverview, type JobOverviewActionId } from './jobOverview';
import type { JobLifecycleMutationResult } from './types';
import type { VisitEndReason } from './jobLifecycleTypes';
import InventoryCustodyPanel from '../../components/InventoryCustodyPanel';
import { JobTransitSection } from '../../components/transit/JobTransitSection';
import { isTransitApiEnabled } from '../../services/transit';
import { resolveStoreLogo } from '../../services/storeLogos';
import PreviewGuideModal from '../../features/previewGuide/PreviewGuideModal';

const SCAN_COMPATIBLE_TYPES: JobType[] = ['retail_audit', 'mystery_shop', 'merchandising'];

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
  onOpenScan?: (jobId: string) => void;
  transitOrigin?: { latitude: number; longitude: number };
  onMoveToDay?: (job: Job) => void;
  onCheckInJob?: (id: string) => JobLifecycleMutationResult;
  onMarkJobReadyToStart?: (id: string) => JobLifecycleMutationResult;
  onBlockJobBeforeStart?: (id: string, note: string) => JobLifecycleMutationResult;
  onStartJob?: (id: string) => JobLifecycleMutationResult;
  onPauseJobWork?: (id: string, note?: string) => JobLifecycleMutationResult;
  onResumeJobWork?: (id: string) => JobLifecycleMutationResult;
  onAwaitJobSupport?: (id: string, note: string) => JobLifecycleMutationResult;
  onMarkJobBlockedOnsite?: (id: string, note: string) => JobLifecycleMutationResult;
  onEndJobVisit?: (id: string, reason: VisitEndReason, note?: string) => JobLifecycleMutationResult;
  onMarkJobWorkComplete?: (id: string) => JobLifecycleMutationResult;
  onClose: () => void;
}

type LifecycleNoteAction = Extract<JobOverviewActionId, 'blocked_before_start' | 'await_support' | 'blocked_onsite' | 'end_visit' | 'pause_work'>;

const END_VISIT_REASON_OPTIONS: Array<{ value: VisitEndReason; label: string }> = [
  { value: 'completed_work', label: 'Completed work' },
  { value: 'missing_part', label: 'Missing part' },
  { value: 'awaiting_support', label: 'Awaiting support' },
  { value: 'customer_not_ready', label: 'Customer not ready' },
  { value: 'access_denied', label: 'Access denied' },
  { value: 'reschedule_required', label: 'Reschedule required' },
  { value: 'safety_issue', label: 'Safety issue' },
  { value: 'other', label: 'Other' },
];

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

const NEXT_ACTION_STYLES = {
  ready: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
  working: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200',
  blocked: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
  complete: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
};

const WARNING_STYLES = {
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
  danger: 'border-rose-500/25 bg-rose-500/10 text-rose-200',
  info: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200',
};

const formatVisitTimestamp = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Needs review';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatVisitReason = (reason?: VisitEndReason) =>
  reason ? reason.replaceAll('_', ' ') : '—';

const formatTimeSummaryMinutes = (minutes: number) => {
  const rounded = Math.round(minutes);
  if (rounded <= 0 && minutes > 0) return '<1m';
  if (rounded < 60) return `${rounded}m`;
  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

function TimeSummaryTile({ label, minutes, primary = false }: { label: string; minutes: number; primary?: boolean }) {
  return (
    <div className={`min-w-0 rounded-lg border px-2 py-2 ${primary ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
      <p className="text-[8px] font-black uppercase text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-black ${primary ? 'text-cyan-200' : 'text-slate-300'}`}>
        {formatTimeSummaryMinutes(minutes)}
      </p>
    </div>
  );
}

function JobIdentitySquare({ job }: { job: Job }) {
  const match = resolveStoreLogo({ companyId: null, texts: [job.storeName, job.notes] });
  const [failed, setFailed] = useState(false);

  if (!match || failed) {
    return <Hourglass size={20} />;
  }

  return (
    <img
      src={match.logoPath}
      alt={`${match.displayName} logo`}
      className="h-full w-full object-contain p-1"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
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
  onOpenScan,
  transitOrigin,
  onMoveToDay,
  onCheckInJob,
  onMarkJobReadyToStart,
  onBlockJobBeforeStart,
  onStartJob,
  onPauseJobWork,
  onResumeJobWork,
  onAwaitJobSupport,
  onMarkJobBlockedOnsite,
  onEndJobVisit,
  onMarkJobWorkComplete,
  onClose,
}: JobDetailModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const noteTextRef = useRef<HTMLTextAreaElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [previewGuideOpen, setPreviewGuideOpen] = useState(false);
  const [noteAction, setNoteAction] = useState<LifecycleNoteAction | null>(null);
  const [noteText, setNoteText] = useState('');
  const [endVisitReason, setEndVisitReason] = useState<VisitEndReason>('other');
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const category = getCategory(job, isOutlier);
  const isDone = isJobCompleted(job);
  const needsRevision = isRevisionJob(job);
  const overview = buildJobOverview(job, { isOutlier, jobAccessLocked });
  const lifecycle = normalizeJobLifecycleState(job);
  const timeSummary = summarizeJobTime(lifecycle);
  const secondaryTimeBuckets = [
    { label: 'Paused', minutes: timeSummary.pausedMinutes },
    { label: 'Support', minutes: timeSummary.awaitingSupportMinutes },
    { label: 'Blocked', minutes: timeSummary.blockedOnsiteMinutes },
  ].filter(bucket => bucket.minutes > 0);

  // Lock body scroll while modal is open — no position:fixed trick
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    // Trigger open animation on next frame
    requestAnimationFrame(() => setIsOpen(true));
    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
      setIsOpen(false);
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

  const handleQuickStatusChange = (statusType: 'completed' | 'revisit' | 'under_review' | 'postponed' | 'ready' | 'finished') => {
    if (jobAccessLocked && (statusType === 'completed' || statusType === 'under_review' || statusType === 'revisit' || statusType === 'finished')) return;
    if (!onUpdateStatus) {
      if (statusType === 'completed') onToggleComplete(job.id);
      return;
    }
    switch (statusType) {
      case 'completed':
        onUpdateStatus(job.id, { status: 'completed', isCompleted: true, isRevisionRequired: false, revisionStatus: 'Approved' });
        break;
      case 'finished':
        onUpdateStatus(job.id, { status: 'finished', isCompleted: true, isRevisionRequired: false, revisionStatus: 'Approved' });
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

  const handleLifecycleResult = (result: JobLifecycleMutationResult | undefined) => {
    if (!result) {
      setLifecycleError('This action is not available yet.');
      return;
    }
    if (result.transitionBlocked) {
      setLifecycleError('That lifecycle step is not available from the current state.');
      return;
    }
    setLifecycleError(null);
  };

  const openNoteSheet = (action: LifecycleNoteAction) => {
    setNoteAction(action);
    setNoteText('');
    setEndVisitReason(action === 'end_visit' ? 'other' : endVisitReason);
    setLifecycleError(null);
  };

  const closeNoteSheet = () => {
    setNoteAction(null);
    setNoteText('');
    setLifecycleError(null);
  };

  const runLifecycleAction = (actionId: JobOverviewActionId) => {
    setLifecycleError(null);
    switch (actionId) {
      case 'check_in':
        handleLifecycleResult(onCheckInJob?.(job.id));
        break;
      case 'ready_to_start':
        handleLifecycleResult(onMarkJobReadyToStart?.(job.id));
        break;
      case 'start_job':
        handleLifecycleResult(onStartJob?.(job.id));
        break;
      case 'pause_work':
        openNoteSheet('pause_work');
        break;
      case 'resume_work':
        handleLifecycleResult(onResumeJobWork?.(job.id));
        break;
      case 'blocked_before_start':
      case 'await_support':
      case 'blocked_onsite':
      case 'end_visit':
        openNoteSheet(actionId);
        break;
      case 'work_complete':
        handleLifecycleResult(onMarkJobWorkComplete?.(job.id));
        break;
      case 'closeout':
        setLifecycleError('Closeout gate is not wired yet.');
        break;
      case 'reopen':
      case 'review_details':
        setLifecycleError('This lifecycle action is not wired yet.');
        break;
    }
  };

  const submitNoteAction = () => {
    if (!noteAction) return;
    const noteField = noteTextRef.current || document.querySelector<HTMLTextAreaElement>('[data-lifecycle-note="true"]');
    const note = (noteField?.value ?? noteText).trim();
    if (noteAction !== 'pause_work' && !note) {
      setLifecycleError('Add a short reason before saving.');
      return;
    }

    if (noteAction === 'blocked_before_start') {
      handleLifecycleResult(onBlockJobBeforeStart?.(job.id, note));
    } else if (noteAction === 'await_support') {
      handleLifecycleResult(onAwaitJobSupport?.(job.id, note));
    } else if (noteAction === 'blocked_onsite') {
      handleLifecycleResult(onMarkJobBlockedOnsite?.(job.id, note));
    } else if (noteAction === 'pause_work') {
      handleLifecycleResult(onPauseJobWork?.(job.id, note || undefined));
    } else if (noteAction === 'end_visit') {
      handleLifecycleResult(onEndJobVisit?.(job.id, endVisitReason, note));
    }

    setNoteAction(null);
    setNoteText('');
  };

  const noteSheetTitle =
    noteAction === 'blocked_before_start' ? 'Why is work blocked before start?'
    : noteAction === 'await_support' ? 'What support are you waiting on?'
    : noteAction === 'blocked_onsite' ? 'What is blocking work onsite?'
    : noteAction === 'end_visit' ? 'End this visit'
    : 'Pause work';

  const notePlaceholder =
    noteAction === 'blocked_before_start' ? 'Example: manager unavailable, access denied, site not ready'
    : noteAction === 'await_support' ? 'Example: waiting for approval, remote support, missing answer'
    : noteAction === 'blocked_onsite' ? 'Example: locked case, unsafe area, missing equipment'
    : noteAction === 'end_visit' ? 'Add any handoff details for the next visit'
    : 'Optional note';

  const modalContent = (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-3 backdrop-blur-[6px] [-webkit-backdrop-filter:blur(6px)] transition-opacity duration-200 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-modal-title"
    >
      <div
        onClick={handlePanelClick}
        className={`flex w-full max-w-[430px] flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-[#111214]/[0.80] shadow-2xl backdrop-blur-[14px] [-webkit-backdrop-filter:blur(14px)] transition-all duration-200 ease-out ${isOpen ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0'}`}
        style={{ maxHeight: 'min(82dvh, 560px)' }}
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
            {/* Job overview */}
            <section aria-labelledby="job-overview-title" className="space-y-3">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleQuickStatusChange(isDone ? 'ready' : job.status === 'under_review' ? 'completed' : 'under_review')}
                  disabled={jobAccessLocked && !isDone}
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5 text-slate-500 transition hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-45"
                  title={jobAccessLocked ? 'Shower proof required first' : isDone ? 'Reactivate' : job.status === 'under_review' ? 'Complete after review' : 'Mark under review'}
                >
                  {isDone ? (
                    <CheckSquare size={20} className="text-blue-500" />
                  ) : job.status === 'under_review' ? (
                    <CheckSquare size={20} className="text-indigo-500" />
                  ) : (
                    <JobIdentitySquare job={job} />
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
                  <p id="job-overview-title" className="sr-only">Job overview</p>
                  <div className="mt-1 flex items-start gap-1 text-sm font-bold text-slate-400">
                    <MapPin size={13} className="mt-0.5 shrink-0" />
                    <span className="break-words">{job.address}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`road-pill min-h-7 px-2.5 py-0.5 text-[10px] shadow-xs border ${BADGE_STYLES[category]}`}>
                  {category === 'ready' && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />}
                  {BADGE_LABELS[category]}
                </span>
                <span className="road-pill min-h-7 px-2.5 py-0.5 text-[10px] shadow-xs border bg-cyan-950/30 text-cyan-300 border-cyan-500/20">
                  {overview.lifecycleStatusLabel} / {overview.workStateLabel}
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

              <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2">
                <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <p className="text-[9px] font-black uppercase text-slate-500">Schedule</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-300 break-words">
                    {job.scheduledDate && isValidScheduledDate(job.scheduledDate)
                      ? formatScheduledDate(job.scheduledDate)
                      : job.deadline || job.dueTime || 'Needs schedule'}
                  </p>
                </div>
                <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <p className="text-[9px] font-black uppercase text-slate-500">Pay</p>
                  <p className={`mt-0.5 text-lg font-black ${category === 'completed' ? 'text-blue-400' : 'text-emerald-400'}`}>
                    ${job.pay.toFixed(2)}
                  </p>
                </div>
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
              </div>

              <div className={`rounded-xl border px-3 py-3 ${NEXT_ACTION_STYLES[overview.nextAction.tone]}`}>
                <p className="text-[9px] font-black uppercase tracking-wider opacity-70">Next Action</p>
                <h5 className="mt-1 text-base font-black leading-tight">{overview.nextAction.title}</h5>
                <p className="mt-1 text-[11px] font-black uppercase tracking-wide opacity-75">
                  Current work state: {overview.workStateLabel}
                </p>
                <p className="mt-1 text-xs font-semibold leading-relaxed opacity-80">{overview.nextAction.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => runLifecycleAction(overview.nextAction.primaryActionId)}
                    className="min-h-10 rounded-lg bg-white/20 px-3 py-2 text-xs font-black text-white transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/40"
                  >
                    {overview.nextAction.primaryLabel}
                  </button>
                  {overview.nextAction.secondaryActions.map(action => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => runLifecycleAction(action.id)}
                      className="min-h-10 rounded-lg border border-white/15 px-3 py-2 text-xs font-black transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
                {lifecycleError && (
                  <p className="mt-2 text-[11px] font-bold text-amber-100" role="alert">
                    {lifecycleError}
                  </p>
                )}
              </div>

              {overview.warnings.length > 0 && (
                <div className="space-y-1.5" aria-label="Important job warnings">
                  {overview.warnings.slice(0, 4).map(warning => (
                    <div key={warning.label} className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-bold ${WARNING_STYLES[warning.tone]}`}>
                      <AlertCircle size={13} className="mt-0.5 shrink-0" />
                      <span>{warning.label}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-4 gap-1.5">
                {overview.summaryItems.map(item => (
                  <div key={item.label} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-center">
                    <p className="text-[8px] font-black uppercase text-slate-500">{item.label}</p>
                    <p className="mt-0.5 truncate text-[11px] font-black text-slate-300">{item.value}</p>
                  </div>
                ))}
              </div>

              {lifecycle.visits.length > 0 && (
                <div aria-label="Lifecycle time summary" className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Time Summary</p>
                    <p className="text-[9px] font-black uppercase text-slate-600">
                      {lifecycle.activeVisitId ? 'Through now' : 'Recorded'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <TimeSummaryTile label="Onsite" minutes={timeSummary.totalOnsiteMinutes} primary />
                    <TimeSummaryTile label="Active Work" minutes={timeSummary.activeWorkMinutes} primary />
                    {secondaryTimeBuckets.map(bucket => (
                      <TimeSummaryTile key={bucket.label} label={bucket.label} minutes={bucket.minutes} />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewGuideOpen(true)}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-200 transition hover:bg-cyan-500/20"
                >
                  <BookOpen size={15} />
                  Preview Guide
                </button>
                {onMoveToDay && !isDone ? (
                  <button
                    type="button"
                    onClick={() => onMoveToDay(job)}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-200 hover:bg-white/[0.08]"
                  >
                    <Calendar size={15} />
                    Move Day
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onEdit(job)}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-200 hover:bg-white/[0.08]"
                  >
                    <Edit2 size={15} />
                    Edit
                  </button>
                )}
              </div>
            </section>

            {lifecycle.visits.length > 0 && (
              <section aria-labelledby="visit-history-title" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h5 id="visit-history-title" className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Visit History
                  </h5>
                  <span className="text-[10px] font-black text-slate-500">
                    {lifecycle.activeVisitId ? 'Onsite now' : 'Offsite'}
                  </span>
                </div>
                <div className="space-y-2">
                  {lifecycle.visits.map(visit => (
                    <div
                      key={visit.id}
                      data-visit-id={visit.id}
                      className="rounded-lg border border-white/10 bg-black/10 px-2.5 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-white">Visit {visit.visitNumber}</p>
                        <p className="truncate text-[9px] font-semibold text-slate-600" title={`Visit ID: ${visit.id}`}>
                          ID {visit.id}
                        </p>
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-semibold text-slate-400">
                        <p><span className="text-slate-600">Arrived:</span> {formatVisitTimestamp(visit.arrivedAt)}</p>
                        <p><span className="text-slate-600">Started:</span> {formatVisitTimestamp(visit.startedWorkAt)}</p>
                        <p><span className="text-slate-600">Ended:</span> {formatVisitTimestamp(visit.endedAt)}</p>
                        <p className="capitalize"><span className="text-slate-600">Reason:</span> {formatVisitReason(visit.endReason)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {isTransitApiEnabled() && transitOrigin && (
              <JobTransitSection job={job} origin={transitOrigin} />
            )}

            <InventoryCustodyPanel job={job} />

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

            {/* Quick status controls — context-aware */}
            <div>
              <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
                {job.status === 'finished' ? 'Legacy Job Finished' : 'Legacy Status'}
              </p>
              {job.status === 'finished' ? (
                <div className="rounded-xl border border-gray-600/20 bg-gray-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={14} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-400">This job has been finished and removed from active route.</span>
                  </div>
                  <button
                    onClick={() => handleQuickStatusChange('ready')}
                    disabled={jobAccessLocked}
                    className="flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/10 transition disabled:opacity-45"
                  >
                    <RotateCcw size={12} />
                    <span>Restore to Today</span>
                  </button>
                </div>
              ) : job.status === 'under_review' ? (
                /* Under Review actions */
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (window.confirm('Mark this review as complete and remove the job from Today\'s Route?')) {
                        handleQuickStatusChange('finished');
                      }
                    }}
                    disabled={jobAccessLocked}
                    className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-2 py-2 text-[11px] font-black text-white transition hover:bg-emerald-500 disabled:opacity-45"
                  >
                    <CheckSquare size={14} />
                    <span>Review Complete</span>
                  </button>
                  <button
                    onClick={() => handleQuickStatusChange('revisit')}
                    disabled={jobAccessLocked}
                    className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-rose-500 bg-rose-500/20 px-2 py-2 text-[11px] font-black text-rose-300 transition hover:bg-rose-500/30 disabled:opacity-45"
                  >
                    <AlertCircle size={14} />
                    <span>Revision Required</span>
                  </button>
                </div>
              ) : needsRevision ? (
                /* Revision actions */
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleQuickStatusChange('under_review')}
                    disabled={jobAccessLocked}
                    className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-indigo-600 bg-indigo-600 px-2 py-2 text-[11px] font-black text-white transition hover:bg-indigo-500 disabled:opacity-45"
                  >
                    <RefreshCw size={14} />
                    <span>Resubmitted</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Mark this revision as finished and remove from active route?')) {
                        handleQuickStatusChange('finished');
                      }
                    }}
                    disabled={jobAccessLocked}
                    className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[11px] font-black text-slate-300 transition hover:bg-white/10 disabled:opacity-45"
                  >
                    <CheckCircle2 size={14} />
                    <span>Mark Finished</span>
                  </button>
                </div>
              ) : (
                /* Default Today actions */
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleQuickStatusChange('under_review')}
                    disabled={jobAccessLocked}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Hourglass size={14} />
                    <span>Under Review</span>
                  </button>
                  <button
                    onClick={() => handleQuickStatusChange('revisit')}
                    disabled={jobAccessLocked}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
                      'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <AlertCircle size={14} />
                    <span>Revision</span>
                  </button>
                  <button
                    onClick={() => handleQuickStatusChange('postponed')}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-black transition ${
                      'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
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
              )}
            </div>

            {/* Status History */}
            {job.statusHistory && job.statusHistory.length > 0 && (
              <div>
                <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-500">Status History</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {job.statusHistory.slice(-6).reverse().map((event, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="text-slate-600">{new Date(event.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                      <span className="text-white/30">→</span>
                      <span className="font-bold text-white/60">{event.to.replace('_', ' ')}</span>
                      {event.note && <span className="text-white/30 italic">({event.note})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Smart Aisle Scan */}
            {onOpenScan && SCAN_COMPATIBLE_TYPES.includes(job.jobType) && !isDone && job.status !== 'finished' && (
              <button
                onClick={() => onOpenScan(job.id)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-3 text-xs font-black text-cyan-300 hover:bg-cyan-500/20 transition"
              >
                <Camera size={14} />
                <span>Smart Aisle Scan</span>
              </button>
            )}

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

        {noteAction && (
          <div className="border-t border-white/10 bg-[#15171a] px-4 py-3" role="dialog" aria-modal="false" aria-labelledby="lifecycle-note-title">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h5 id="lifecycle-note-title" className="text-sm font-black text-white">{noteSheetTitle}</h5>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                  {noteAction === 'pause_work' ? 'A note is optional.' : 'A short reason is required.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeNoteSheet}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-300 hover:bg-white/15"
                aria-label="Cancel lifecycle note"
              >
                <X size={15} />
              </button>
            </div>
            {noteAction === 'end_visit' && (
              <label className="mt-3 block">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Reason</span>
                <select
                  value={endVisitReason}
                  onChange={(event) => setEndVisitReason(event.target.value as VisitEndReason)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  {END_VISIT_REASON_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="mt-3 block">
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                {noteAction === 'pause_work' ? 'Note' : 'Reason / note'}
              </span>
              <textarea
                key={noteAction}
                ref={noteTextRef}
                data-lifecycle-note="true"
                defaultValue=""
                placeholder={notePlaceholder}
                rows={3}
                className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
            </label>
            {lifecycleError && (
              <p className="mt-2 text-[11px] font-bold text-amber-300" role="alert">{lifecycleError}</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeNoteSheet}
                className="min-h-11 rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitNoteAction}
                className="min-h-11 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-black text-white hover:bg-cyan-500"
              >
                Save
              </button>
            </div>
          </div>
        )}

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

  return createPortal(<>{modalContent}{previewGuideOpen && (
    <PreviewGuideModal
      job={job}
      navLink={navLink}
      transitOrigin={transitOrigin}
      onClose={() => setPreviewGuideOpen(false)}
    />
  )}</>, document.body);
}
