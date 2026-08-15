import type {
  JobLifecycleEvent,
  JobLifecycleState,
  JobTimeSummary,
  JobVisit,
  JobWorkState,
  VisitEndReason,
} from './jobLifecycleTypes';

const makeId = (prefix: string, now: string) => `${prefix}-${now}-${Math.random().toString(36).slice(2, 8)}`;

const appendEvent = (
  state: JobLifecycleState,
  type: JobLifecycleEvent['type'],
  timestamp: string,
  visitId?: string,
  note?: string,
): JobLifecycleState => ({
  ...state,
  events: [
    ...state.events,
    {
      id: makeId('event', timestamp),
      type,
      timestamp,
      visitId,
      note,
    },
  ],
});

export function createJobLifecycle(): JobLifecycleState {
  return {
    schemaVersion: 1,
    status: 'planned',
    workState: 'not_started',
    visits: [],
    events: [],
  };
}

export function arriveAtJob(
  state: JobLifecycleState,
  timestamp = new Date().toISOString(),
): JobLifecycleState {
  if (state.activeVisitId) return state;

  const visit: JobVisit = {
    id: makeId('visit', timestamp),
    visitNumber: state.visits.length + 1,
    arrivedAt: timestamp,
  };

  const next: JobLifecycleState = {
    ...state,
    status: 'arrived',
    workState: 'not_started',
    activeVisitId: visit.id,
    visits: [...state.visits, visit],
  };

  return appendEvent(next, 'arrived', timestamp, visit.id);
}

export function markReadyToStart(
  state: JobLifecycleState,
  timestamp = new Date().toISOString(),
): JobLifecycleState {
  if (!state.activeVisitId) return state;
  return appendEvent(
    { ...state, status: 'ready', workState: 'ready_to_start' },
    'ready_to_start',
    timestamp,
    state.activeVisitId,
  );
}

export function blockBeforeStart(
  state: JobLifecycleState,
  note: string,
  timestamp = new Date().toISOString(),
): JobLifecycleState {
  if (!state.activeVisitId) return state;
  return appendEvent(
    { ...state, status: 'arrived', workState: 'blocked_before_start' },
    'blocked_before_start',
    timestamp,
    state.activeVisitId,
    note,
  );
}

export function startJobWork(
  state: JobLifecycleState,
  timestamp = new Date().toISOString(),
): JobLifecycleState {
  if (!state.activeVisitId) return state;

  const visits = state.visits.map(visit =>
    visit.id === state.activeVisitId && !visit.startedWorkAt
      ? { ...visit, startedWorkAt: timestamp }
      : visit,
  );

  return appendEvent(
    {
      ...state,
      status: 'in_progress',
      workState: 'working',
      visits,
    },
    'started_work',
    timestamp,
    state.activeVisitId,
  );
}

export function setJobWorkState(
  state: JobLifecycleState,
  workState: Extract<JobWorkState, 'working' | 'paused' | 'awaiting_support' | 'blocked_onsite'>,
  note?: string,
  timestamp = new Date().toISOString(),
): JobLifecycleState {
  if (!state.activeVisitId || state.status !== 'in_progress') return state;

  const type =
    workState === 'working'
      ? 'resumed_work'
      : workState === 'paused'
        ? 'paused'
        : workState === 'awaiting_support'
          ? 'awaiting_support'
          : 'blocked_onsite';

  return appendEvent(
    { ...state, workState },
    type,
    timestamp,
    state.activeVisitId,
    note,
  );
}

export function endJobVisit(
  state: JobLifecycleState,
  reason: VisitEndReason,
  note?: string,
  timestamp = new Date().toISOString(),
): JobLifecycleState {
  if (!state.activeVisitId) return state;

  const visitId = state.activeVisitId;
  const visits = state.visits.map(visit =>
    visit.id === visitId
      ? { ...visit, endedAt: timestamp, endReason: reason, endReasonNote: note }
      : visit,
  );

  const nextStatus = state.status === 'work_complete_pending_closeout'
    ? 'work_complete_pending_closeout'
    : state.status === 'completed'
      ? 'completed'
      : 'ready';

  return appendEvent(
    {
      ...state,
      status: nextStatus,
      workState: 'offsite',
      activeVisitId: undefined,
      visits,
    },
    'ended_visit',
    timestamp,
    visitId,
    note,
  );
}

