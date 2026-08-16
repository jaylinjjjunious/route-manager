import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Job, JobType } from '../../types';
import safeStorage from '../../utils/safeStorage';
import { BAKERSFIELD_COORDINATES } from '../../utils/bakersfieldCoordinates';
import {
  arriveAtJob as applyArriveAtJob,
  blockBeforeStart as applyBlockBeforeStart,
  completeJobCloseout as applyCompleteJobCloseout,
  endJobVisit as applyEndJobVisit,
  markJobWorkComplete as applyMarkJobWorkComplete,
  markReadyToStart as applyMarkReadyToStart,
  reopenCompletedJob as applyReopenCompletedJob,
  setJobWorkState,
  startJobWork as applyStartJobWork,
} from './jobLifecycle';
import type { JobLifecycleState, VisitEndReason } from './jobLifecycleTypes';
import {
  JOB_STATE_SCHEMA_VERSION,
  isJobCompleted,
  isJobFinished,
  normalizeJobState,
  normalizeJobsForStorage,
  migrateJobSchedules,
  recordStatusTransition,
} from './jobState';
import {
  addDays,
  effectiveDay,
  todayString,
  isValidScheduledDate,
  isActionableJob,
  groupJobsByDay,
  isOverdue,
  type ScheduledDaySummary,
} from './jobSchedule';
import {
  ensureLifecycleHarnessJob,
  resetLifecycleHarnessJob,
  satisfyLifecycleHarnessCloseoutRequirements,
} from './jobLifecycleHarness';
import {
  ensureSonicProcedureHarnessJobs,
  resetSonicProcedureHarnessJobs,
} from './sonicProcedureHarness';
import type { RouteFilterType } from './RouteFilter';
import { filterJobsByType } from './RouteFilter';
import type { JobLifecycleMutationResult, JobMutationResult } from './types';
import {
  assignProcedureToJob,
  changeProcedureAssignmentWithConfirmation,
  type ProcedureAssignmentInput,
  type ProcedureAssignmentResult,
} from './procedures/jobProcedureAssignment';
import type { ProcedureDefinition } from './procedures/types';

export const SEED_JOBS: Job[] = [
  {
    id: 'seed-1',
    storeName: 'Family Dollar',
    address: 'Family Dollar 600 Norris Rd',
    pay: 11.50,
    estimatedMinutes: 15,
    jobType: 'field_task',
    dueTime: '12:00 PM',
    notes: 'Verify shelf placement of laundry detergents.',
    status: 'ready',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Family Dollar 600 Norris Rd']
  },
  {
    id: 'seed-2',
    storeName: 'Family Dollar',
    address: 'Family Dollar 2151 S Chester Ave',
    pay: 14.00,
    estimatedMinutes: 20,
    jobType: 'retail_audit',
    dueTime: '02:00 PM',
    notes: 'Photograph endcap displaying seasonal candy.',
    status: 'ready',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Family Dollar 2151 S Chester Ave']
  },
  {
    id: 'seed-3',
    storeName: 'Dollar General',
    address: 'Dollar General 5101 White Ln',
    pay: 16.50,
    estimatedMinutes: 25,
    jobType: 'merchandising',
    dueTime: '03:30 PM',
    notes: 'Restock soda displays and apply promotional price stickers.',
    status: 'ready',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Dollar General 5101 White Ln']
  },
  {
    id: 'seed-4',
    storeName: 'Vons Revisit',
    address: 'Vons 9000 Ming Ave',
    pay: 23.00,
    estimatedMinutes: 30,
    jobType: 'mystery_shop',
    dueTime: '05:00 PM',
    notes: 'Re-audit photo quality of customer service evaluation at bakery.',
    status: 'revisit',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Vons 9000 Ming Ave']
  },
  {
    id: 'seed-5',
    storeName: 'Target',
    address: 'Target 9100 Rosedale Hwy',
    pay: 18.00,
    estimatedMinutes: 20,
    jobType: 'retail_audit',
    dueTime: '06:00 PM',
    notes: 'Audit electronics displays and verify lockbox keys present.',
    status: 'ready',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Target 9100 Rosedale Hwy']
  },
  {
    id: 'seed-6',
    storeName: 'Albertsons Revisit',
    address: 'Albertsons 13045 Rosedale Hwy',
    pay: 12.00,
    estimatedMinutes: 20,
    jobType: 'merchandising',
    dueTime: '04:00 PM',
    notes: 'Resubmit photo proof of greeting card displays.',
    status: 'revisit',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Albertsons 13045 Rosedale Hwy']
  },
  {
    id: 'seed-7',
    storeName: 'Tractor Supply / Buck Café Revisit',
    address: 'Tractor Supply / Buck Café Revisit: 2620 Buck Owens Blvd',
    pay: 15.00,
    estimatedMinutes: 15,
    jobType: 'field_task',
    dueTime: '01:30 PM',
    notes: 'Confirm display corrected at front register area.',
    status: 'revisit',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Tractor Supply / Buck Café Revisit: 2620 Buck Owens Blvd']
  },
  {
    id: 'seed-8',
    storeName: 'BevMo',
    address: 'BevMo 10650 Stockdale Hwy #500',
    pay: 42.00,
    estimatedMinutes: 35,
    jobType: 'mystery_shop',
    dueTime: '08:00 PM',
    notes: 'Evaluate wine cellar stocking and purchase age verification.',
    status: 'ready',
    routeId: 'B',
    coordinates: BAKERSFIELD_COORDINATES['BevMo 10650 Stockdale Hwy #500']
  }
];

