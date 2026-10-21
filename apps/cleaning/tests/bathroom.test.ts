import { expect, it } from 'vitest';
import { addDays, emptyPlan, mergeBackup, parsePlan } from '../src/model';
import { completeBathroomItems, undoBathroomFinish, bathroomActivities, bathroomDue, configureBathroom, nextMonth } from '../src/bathroom';
import { clockIn, changeSession } from '../src/sessions';

it('creates the requested schedule with no invented completion or initial deep-clean overdue work', () => {
  const plan = configureBathroom(emptyPlan(), '2026-10-21', '2026-10-21');
  const schedule = plan.spaces[0].bathroom!;
  expect(schedule.lastDone).toEqual({});
  expect(bathroomDue(schedule, 'toilet')).toBe('2026-10-21');
  expect(bathroomDue(schedule, 'sink')).toBe('2026-10-21');
  for (const id of ['walls', 'cabinets', 'floor'] as const) expect(bathroomDue(schedule, id)).toBe('2026-11-04');
  expect(bathroomDue(schedule, 'shower')).toBe('2026-11-21');
  expect(plan.tasks).toEqual([]); expect(plan.history).toEqual([]);
  expect(() => configureBathroom(emptyPlan(), '2026-10-20', '2026-10-21')).toThrow('future');
});
it('reuses an active Bathroom without replacing its tasks, routine or history', () => {
  const original = { ...emptyPlan(), spaces: [{ id: 'bath', name: 'BATHROOM', archived: false, routine: ['Custom step'] }] };
  const plan = configureBathroom(original, '2026-11-01', '2026-10-21');
  expect(plan.spaces).toHaveLength(1); expect(plan.spaces[0]).toMatchObject({ id: 'bath', routine: ['Custom step'] });
  expect(bathroomDue(plan.spaces[0].bathroom!, 'toilet')).toBe('2026-11-01');
});
it('uses calendar months with short-month clamping and calendar days across DST', () => {
  expect(nextMonth('2027-01-31')).toBe('2027-02-28');
  expect(nextMonth('2028-01-31')).toBe('2028-02-29');
  expect(nextMonth('2026-12-15')).toBe('2027-01-15');
  expect(addDays('2026-10-25', 14)).toBe('2026-11-08');
});
it('atomically updates only finished linked activities from their actual completion date', () => {
  let plan = configureBathroom(emptyPlan(), '2026-10-21', '2026-10-21');
  const room = plan.spaces[0]; const ids = ['toilet', 'sink', 'shower'] as const;
  plan = clockIn(plan, room, ids.map(id => bathroomActivities.find(item => item.id === id)!.title), [], new Date('2026-10-22T12:00:00'), [...ids]);
  const id = plan.sessions![0].id;
  plan = changeSession(plan, id, 'finish', { completed: ['Toilet wipe-down', 'Clean the shower'], note: '' }, new Date('2026-10-22T12:20:00'));
  const schedule = plan.spaces[0].bathroom!;
  expect(schedule.lastDone).toEqual({ toilet: '2026-10-22', shower: '2026-10-22' });
  expect(bathroomDue(schedule, 'toilet')).toBe('2026-10-23');
  expect(bathroomDue(schedule, 'sink')).toBe('2026-10-21');
  expect(bathroomDue(schedule, 'shower')).toBe('2026-11-22');
  expect(plan.sessions![0].completed).toHaveLength(2);
});
it('does not infer scheduled completion from a generic session and validates v4 backup metadata', () => {
  let plan = configureBathroom(emptyPlan(), '2026-10-21', '2026-10-21');
  plan = clockIn(plan, plan.spaces[0], ['Toilet wipe-down'], [], new Date('2026-10-21T12:00:00'));
  plan = changeSession(plan, plan.sessions![0].id, 'finish', { completed: ['Toilet wipe-down'], note: '' }, new Date('2026-10-21T12:01:00'));
  expect(plan.spaces[0].bathroom!.lastDone).toEqual({});
  expect(parsePlan(JSON.stringify(plan))).toEqual(plan);
  expect(mergeBackup(emptyPlan(), plan)).toEqual(plan);
  const invalid = structuredClone(plan); invalid.spaces[0].bathroom!.lastDone.toilet = 'bad-date';
  expect(() => parsePlan(JSON.stringify(invalid))).toThrow('invalid bathroom schedule');
  const badLink = structuredClone(plan); badLink.sessions![0].bathroomItems = ['shower'];
  expect(() => parsePlan(JSON.stringify(badLink))).toThrow('invalid cleaning session');
});

it('clears only selected due cleaning without inventing timed work and safely restores an accidental finish', () => {
  const before = configureBathroom(emptyPlan(), '2026-10-21', '2026-10-21');
  const room = before.spaces[0];
  const after = completeBathroomItems(before, room.id, ['toilet'], new Date('2026-10-21T12:00:00'));
  expect(after.spaces[0].bathroom!.lastDone).toEqual({toilet:'2026-10-21'});
  expect(bathroomDue(after.spaces[0].bathroom!, 'toilet')).toBe('2026-10-22');
  expect(bathroomDue(after.spaces[0].bathroom!, 'sink')).toBe('2026-10-21');
  expect(after.sessions).toBeUndefined();expect(after.tasks).toEqual([]);
  expect(parsePlan(JSON.stringify(after))).toEqual(after);
  expect(undoBathroomFinish(after,room.id,room.bathroom!,after.spaces[0].bathroom!)).toEqual(before);
  expect(()=>completeBathroomItems(after,room.id,['toilet'],new Date('2026-10-21T12:01:00'))).toThrow('due today');
  const changed = completeBathroomItems(after,room.id,['sink'],new Date('2026-10-21T12:01:00'));
  expect(()=>undoBathroomFinish(changed,room.id,room.bathroom!,after.spaces[0].bathroom!)).toThrow('schedule changed');
});
it('keeps clocked-in work on the clock-out path',()=>{
  let plan=configureBathroom(emptyPlan(),'2026-10-21','2026-10-21');
  plan=clockIn(plan,plan.spaces[0],['Toilet wipe-down'],[],new Date('2026-10-21T12:00:00'),['toilet']);
  expect(()=>completeBathroomItems(plan,plan.spaces[0].id,['toilet'],new Date('2026-10-21T12:01:00'))).toThrow('Clock out');
});
