import type { Job } from '../../types';
import { isJobCompleted, isRevisionJob, normalizeJobLifecycleState } from './jobState';
import { isValidScheduledDate } from './jobSchedule';

export type JobOverviewActionId =
  | 'check_in'
  | 'ready_to_start'
  | 'blocked_before_start'
  | 'start_job'
  | 'pause_work'
  | 'resume_work'
  | 'await_support'
  | 'blocked_onsite'
  | 'end_visit'
  | 'work_complete'
  | 'closeout'
  | 'reopen'
  | 'review_details';

export interface JobOverviewSecondaryAction {
  id: JobOverviewActionId;
  label: string;
}

export interface JobOverviewAction {
  title: string;
  description: string;
  primaryActionId: JobOverviewActionId;
  primaryLabel: string;
  secondaryActions: JobOverviewSecondaryAction[];
  secondaryLabels: string[];
  tone: 'ready' | 'working' | 'blocked' | 'complete';
}

export interface JobOverviewWarning {
  label: string;
  tone: 'warning' | 'danger' | 'info';
}

export interface JobOverviewSummaryItem {
  label: string;
  value: string;
}

export interface JobOverviewModel {
  lifecycleStatusLabel: string;
  workStateLabel: string;
  nextAction: JobOverviewAction;
  warnings: JobOverviewWarning[];
  summaryItems: JobOverviewSummaryItem[];
}

const labelize = (value: string) =>
  value.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

