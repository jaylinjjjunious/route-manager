import { describe, it, expect } from 'vitest';
import type { Job } from '../src/types';
import {
  toLocalDateString,
  todayString,
  isValidScheduledDate,
  addDays,
  formatScheduledDate,
  isActionableJob,
  hasInvalidCoordinates,
  effectiveDay,
  migrateScheduledDates,
  buildWeeklyDays,
  groupJobsByDay,
  isOverdue,
  planningIssues,
  schedulingNeedsReview,
  SCHEDULE_MAX_DAYS_AHEAD,
} from '../src/utils/jobSchedule';

const TODAY = '2026-07-30';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    storeName: 'Family Dollar 2151 S Chester Ave',
    address: '2151 S Chester Ave, Bakersfield, CA',
    pay: 25,
    estimatedMinutes: 20,
    jobType: 'retail_audit',
    dueTime: '17:00',
    notes: '',
    status: 'ready',
    routeId: 'A',
    coordinates: { lat: 35.32, lng: -119.02 },
    ...overrides,
  };
}

describe('timezone-stable local dates', () => {
  it('derives the America/Los_Angeles calendar day from a UTC instant', () => {
    expect(toLocalDateString(new Date('2026-07-30T07:00:00.000Z'))).toBe('2026-07-30');
    expect(toLocalDateString(new Date('2026-07-30T06:59:59.000Z'))).toBe('2026-07-29');
  });

  it('never round-trips through new Date("YYYY-MM-DD") UTC parsing', () => {
    const midnightUtc = new Date('2026-07-30T00:00:00.000Z');
    const localNoonMath = new Date(2026, 6, 30, 12, 0, 0);
    expect(toLocalDateString(midnightUtc)).toBe('2026-07-29');
    expect(toLocalDateString(localNoonMath)).toBe('2026-07-30');
  });

  it('todayString returns a YYYY-MM-DD string', () => {
    expect(todayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('addDays', () => {
  it('adds within the same month', () => {
    expect(addDays('2026-07-30', 1)).toBe('2026-07-31');
    expect(addDays('2026-07-30', 0)).toBe('2026-07-30');
  });

  it('wraps month and year boundaries', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('handles leap days', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('supports negative offsets', () => {
    expect(addDays('2026-07-01', -1)).toBe('2026-06-30');
  });

  it('builds a full 7-day week', () => {
    expect(buildWeeklyDays(TODAY)).toEqual([
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
    ]);
  });
});

describe('isValidScheduledDate', () => {
  it('accepts well-formed calendar dates', () => {
    expect(isValidScheduledDate('2026-07-30')).toBe(true);
    expect(isValidScheduledDate('2024-02-29')).toBe(true);
    expect(isValidScheduledDate('2000-01-01')).toBe(true);
    expect(isValidScheduledDate('2100-12-31')).toBe(true);
  });

  it('rejects impossible calendar dates', () => {
    expect(isValidScheduledDate('2026-02-29')).toBe(false);
    expect(isValidScheduledDate('2026-04-31')).toBe(false);
    expect(isValidScheduledDate('2026-13-01')).toBe(false);
    expect(isValidScheduledDate('2026-00-10')).toBe(false);
  });

  it('rejects malformed and out-of-range input', () => {
    expect(isValidScheduledDate('7/30/2026')).toBe(false);
    expect(isValidScheduledDate('2026-7-1')).toBe(false);
    expect(isValidScheduledDate('30-07-2026')).toBe(false);
    expect(isValidScheduledDate('tomorrow')).toBe(false);
    expect(isValidScheduledDate(20260730)).toBe(false);
    expect(isValidScheduledDate(null)).toBe(false);
    expect(isValidScheduledDate('1999-12-31')).toBe(false);
    expect(isValidScheduledDate('2101-01-01')).toBe(false);
  });
});

describe('isActionableJob', () => {
  it('includes ready, revisit, and outlier', () => {
    expect(isActionableJob(makeJob({ status: 'ready' }))).toBe(true);
    expect(isActionableJob(makeJob({ status: 'revisit' }))).toBe(true);
    expect(isActionableJob(makeJob({ status: 'outlier' }))).toBe(true);
  });

  it('excludes inactive states', () => {
    expect(isActionableJob(makeJob({ status: 'under_review' }))).toBe(false);
    expect(isActionableJob(makeJob({ status: 'completed' }))).toBe(false);
    expect(isActionableJob(makeJob({ status: 'postponed' }))).toBe(false);
    expect(isActionableJob(makeJob({ status: 'finished' }))).toBe(false);
    expect(isActionableJob(makeJob({ status: 'pending' }))).toBe(false);
  });
});

describe('hasInvalidCoordinates', () => {
  it('flags missing or degenerate coordinates', () => {
    expect(hasInvalidCoordinates(makeJob({ coordinates: { lat: 0, lng: 0 } }))).toBe(true);
    expect(hasInvalidCoordinates(makeJob({ coordinates: { lat: NaN, lng: 5 } }))).toBe(true);
    expect(hasInvalidCoordinates(makeJob({ coordinates: undefined as never }))).toBe(true);
  });

  it('accepts resolved coordinates', () => {
    expect(hasInvalidCoordinates(makeJob())).toBe(false);
  });
});

describe('effectiveDay', () => {
  it('lets a valid scheduledDate always win', () => {
    const job = makeJob({ scheduledDate: '2026-08-03' });
    expect(effectiveDay(job, TODAY)).toBe('2026-08-03');
  });

  it('derives today for undated actionable Route A jobs (never persisted)', () => {
    expect(effectiveDay(makeJob({ status: 'ready' }), TODAY)).toBe(TODAY);
    expect(effectiveDay(makeJob({ status: 'revisit' }), TODAY)).toBe(TODAY);
    expect(effectiveDay(makeJob({ status: 'under_review' }), TODAY)).toBe(TODAY);
  });

  it('returns null for undated inactive jobs', () => {
    expect(effectiveDay(makeJob({ status: 'completed' }), TODAY)).toBeNull();
    expect(effectiveDay(makeJob({ status: 'finished' }), TODAY)).toBeNull();
    expect(effectiveDay(makeJob({ status: 'postponed', routeId: 'B' }), TODAY)).toBeNull();
    expect(effectiveDay(makeJob({ status: 'ready', routeId: 'B' }), TODAY)).toBeNull();
  });

  it('never coerces an invalid scheduledDate; surfaces as Needs Review', () => {
    expect(effectiveDay(makeJob({ scheduledDate: '2026-02-30' }), TODAY)).toBeNull();
    expect(effectiveDay(makeJob({ scheduledDate: 'not-a-date' }), TODAY)).toBeNull();
  });
});

describe('migrateScheduledDates', () => {
  it('migrates legacy moved ids to tomorrow on Route B', () => {
    const a = makeJob({ id: 'a' });
    const b = makeJob({ id: 'b' });
    const result = migrateScheduledDates([a, b], ['a'], TODAY);
    expect(result.changed).toBe(true);
    expect(result.migratedCount).toBe(1);
    const migratedA = result.jobs.find(j => j.id === 'a');
    expect(migratedA?.scheduledDate).toBe('2026-07-31');
    expect(migratedA?.routeId).toBe('B');
    expect(result.jobs.find(j => j.id === 'b')?.scheduledDate).toBeUndefined();
  });

  it('preserves jobs that already carry a scheduledDate', () => {
    const a = makeJob({ id: 'a', scheduledDate: '2026-08-01', routeId: 'B' });
    const result = migrateScheduledDates([a], ['a'], TODAY);
    expect(result.changed).toBe(false);
    expect(result.jobs[0]).toBe(a);
  });

  it('returns the same array reference when nothing changes', () => {
    const jobs = [makeJob()];
    const result = migrateScheduledDates(jobs, [], TODAY);
    expect(result.changed).toBe(false);
    expect(result.jobs).toBe(jobs);
  });

  it('never rewrites completed, finished, or under-review jobs', () => {
    const done = makeJob({ id: 'done', status: 'completed', isCompleted: true });
    const underReview = makeJob({ id: 'ur', status: 'under_review' });
    const result = migrateScheduledDates([done, underReview], ['done', 'ur'], TODAY);
    expect(result.changed).toBe(false);
    expect(result.migratedCount).toBe(0);
    expect(result.jobs[0].scheduledDate).toBeUndefined();
  });
});

describe('groupJobsByDay', () => {
  it('groups jobs under their effective day and aggregates pay/work', () => {
    const tomorrow = addDays(TODAY, 1);
    const jobs = [
      makeJob({ id: 'today-1', pay: 25, estimatedMinutes: 20 }),
      makeJob({ id: 'today-2', pay: 15, estimatedMinutes: 10 }),
      makeJob({ id: 'tomorrow-1', pay: 40, estimatedMinutes: 30, scheduledDate: tomorrow, routeId: 'B' }),
    ];
    const days = groupJobsByDay(jobs, TODAY);
    expect(days[0].jobs.map(j => j.id)).toEqual(['today-1', 'today-2']);
    expect(days[0].pay).toBe(40);
    expect(days[0].workMinutes).toBe(30);
    expect(days[1].jobs.map(j => j.id)).toEqual(['tomorrow-1']);
    expect(days[1].pay).toBe(40);
    expect(days.length).toBe(7);
  });

  it('flags invalid-dated jobs in the reviewJobs bucket of today only if undated', () => {
    const badDate = makeJob({ id: 'bad', scheduledDate: '2026-02-30' });
    const days = groupJobsByDay([badDate], TODAY);
    const allReview = days.flatMap(d => d.reviewJobs);
    expect(allReview.length).toBe(0);
  });

  it('flags undated actionable Route A jobs as today with planning issues', () => {
    const noAddress = makeJob({ id: 'x', address: '' });
    const days = groupJobsByDay([noAddress], TODAY);
    expect(days[0].jobs.map(j => j.id)).toContain('x');
    expect(days[0].reviewJobs.map(j => j.id)).toContain('x');
  });
});

describe('isOverdue', () => {
  it('flags active jobs pinned to a past day', () => {
    expect(isOverdue(makeJob({ scheduledDate: '2026-07-29' }), TODAY)).toBe(true);
    expect(isOverdue(makeJob({ status: 'under_review', scheduledDate: '2026-07-29' }), TODAY)).toBe(true);
  });

  it('does not flag completed, future, or undated jobs', () => {
    expect(isOverdue(makeJob({ status: 'completed', scheduledDate: '2026-07-29' }), TODAY)).toBe(false);
    expect(isOverdue(makeJob({ scheduledDate: TODAY }), TODAY)).toBe(false);
    expect(isOverdue(makeJob({ scheduledDate: '2026-07-31' }), TODAY)).toBe(false);
    expect(isOverdue(makeJob(), TODAY)).toBe(false);
  });
});

describe('planningIssues / schedulingNeedsReview', () => {
  it('reports missing address, deadline, and duration', () => {
    const issues = planningIssues(makeJob({ address: '', deadline: '', dueTime: '', estimatedMinutes: 0 }));
    expect(issues.map(i => i.kind)).toContain('missing_address');
    expect(issues.map(i => i.kind)).toContain('missing_deadline');
    expect(issues.map(i => i.kind)).toContain('missing_duration');
    expect(schedulingNeedsReview(makeJob({ address: '' }))).toBe(true);
  });

  it('reports an invalid scheduled date', () => {
    const issues = planningIssues(makeJob({ scheduledDate: '2026-02-30' }));
    expect(issues.map(i => i.kind)).toContain('invalid_date');
  });

  it('is clean for a complete job', () => {
    expect(schedulingNeedsReview(makeJob())).toBe(false);
  });

  it('respects the one-year scheduling horizon', () => {
    expect(SCHEDULE_MAX_DAYS_AHEAD).toBe(365);
    expect(addDays(TODAY, SCHEDULE_MAX_DAYS_AHEAD)).toBe('2027-07-30');
  });
});

describe('formatScheduledDate', () => {
  it('formats without shifting the calendar day', () => {
    expect(formatScheduledDate('2026-07-30')).toBe('Thu, Jul 30');
  });
});
