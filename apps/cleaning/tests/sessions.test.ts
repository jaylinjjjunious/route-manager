import { expect, it } from 'vitest';
import { emptyPlan, parsePlan, mergeBackup, type Space } from '../src/model';
import { clockIn, changeSession, currentSession, workingMs, suggestedTools } from '../src/sessions';
const room: Space = { id: 'test-room', name: 'Test kitchen', archived: false };
const time = (minutes: number) => new Date(Date.UTC(2026, 9, 21, 12, minutes));
it('counts working time from timestamps, excludes breaks and recovers while paused after backup/reload', () => {
  let plan = clockIn(emptyPlan(), room, ['Wash dishes'], ['Dish soap'], time(0));
  const id = currentSession(plan)!.id;
  expect(workingMs(currentSession(plan)!, time(5).getTime())).toBe(300000);
  plan = changeSession(plan, id, 'pause', undefined, time(5));
  plan = parsePlan(JSON.stringify(plan));
  expect(plan.version).toBe(3);
  expect(workingMs(currentSession(plan)!, time(30).getTime())).toBe(300000);
  plan = changeSession(plan, id, 'resume', undefined, time(15));
  plan = changeSession(plan, id, 'pause', undefined, time(20));
  plan = changeSession(plan, id, 'finish', { completed: ['Wash dishes'], note: 'Done' }, time(25));
  expect(currentSession(plan)).toBeUndefined();
  expect(workingMs(plan.sessions![0])).toBe(600000);
  expect(plan.sessions![0].pausedMs).toBe(900000);
  expect(plan.tasks).toEqual([]); expect(plan.history).toEqual([]);
});
it('prevents overlapping sessions and stale clock-outs, retaining snapshots and unfinished activities', () => {
  const plan = clockIn(emptyPlan(), room, ['Wash dishes', 'Clean floor'], [], time(0));
  expect(() => clockIn(plan, room, ['Other'], [], time(1))).toThrow('Clock out');
  expect(() => changeSession(plan, 'wrong-id', 'finish', { completed: [], note: '' }, time(1))).toThrow('changed');
  const renamed = { ...plan, spaces: plan.spaces.map(s => ({ ...s, name: 'Renamed', archived: true })) };
  const done = changeSession(renamed, plan.sessions![0].id, 'finish', { completed: ['Wash dishes'], note: 'Floor next time' }, time(12));
  expect(parsePlan(JSON.stringify(done)).sessions![0]).toMatchObject({ spaceName: 'Test kitchen', completed: ['Wash dishes'], note: 'Floor next time' });
  expect(() => changeSession(done, plan.sessions![0].id, 'finish', { completed: [], note: '' }, time(13))).toThrow('changed');
});
it('preserves old plans and session backups, rejects overlapping imports and malformed results', () => {
  expect(parsePlan(JSON.stringify(emptyPlan()))).toEqual(emptyPlan());
  const plan = clockIn(emptyPlan(), room, ['Wash dishes'], [], time(0));
  expect(mergeBackup(emptyPlan(), plan)).toEqual(plan);
  expect(mergeBackup(plan, plan)).toEqual(plan);
  const other = clockIn(emptyPlan(), room, ['Other'], [], time(1));
  expect(() => mergeBackup(plan, other)).toThrow('invalid cleaning session');
  const invalid = structuredClone(plan); invalid.sessions![0].pausedMs = -1;
  expect(() => parsePlan(JSON.stringify(invalid))).toThrow('invalid cleaning session');
  const badResult = changeSession(plan, plan.sessions![0].id, 'finish', { completed: ['Unplanned'], note: '' }, time(2));
  expect(() => parsePlan(JSON.stringify(badResult))).toThrow('invalid cleaning session');
  expect(() => changeSession(plan, plan.sessions![0].id, 'pause', undefined, time(-1))).toThrow('clock moved');
});
it('suggests relevant tools for the selected work', () => {
  expect(suggestedTools(['Clean the toilet', 'Clean the floor'])).toEqual(expect.arrayContaining(['Toilet brush', 'Mop']));
  expect(suggestedTools(['Wash dishes'])).toContain('Dish soap');
});