export function markJobWorkComplete(
  state: JobLifecycleState,
  timestamp = new Date().toISOString(),
): JobLifecycleState {
  if (!state.activeVisitId || !['arrived', 'ready', 'in_progress'].includes(state.status)) return state;

  return appendEvent(
    {
      ...state,
      status: 'work_complete_pending_closeout',
      workState: state.activeVisitId ? state.workState : 'offsite',
    },
    'work_complete',
    timestamp,
    state.activeVisitId,
  );
}

export function completeJobCloseout(
  state: JobLifecycleState,
  timestamp = new Date().toISOString(),
): JobLifecycleState {
  if (state.status !== 'work_complete_pending_closeout') return state;

  const next: JobLifecycleState = {
    ...state,
    status: 'completed',
    workState: 'offsite',
    completedAt: timestamp,
    originalCompletedAt: state.originalCompletedAt ?? timestamp,
    reopenedAt: undefined,
    reopenReason: undefined,
  };

  return appendEvent(next, 'closeout_completed', timestamp, state.activeVisitId);
}

export function reopenCompletedJob(
  state: JobLifecycleState,
  reason: string,
  timestamp = new Date().toISOString(),
): JobLifecycleState {
  if (state.status !== 'completed') return state;

  const next: JobLifecycleState = {
    ...state,
    status: 'ready',
    workState: 'offsite',
    completedAt: undefined,
    reopenedAt: timestamp,
    reopenReason: reason,
  };

  return appendEvent(next, 'reopened', timestamp, undefined, reason);
}

const minutesBetween = (start: string, end: string) =>
  Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000);

function accumulateWorkStateMinutes(
  state: JobLifecycleState,
  visit: JobVisit,
  now: string,
): Pick<JobTimeSummary, 'activeWorkMinutes' | 'pausedMinutes' | 'awaitingSupportMinutes' | 'blockedOnsiteMinutes'> {
  const relevant = state.events
    .filter(event => event.visitId === visit.id)
    .filter(event => ['started_work', 'resumed_work', 'paused', 'awaiting_support', 'blocked_onsite', 'ended_visit'].includes(event.type))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let activeWorkMinutes = 0;
  let pausedMinutes = 0;
  let awaitingSupportMinutes = 0;
  let blockedOnsiteMinutes = 0;
  let currentState: JobWorkState = 'not_started';
  let currentStart: string | null = null;

  const addInterval = (end: string) => {
    if (!currentStart) return;
    const duration = minutesBetween(currentStart, end);
    if (currentState === 'working') activeWorkMinutes += duration;
    if (currentState === 'paused') pausedMinutes += duration;
    if (currentState === 'awaiting_support') awaitingSupportMinutes += duration;
    if (currentState === 'blocked_onsite') blockedOnsiteMinutes += duration;
  };

  relevant.forEach(event => {
    addInterval(event.timestamp);
    currentStart = event.timestamp;
    if (event.type === 'started_work' || event.type === 'resumed_work') currentState = 'working';
    if (event.type === 'paused') currentState = 'paused';
    if (event.type === 'awaiting_support') currentState = 'awaiting_support';
    if (event.type === 'blocked_onsite') currentState = 'blocked_onsite';
    if (event.type === 'ended_visit') {
      currentState = 'offsite';
      currentStart = null;
    }
  });

  if (visit.id === state.activeVisitId && currentStart) addInterval(now);

  return { activeWorkMinutes, pausedMinutes, awaitingSupportMinutes, blockedOnsiteMinutes };
}

export function summarizeJobTime(
  state: JobLifecycleState,
  now = new Date().toISOString(),
): JobTimeSummary {
  let totalOnsiteMinutes = 0;
  let activeWorkMinutes = 0;
  let pausedMinutes = 0;
  let awaitingSupportMinutes = 0;
  let blockedOnsiteMinutes = 0;

  state.visits.forEach(visit => {
    const visitEnd = visit.endedAt ?? (visit.id === state.activeVisitId ? now : visit.arrivedAt);
    totalOnsiteMinutes += minutesBetween(visit.arrivedAt, visitEnd);

    const work = accumulateWorkStateMinutes(state, visit, now);
    activeWorkMinutes += work.activeWorkMinutes;
    pausedMinutes += work.pausedMinutes;
    awaitingSupportMinutes += work.awaitingSupportMinutes;
    blockedOnsiteMinutes += work.blockedOnsiteMinutes;
  });

  return {
    arrivalToDepartureMinutes: totalOnsiteMinutes,
    activeWorkMinutes,
    pausedMinutes,
    awaitingSupportMinutes,
    blockedOnsiteMinutes,
    totalOnsiteMinutes,
  };
}
