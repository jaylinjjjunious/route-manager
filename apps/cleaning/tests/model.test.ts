import { describe, expect, it } from 'vitest';
import { activeTasks, addDays, canUndo, completeTask, dayKey, dueTasks, emptyPlan, mergeBackup, parsePlan, starterPlan, undoCompletion, type Plan } from '../src/model';
import { readPlan, savePlan, STORAGE_KEY } from '../src/storage';

const home = (): Plan => ({ version: 1, spaces: [{ id: 'kitchen', name: 'Kitchen', archived: false }], tasks: [{ id: 'counters', title: 'Wipe counters', spaceId: 'kitchen', minutes: 5, intervalDays: 1, due: '2026-10-18', done: false, archived: false, lastDay: null, lastEvent: null }], history: [] });
const now = new Date('2026-10-20T12:00:00');
describe('personal cleaning schedule and history', () => {
  it('includes overdue work and schedules a recurring task from actual completion, not its overdue date', () => {
    const original = home();
    expect(dueTasks(original, '2026-10-20')).toHaveLength(1);
    const next = completeTask(original, 'counters', now);
    expect(next.tasks[0].due).toBe('2026-10-21');
    expect(next.history[0]).toMatchObject({ title: 'Wipe counters', spaceName: 'Kitchen', day: '2026-10-20', priorDue: '2026-10-18' });
    expect(dueTasks(next, '2026-10-20')).toHaveLength(0);
    expect(completeTask(next, 'counters', now)).toBe(next);
    expect(original.history).toHaveLength(0);
  });
  it('finishes one-time tasks without resurrecting them on a later day', () => {
    const plan = home(); plan.tasks[0].intervalDays = 0;
    const next = completeTask(plan, 'counters', now);
    expect(next.tasks[0].done).toBe(true);
    expect(dueTasks(next, '2027-01-01')).toHaveLength(0);
    expect(undoCompletion(next, next.history[0].id)).toEqual(plan);
  });
  it('undo restores the prior schedule and preserves task edits; a changed schedule blocks stale undo', () => {
    const next = completeTask(home(), 'counters', now);
    next.tasks[0].title = 'Counters and table';
    expect(undoCompletion(next, next.history[0].id).tasks[0]).toMatchObject({ title: 'Counters and table', due: '2026-10-18', lastDay: null });
    next.tasks[0].due = '2026-11-01';
    expect(canUndo(next, next.history[0])).toBe(false);
    expect(() => undoCompletion(next, next.history[0].id)).toThrow(/changed/);
  });
  it('keeps completion snapshots when a room is renamed or archived, and restores active work', () => {
    const next = completeTask(home(), 'counters', now);
    next.spaces[0] = { ...next.spaces[0], name: 'My kitchen', archived: true };
    expect(next.history[0].spaceName).toBe('Kitchen');
    expect(activeTasks(next)).toHaveLength(0);
    next.spaces[0].archived = false;
    expect(activeTasks(next)).toHaveLength(1);
  });
  it('uses calendar days across month, leap-day and daylight-saving boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-10-31', 7)).toBe('2026-11-07');
    expect(() => addDays('2026-02-30', 1)).toThrow();
  });
  it('starter plans contain suggested work only and can be added without replacing archived history', () => {
    const original = completeTask(home(), 'counters', now); original.spaces[0].archived = true;
    const sample = starterPlan(dayKey(now));
    expect(sample.spaces).toHaveLength(3); expect(sample.tasks).toHaveLength(6); expect(sample.history).toHaveLength(0);
    const merged = mergeBackup(original, sample);
    expect(merged.spaces).toHaveLength(4); expect(merged.history).toHaveLength(1);
  });
});
describe('backup and device storage preservation', () => {
  it('round-trips completion history, merges idempotently and retains current versions', () => {
    const backup = completeTask(home(), 'counters', now);
    expect(parsePlan(JSON.stringify(backup))).toEqual(backup);
    expect(mergeBackup(backup, backup)).toEqual(backup);
    const current = home(); current.tasks[0].title = 'My current title';
    const merged = mergeBackup(current, backup);
    expect(merged.tasks[0].title).toBe('My current title');
    expect(merged.history).toHaveLength(1);
  });
  it('rejects malformed versions, impossible dates, orphan tasks and broken completion links', () => {
    expect(() => parsePlan('{')).toThrow();
    expect(() => parsePlan(JSON.stringify({ ...home(), version: 99 }))).toThrow();
    const plan = home(); plan.tasks[0].spaceId = 'missing'; expect(() => parsePlan(JSON.stringify(plan))).toThrow();
    plan.tasks[0].spaceId = 'kitchen'; plan.tasks[0].due = '2026-02-30'; expect(() => parsePlan(JSON.stringify(plan))).toThrow();
    const completed = completeTask(home(), 'counters', now); completed.history = []; expect(() => parsePlan(JSON.stringify(completed))).toThrow();
  });
  it('preserves corrupt stored data and rejects observed stale writes or storage failures', () => {
    const values = new Map<string, string>([[STORAGE_KEY, '{broken']]);
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(readPlan(storage)).toMatchObject({ raw: '{broken', plan: emptyPlan() });
    expect(readPlan(storage).error).not.toBe(''); expect(values.get(STORAGE_KEY)).toBe('{broken');
    expect(() => savePlan(storage, home(), null)).toThrow(/another tab/);
    expect(() => savePlan({ ...storage, setItem: () => { throw new Error('quota'); } }, home(), '{broken')).toThrow(/not applied/);
    expect(values.get(STORAGE_KEY)).toBe('{broken');
  });
});