export interface UseJobsReturn {
  /* ── Core state ── */
  jobs: Job[];
  selectedStripDate: string | null;
  showScheduleReview: 'overdue' | 'unscheduled' | null;
  moveToDayJob: Job | null;
  editingJob: Job | null;
  defaultJobType: JobType;
  routeFilter: RouteFilterType;
  completingJobIds: string[];

  /* ── UI state setters ── */
  setSelectedStripDate: Dispatch<SetStateAction<string | null>>;
  setShowScheduleReview: Dispatch<SetStateAction<'overdue' | 'unscheduled' | null>>;
  setMoveToDayJob: Dispatch<SetStateAction<Job | null>>;
  setEditingJob: Dispatch<SetStateAction<Job | null>>;
  setDefaultJobType: Dispatch<SetStateAction<JobType>>;
  setRouteFilter: Dispatch<SetStateAction<RouteFilterType>>;
  setCompletingJobIds: Dispatch<SetStateAction<string[]>>;

  /* ── Boundary method ── */
  replaceJobs: (nextJobs: Job[]) => void;

  /* ── Pure job actions (return next Job[] so orchestrator can optimize + persist) ── */
  deleteJob: (id: string) => Job[];
  saveJob: (jobData: Omit<Job, 'id'> & { id?: string }) => Job[];
  importJobs: (newJobsData: Omit<Job, 'id'>[]) => Job[];
  duplicateJob: (job: Job) => Job[];
  toggleRoute: (id: string) => Job[];
  moveJobRoute: (id: string, routeId: 'A' | 'B') => Job[];
  moveJobToDate: (id: string, date: string | null) => Job[];
  moveUnfinishedToTomorrow: () => Job[];
  quickMoveToB: (id: string) => Job[];
  updateJobStatus: (id: string, updates: Partial<Job>) => JobMutationResult;
  toggleJobComplete: (id: string) => JobMutationResult;
  markJobUnderReview: (id: string) => JobMutationResult;
  checkInJob: (id: string, timestamp?: string) => JobLifecycleMutationResult;
  markJobReadyToStart: (id: string, timestamp?: string) => JobLifecycleMutationResult;
  blockJobBeforeStart: (id: string, note: string, timestamp?: string) => JobLifecycleMutationResult;
  startJob: (id: string, timestamp?: string) => JobLifecycleMutationResult;
  pauseJobWork: (id: string, note?: string, timestamp?: string) => JobLifecycleMutationResult;
  resumeJobWork: (id: string, timestamp?: string) => JobLifecycleMutationResult;
  awaitJobSupport: (id: string, note?: string, timestamp?: string) => JobLifecycleMutationResult;
  markJobBlockedOnsite: (id: string, note?: string, timestamp?: string) => JobLifecycleMutationResult;
  endJobVisit: (id: string, reason: VisitEndReason, note?: string, timestamp?: string) => JobLifecycleMutationResult;
  markJobWorkComplete: (id: string, timestamp?: string) => JobLifecycleMutationResult;
  completeJobCloseout: (id: string, timestamp?: string) => JobLifecycleMutationResult;
  reopenCompletedJob: (id: string, reason: string, timestamp?: string) => JobLifecycleMutationResult;
  assignJobProcedure: (
    id: string,
    input: ProcedureAssignmentInput,
    procedure?: ProcedureDefinition,
    confirmed?: boolean,
  ) => ProcedureAssignmentResult;
  resetLifecycleHarnessJob: () => Job[];
  satisfyLifecycleHarnessCloseoutRequirements: () => Job[];
  resetSonicProcedureHarness: () => Job[];