export function buildJobOverview(job: Job, options: { isOutlier?: boolean; jobAccessLocked?: boolean } = {}): JobOverviewModel {
  const lifecycle = normalizeJobLifecycleState(job);
  const status = lifecycle.status;
  const workState = lifecycle.workState;
  const activeVisit = lifecycle.activeVisitId ? lifecycle.visits.find(visit => visit.id === lifecycle.activeVisitId) : null;

  let nextAction: JobOverviewAction;

  if (status === 'completed') {
    nextAction = {
      title: 'Closeout complete',
      description: 'This lifecycle is completed. Reopen only if new work or missing proof is found.',
      primaryActionId: 'reopen',
      primaryLabel: 'Reopen if necessary',
      secondaryActions: [],
      secondaryLabels: [],
      tone: 'complete',
    };
  } else if (status === 'work_complete_pending_closeout') {
    nextAction = {
      title: 'Work Complete — Pending Closeout',
      description: 'Work is marked complete. Confirm proof, notes, and any required wrap-up.',
      primaryActionId: 'closeout',
      primaryLabel: 'Closeout',
      secondaryActions: [],
      secondaryLabels: [],
      tone: 'complete',
    };
  } else if (status === 'in_progress') {
    if (workState === 'awaiting_support') {
      nextAction = {
        title: 'Waiting on support',
        description: 'Resume when support clears the issue, or end this visit if you need to return later.',
        primaryActionId: 'resume_work',
        primaryLabel: 'Resume Work',
        secondaryActions: [{ id: 'work_complete', label: 'Work Complete' }, { id: 'end_visit', label: 'End Visit' }],
        secondaryLabels: ['Work Complete', 'End Visit'],
        tone: 'blocked',
      };
    } else if (workState === 'blocked_onsite') {
      nextAction = {
        title: 'Blocked onsite',
        description: 'Resolve or document the blocker before continuing.',
        primaryActionId: 'resume_work',
        primaryLabel: 'Resume Work',
        secondaryActions: [{ id: 'await_support', label: 'Await Support' }, { id: 'work_complete', label: 'Work Complete' }, { id: 'end_visit', label: 'End Visit' }],
        secondaryLabels: ['Await Support', 'Work Complete', 'End Visit'],
        tone: 'blocked',
      };
    } else if (workState === 'paused') {
      nextAction = {
        title: 'Work paused',
        description: 'Resume the active visit when you are ready to continue.',
        primaryActionId: 'resume_work',
        primaryLabel: 'Resume Work',
        secondaryActions: [{ id: 'await_support', label: 'Await Support' }, { id: 'work_complete', label: 'Work Complete' }, { id: 'end_visit', label: 'End Visit' }],
        secondaryLabels: ['Await Support', 'Work Complete', 'End Visit'],
        tone: 'working',
      };
    } else {
      nextAction = {
        title: 'Continue onsite work',
        description: 'You are checked in and actively working this job.',
        primaryActionId: 'pause_work',
        primaryLabel: 'Pause Work',
        secondaryActions: [{ id: 'await_support', label: 'Await Support' }, { id: 'blocked_onsite', label: 'Blocked Onsite' }, { id: 'work_complete', label: 'Work Complete' }, { id: 'end_visit', label: 'End Visit' }],
        secondaryLabels: ['Await Support', 'Blocked Onsite', 'Work Complete', 'End Visit'],
        tone: 'working',
      };
    }
  } else if (status === 'ready' && workState === 'ready_to_start') {
    const secondaryActions: JobOverviewSecondaryAction[] = [{ id: 'blocked_before_start', label: 'Blocked Before Start' }];
    if (activeVisit) secondaryActions.push({ id: 'end_visit', label: 'End Visit' });
    nextAction = {
      title: 'Start the job',
      description: 'You are checked in and ready to begin the work.',
      primaryActionId: 'start_job',
      primaryLabel: 'Start Job',
      secondaryActions,
      secondaryLabels: secondaryActions.map(action => action.label),
      tone: 'ready',
    };
  } else if (activeVisit || status === 'arrived') {
    const secondaryActions: JobOverviewSecondaryAction[] = [{ id: 'blocked_before_start', label: 'Blocked Before Start' }];
    if (activeVisit) secondaryActions.push({ id: 'end_visit', label: 'End Visit' });
    nextAction = {
      title: 'Confirm readiness',
      description: 'You are onsite. Mark ready to start, or capture why work cannot begin.',
      primaryActionId: 'ready_to_start',
      primaryLabel: 'Ready to Start',
      secondaryActions,
      secondaryLabels: secondaryActions.map(action => action.label),
      tone: workState === 'blocked_before_start' ? 'blocked' : 'ready',
    };
  } else if (status === 'cancelled') {
    nextAction = {
      title: 'Review cancelled job',
      description: 'This lifecycle is cancelled. Confirm whether it should stay closed or be restored.',
      primaryActionId: 'review_details',
      primaryLabel: 'Review Details',
      secondaryActions: [],
      secondaryLabels: [],
      tone: 'blocked',
    };
  } else {
    nextAction = {
      title: 'Go to the location',
      description: 'This job has not been checked in yet.',
      primaryActionId: 'check_in',
      primaryLabel: 'Arrive / Check In',
      secondaryActions: [],
      secondaryLabels: [],
      tone: 'ready',
    };
  }

  const warnings: JobOverviewWarning[] = [];
  if (options.jobAccessLocked) warnings.push({ label: 'Shower verification required before completion actions.', tone: 'warning' });
  if (!job.address.trim()) warnings.push({ label: 'Missing address.', tone: 'danger' });
  if (!job.coordinates || !Number.isFinite(job.coordinates.lat) || !Number.isFinite(job.coordinates.lng)) warnings.push({ label: 'Missing usable coordinates.', tone: 'warning' });
  if (!job.deadline && !job.dueTime) warnings.push({ label: 'Missing schedule or due time.', tone: 'warning' });
  if (job.scheduledDate && !isValidScheduledDate(job.scheduledDate)) warnings.push({ label: 'Scheduled date needs review.', tone: 'warning' });
  if (options.isOutlier || job.status === 'outlier') warnings.push({ label: 'Route outlier: review travel impact before committing.', tone: 'warning' });
  if (isRevisionJob(job)) warnings.push({ label: 'Revision required.', tone: 'danger' });
  if (job.status === 'under_review') warnings.push({ label: 'Legacy status is under review; lifecycle may differ.', tone: 'info' });
  if (isJobCompleted(job) && status !== 'completed') warnings.push({ label: 'Legacy status says complete, but lifecycle is not closed out.', tone: 'warning' });
  if (!isJobCompleted(job) && status === 'completed') warnings.push({ label: 'Lifecycle is completed while legacy status remains active.', tone: 'info' });

  return {
    lifecycleStatusLabel: labelize(status),
    workStateLabel: labelize(workState),
    nextAction,
    warnings,
    summaryItems: [
      { label: 'Legacy', value: labelize(job.status) },
      { label: 'Route', value: job.routeId },
      { label: 'Visits', value: String(lifecycle.visits.length) },
      { label: 'Events', value: String(lifecycle.events.length) },
    ],
  };
}