  /* ── Derived job / scheduling values ── */
  routeAJobs: Job[];
  routeBJobs: Job[];
  todayRouteJobs: Job[];
  executableRouteJobs: Job[];
  tomorrowJobs: Job[];
  overdueJobs: Job[];
  unscheduledJobs: Job[];
  weeklyDays: ScheduledDaySummary[];
  todayDay: ScheduledDaySummary | undefined;
  selectedDay: ScheduledDaySummary | null;
  routeFilterCounts: Record<RouteFilterType, number>;
  filteredRouteJobs: Job[];
}

export interface UseJobsOptions {
  includeLifecycleHarness?: boolean;
  includeSonicProcedureHarness?: boolean;
}

export function useJobs(today: string, options: UseJobsOptions = {}): UseJobsReturn {
  /* ── Core state ── */
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedStripDate, setSelectedStripDate] = useState<string | null>(null);
  const [showScheduleReview, setShowScheduleReview] = useState<'overdue' | 'unscheduled' | null>(null);
  const [moveToDayJob, setMoveToDayJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [defaultJobType, setDefaultJobType] = useState<JobType>('retail_audit');
  const [routeFilter, setRouteFilter] = useState<RouteFilterType>('today');
  const [completingJobIds, setCompletingJobIds] = useState<string[]>([]);
  const includeLifecycleHarness = options.includeLifecycleHarness === true;
  const includeSonicProcedureHarness = options.includeSonicProcedureHarness === true;

  /* ── Persistence boundary ── */
  const persistJobs = (nextJobs: Job[]): Job[] => {
    const normalized = normalizeJobsForStorage(nextJobs);
    setJobs(normalized);
    safeStorage.setItem('route_optimizer_jobs', JSON.stringify(normalized));
    safeStorage.setItem('route_optimizer_jobs_schema_version', JOB_STATE_SCHEMA_VERSION);
    return normalized;
  };

  const replaceJobs = (nextJobs: Job[]) => {
    persistJobs(nextJobs);
  };

  useEffect(() => {
    const savedJobs = safeStorage.getItem('route_optimizer_jobs');
    if (savedJobs) {
      try {
        const parsedJobs = JSON.parse(savedJobs);
        const rawJobs = Array.isArray(parsedJobs) && parsedJobs.length > 0
          ? parsedJobs
          : SEED_JOBS;
        let legacyMovedIds: string[] = [];
        try {
          const moved = safeStorage.getItem('jobs_moved_to_tomorrow');
          if (moved) {
            const parsed = JSON.parse(moved);
            if (Array.isArray(parsed)) legacyMovedIds = parsed;
          }
        } catch {
          // Legacy list unreadable — fall through with no migration targets.
        }
        const migrated = migrateJobSchedules(rawJobs, legacyMovedIds, today);
        let withHarnesses = ensureLifecycleHarnessJob(migrated.jobs, includeLifecycleHarness, today);
        withHarnesses = ensureSonicProcedureHarnessJobs(withHarnesses, includeSonicProcedureHarness, today);
        replaceJobs(withHarnesses);
        if (migrated.changed) {
          safeStorage.removeItem('jobs_moved_to_tomorrow');
        }
      } catch {
        let withHarnesses = ensureLifecycleHarnessJob(normalizeJobsForStorage(SEED_JOBS), includeLifecycleHarness, today);
        withHarnesses = ensureSonicProcedureHarnessJobs(withHarnesses, includeSonicProcedureHarness, today);
        replaceJobs(withHarnesses);
      }
    } else {
      let withHarnesses = ensureLifecycleHarnessJob(normalizeJobsForStorage(SEED_JOBS), includeLifecycleHarness, today);
      withHarnesses = ensureSonicProcedureHarnessJobs(withHarnesses, includeSonicProcedureHarness, today);
      replaceJobs(withHarnesses);
    }
  }, []);

  /* ── Pure job actions (mutate state, return next collection, do NOT persist) ── */
  const deleteJob = (id: string): Job[] => {
    const updated = jobs.filter(job => job.id !== id);
    setJobs(normalizeJobsForStorage(updated));
    return updated;
  };

  const saveJob = (jobData: Omit<Job, 'id'> & { id?: string }): Job[] => {
    if (jobData.id) {
      const updated = jobs.map(job =>
        job.id === jobData.id ? { ...job, ...jobData } : job
      ) as Job[];
      setJobs(normalizeJobsForStorage(updated));
      return updated;
    } else {
      const newJob: Job = {
        ...jobData,
        id: `job-${Date.now()}`
      };
      const updated = [...jobs, newJob];
      setJobs(normalizeJobsForStorage(updated));
      return updated;
    }
  };

  const importJobs = (newJobsData: Omit<Job, 'id'>[]): Job[] => {
    const newJobs: Job[] = newJobsData.map((jd, index) => ({
      ...jd,
      id: `job-imported-${Date.now()}-${index}`
    }));
    const updated = [...jobs, ...newJobs];
    setJobs(normalizeJobsForStorage(updated));
    return updated;
  };

  const duplicateJob = (job: Job): Job[] => {
    const duplicate: Job = {
      ...job,
      id: `job-${Date.now()}`,
      storeName: `${job.storeName} (Copy)`,
      status: 'ready',
      isCompleted: false,
      isRevisionRequired: false
    };
    const updated = [...jobs, duplicate];
    setJobs(normalizeJobsForStorage(updated));
    return updated;
  };

  const toggleRoute = (id: string): Job[] => {
    const updated = jobs.map(job =>
      job.id === id ? { ...job, routeId: (job.routeId === 'A' ? 'B' : 'A') as 'A' | 'B' } : job
    );
    setJobs(normalizeJobsForStorage(updated));
    return updated;
  };

  const moveJobRoute = (id: string, routeId: 'A' | 'B'): Job[] => {
    const updated = jobs.map(job =>
      job.id === id ? { ...job, routeId } : job
    );
    setJobs(normalizeJobsForStorage(updated));
    return updated;
  };

  const moveJobToDate = (id: string, date: string | null): Job[] => {
    const target = jobs.find(j => j.id === id);
    if (!target) return jobs;
    if (date !== null && !isValidScheduledDate(date)) return jobs;
    const isToday = date === today;
    const updated = jobs.map(job =>
      job.id === id
        ? {
            ...job,
            scheduledDate: date ?? undefined,
            routeId: date === null ? job.routeId : isToday ? ('A' as const) : ('B' as const),
          }
        : job
    );
    setJobs(normalizeJobsForStorage(updated));
    setMoveToDayJob(null);
    if (date) setSelectedStripDate(date);
    return updated;
  };

  const moveUnfinishedToTomorrow = (): Job[] => {
    const tomorrow = addDays(today, 1);
    const unfinishedRouteAJobs = jobs.filter(
      j => j.routeId === 'A' && !isJobFinished(j) && !isJobCompleted(j) && effectiveDay(j, today) === today
    );
    const updatedJobs = jobs.map(j => {
      if (unfinishedRouteAJobs.some(u => u.id === j.id)) {
        return { ...j, scheduledDate: tomorrow, routeId: 'B' as const };
      }
      if (j.routeId === 'A' && isJobCompleted(j)) {
        return { ...j, routeId: 'B' as const };
      }
      return j;
    });
    setJobs(normalizeJobsForStorage(updatedJobs));
    return updatedJobs;
  };

  const quickMoveToB = (id: string): Job[] => {
    const updated = jobs.map(job =>
      job.id === id ? { ...job, routeId: 'B' as const } : job
    );
    setJobs(normalizeJobsForStorage(updated));
    return updated;
  };

  const buildMutationResult = (
    previousJob: Job | null,
    nextJobs: Job[],
  ): JobMutationResult => {
    const updatedJob = previousJob
      ? nextJobs.find(job => job.id === previousJob.id) || null
      : null;

    return {
      previousJob,
      updatedJob,
      nextJobs,
      becameCompleted: Boolean(previousJob && updatedJob && isJobCompleted(updatedJob) && !isJobCompleted(previousJob)),
      becameFinished: Boolean(previousJob && updatedJob && updatedJob.status === 'finished' && previousJob.status !== 'finished'),
    };
  };

  const missingJobMutation = (): JobMutationResult => ({
    previousJob: null,
    updatedJob: null,
    nextJobs: jobs,
    becameCompleted: false,
    becameFinished: false,
  });

  const missingLifecycleMutation = (): JobLifecycleMutationResult => ({
    ...missingJobMutation(),
    lifecycleChanged: false,
    transitionBlocked: true,
  });

  const buildLifecycleMutationResult = (
    previousJob: Job,
    nextJobs: Job[],
    lifecycleChanged: boolean,
    transitionBlocked: boolean,
  ): JobLifecycleMutationResult => ({
    ...buildMutationResult(previousJob, nextJobs),
    lifecycleChanged,
    transitionBlocked,
  });

  const applyJobLifecycleTransition = (
    id: string,
    transition: (state: JobLifecycleState) => JobLifecycleState,
  ): JobLifecycleMutationResult => {
    const previousJob = jobs.find(job => job.id === id) || null;
    if (!previousJob) return missingLifecycleMutation();

    const normalizedPreviousJob = normalizeJobState(previousJob);
    const previousLifecycle = normalizedPreviousJob.lifecycle;
    if (!previousLifecycle) return missingLifecycleMutation();

    const nextLifecycle = transition(previousLifecycle);
    if (nextLifecycle === previousLifecycle) {
      return buildLifecycleMutationResult(previousJob, jobs, false, true);
    }

    const updatedJobs = jobs.map(job =>
      job.id === id
        ? normalizeJobState({ ...normalizedPreviousJob, lifecycle: nextLifecycle })
        : job
    );
    const nextJobs = persistJobs(updatedJobs);
    return buildLifecycleMutationResult(previousJob, nextJobs, true, false);
  };

  const updateJobStatus = (id: string, updates: Partial<Job>): JobMutationResult => {
    const previousJob = jobs.find(job => job.id === id) || null;
    if (!previousJob) return missingJobMutation();

    const updatedJobs = jobs.map(job => {
      if (job.id !== id) return job;
      let patched = { ...job, ...updates };
      if (updates.status && updates.status !== job.status) {
        patched = recordStatusTransition(patched, updates.status);
      }
      return normalizeJobState(patched);
    });
    const nextJobs = normalizeJobsForStorage(updatedJobs);
    setJobs(nextJobs);
    return buildMutationResult(previousJob, nextJobs);
  };

  const toggleJobComplete = (id: string): JobMutationResult => {
    const previousJob = jobs.find(job => job.id === id) || null;
    if (!previousJob) return missingJobMutation();

    const updatedJobs = jobs.map(job =>
      job.id === id
        ? normalizeJobState({
            ...job,
            status: isJobCompleted(job) ? 'ready' : 'completed',
            isCompleted: !isJobCompleted(job),
            revisionStatus: isJobCompleted(job) ? undefined : 'Approved'
          })
        : job
    );
    const nextJobs = normalizeJobsForStorage(updatedJobs);
    setJobs(nextJobs);
    return buildMutationResult(previousJob, nextJobs);
  };

  const markJobUnderReview = (id: string): JobMutationResult => updateJobStatus(id, {
    status: 'under_review',
    isCompleted: false,
    isRevisionRequired: false,
    revisionStatus: 'Under Review'
  });

  const checkInJob = (id: string, timestamp?: string): JobLifecycleMutationResult =>
    applyJobLifecycleTransition(id, lifecycle => applyArriveAtJob(lifecycle, timestamp));

  const markJobReadyToStart = (id: string, timestamp?: string): JobLifecycleMutationResult =>
    applyJobLifecycleTransition(id, lifecycle => applyMarkReadyToStart(lifecycle, timestamp));

  const blockJobBeforeStart = (id: string, note: string, timestamp?: string): JobLifecycleMutationResult =>
    applyJobLifecycleTransition(id, lifecycle => applyBlockBeforeStart(lifecycle, note, timestamp));

  const startJob = (id: string, timestamp?: string): JobLifecycleMutationResult =>
    applyJobLifecycleTransition(id, lifecycle => applyStartJobWork(lifecycle, timestamp));

  const pauseJobWork = (id: string, note?: string, timestamp?: string): JobLifecycleMutationResult =>
    applyJobLifecycleTransition(id, lifecycle => setJobWorkState(lifecycle, 'paused', note, timestamp));

  const resumeJobWork = (id: string, timestamp?: string): JobLifecycleMutationResult =>
    applyJobLifecycleTransition(id, lifecycle => setJobWorkState(lifecycle, 'working', undefined, timestamp));

  const awaitJobSupport = (id: string, note?: string, timestamp?: string): JobLifecycleMutationResult =>
    applyJobLifecycleTransition(id, lifecycle => setJobWorkState(lifecycle, 'awaiting_support', note, timestamp));

  const markJobBlockedOnsite = (id: string, note?: string, timestamp?: string): JobLifecycleMutationResult =>
    applyJobLifecycleTransition(id, lifecycle => setJobWorkState(lifecycle, 'blocked_onsite', note, timestamp));

  const endJobVisit = (id: string, reason: VisitEndReason, note?: string, timestamp?: string): JobLifecycleMutationResult =>
    applyJobLifecycleTransition(id, lifecycle => applyEndJobVisit(lifecycle, reason, note, timestamp));

  const markJobWorkComplete = (id: string, timestamp?: string): JobLifecycleMutationResult =>
    applyJobLifecycleTransition(id, lifecycle => applyMarkJobWorkComplete(lifecycle, timestamp));

  const completeJobCloseout = (id: string, timestamp?: string): JobLifecycleMutationResult =>
    applyJobLifecycleTransition(id, lifecycle => applyCompleteJobCloseout(lifecycle, timestamp));

  const reopenCompletedJob = (id: string, reason: string, timestamp?: string): JobLifecycleMutationResult =>
    applyJobLifecycleTransition(id, lifecycle => applyReopenCompletedJob(lifecycle, reason, timestamp));

  const assignJobProcedure = (
    id: string,
    input: ProcedureAssignmentInput,
    procedure?: ProcedureDefinition,
    confirmed = false,
  ): ProcedureAssignmentResult => {
    const previousJob = jobs.find(job => job.id === id) || null;
    if (!previousJob) {
      return {
        status: 'rejected',
        job: normalizeJobState({
          id,
          storeName: '',
          address: '',
          pay: 0,
          estimatedMinutes: 0,
          jobType: 'field_task',
          dueTime: '',
          notes: '',
          status: 'ready',
          routeId: 'A',
          coordinates: { lat: 0, lng: 0 },
        }),
        errors: [{ code: 'JOB_NOT_FOUND', message: 'Job was not found.', path: 'jobId' }],
        confirmationRequired: false,
      };
    }

    const result = confirmed
      ? changeProcedureAssignmentWithConfirmation(previousJob, input, procedure)
      : assignProcedureToJob(previousJob, input, procedure);

    if (result.status === 'updated' || result.status === 'removed') {
      const updatedJobs = jobs.map(job => job.id === id ? normalizeJobState(result.job) : job);
      persistJobs(updatedJobs);
    }

    return result;
  };

  const resetLifecycleHarness = (): Job[] => {
    if (!includeLifecycleHarness) return jobs;
    return persistJobs(resetLifecycleHarnessJob(jobs, today));
  };

  const satisfyHarnessCloseoutRequirements = (): Job[] => {
    if (!includeLifecycleHarness) return jobs;
    return persistJobs(satisfyLifecycleHarnessCloseoutRequirements(jobs));
  };

  const resetSonicHarness = (): Job[] => {
    if (!includeSonicProcedureHarness) return jobs;
    return persistJobs(resetSonicProcedureHarnessJobs(jobs, today));
  };

  /* ── Derived job / scheduling values ── */
  const routeAJobs = jobs.filter(j => j.routeId === 'A');
  const routeBJobs = jobs.filter(j => j.routeId === 'B');

  const todayRouteJobs = jobs.filter(j => j.routeId === 'A' && effectiveDay(j, today) === today);
  const executableRouteJobs = todayRouteJobs.filter(isActionableJob);
  const tomorrow = addDays(today, 1);
  const tomorrowJobs = jobs.filter(j => effectiveDay(j, today) === tomorrow);
  const overdueJobs = jobs.filter(j => isOverdue(j, today));
  const unscheduledJobs = jobs.filter(j => effectiveDay(j, today) === null && !isJobCompleted(j) && !isJobFinished(j));
  const weeklyDays = groupJobsByDay(jobs, today);
  const todayDay = weeklyDays[0];
  const selectedDay = selectedStripDate ? weeklyDays.find(day => day.date === selectedStripDate) || null : null;

  const routeFilterCounts = {
    today: todayRouteJobs.filter(j => j.status !== 'finished' && j.status !== 'completed').length,
    under_review: todayRouteJobs.filter(j => j.status === 'under_review').length,
    revisions: todayRouteJobs.filter(j => j.status === 'revisit').length,
    finished: routeAJobs.filter(j => j.status === 'finished' || j.status === 'completed').length,
  };

  const filteredRouteJobs = filterJobsByType(todayRouteJobs, routeFilter);

  return {
    jobs,
    selectedStripDate,
    showScheduleReview,
    moveToDayJob,
    editingJob,
    defaultJobType,
    routeFilter,
    completingJobIds,

    setSelectedStripDate,
    setShowScheduleReview,
    setMoveToDayJob,
    setEditingJob,
    setDefaultJobType,
    setRouteFilter,
    setCompletingJobIds,

    replaceJobs,

    deleteJob,
    saveJob,
    importJobs,
    duplicateJob,
    toggleRoute,
    moveJobRoute,
    moveJobToDate,
    moveUnfinishedToTomorrow,
    quickMoveToB,
    updateJobStatus,
    toggleJobComplete,
    markJobUnderReview,
    checkInJob,
    markJobReadyToStart,
    blockJobBeforeStart,
    startJob,
    pauseJobWork,
    resumeJobWork,
    awaitJobSupport,
    markJobBlockedOnsite,
    endJobVisit,
    markJobWorkComplete,
    completeJobCloseout,
    reopenCompletedJob,
    assignJobProcedure,
    resetLifecycleHarnessJob: resetLifecycleHarness,
    satisfyLifecycleHarnessCloseoutRequirements: satisfyHarnessCloseoutRequirements,
    resetSonicProcedureHarness: resetSonicHarness,

    routeAJobs,
    routeBJobs,
    todayRouteJobs,
    executableRouteJobs,
    tomorrowJobs,
    overdueJobs,
    unscheduledJobs,
    weeklyDays,
    todayDay,
    selectedDay,
    routeFilterCounts,
    filteredRouteJobs,
  };
}
