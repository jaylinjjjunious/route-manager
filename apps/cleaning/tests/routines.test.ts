import { expect, it } from 'vitest';
import { emptyPlan, parsePlan, mergeBackup, type Space } from '../src/model';
import { activeRun, editRoutine, startRoutine, updateRun } from '../src/routines';

const room = (): Space => ({ id: 'kitchen', name: 'Kitchen', archived: false, routine: ['Gather supplies', 'Wipe counters'] });
it('saves ordered progress, prevents unfinished completion, and starts a fresh full routine on the same day', () => {
  let space = startRoutine(room()); let run = activeRun(space)!;
  expect(() => updateRun(space, run.id, 0, 'finish')).toThrow('every step');
  space = updateRun(space, run.id, 0, 'next');
  const plan = parsePlan(JSON.stringify({ ...emptyPlan(), spaces: [space] }));
  expect(activeRun(plan.spaces[0])?.completed).toBe(1);
  expect(startRoutine(space)).toBe(space);
  expect(() => updateRun(space, run.id, 0, 'next')).toThrow('changed');
  space = updateRun(space, run.id, 1, 'back');
  expect(activeRun(space)?.completed).toBe(0);
  space = updateRun(space, run.id, 0, 'next'); space = updateRun(space, run.id, 1, 'next'); space = updateRun(space, run.id, 2, 'finish');
  expect(activeRun(space)).toBeUndefined();
  const next = startRoutine(space);
  expect(next.runs).toHaveLength(2); expect(activeRun(next)?.completed).toBe(0); expect(activeRun(next)?.steps).toEqual(room().routine);
});
it('snapshots visit steps and room name, while editing updates only the next visit', () => {
  const original = startRoutine(room());
  const changed = editRoutine({ ...original, name: 'New name' }, ['New first step']);
  expect(activeRun(changed)).toMatchObject({ spaceName: 'Kitchen', steps: ['Gather supplies', 'Wipe counters'] });
  expect(changed.routine).toEqual(['New first step']);
  expect(activeRun({ ...changed, archived: true })).toBeDefined();
  expect(() => startRoutine({ ...changed, archived: true })).toThrow('Restore');
});
it('supports old plans and preserves routine templates, progress and history through validated backups', () => {
  const old = { ...emptyPlan(), spaces: [{ id: 'old', name: 'Old room', archived: false }] };
  expect(parsePlan(JSON.stringify(old))).toEqual(old);
  const plan = { ...emptyPlan(), spaces: [startRoutine(room())] };
  const upgraded = parsePlan(JSON.stringify(plan));
  expect(upgraded).toEqual({ ...plan, version: 2 });
  expect(mergeBackup(plan, plan)).toEqual(upgraded);
  expect(mergeBackup(emptyPlan(), plan)).toEqual(upgraded);
});
it('rejects malformed steps and inconsistent visit progress without trusting backup objects', () => {
  const space = startRoutine(room()); const plan = () => ({ ...emptyPlan(), spaces: [space] });
  space.routine = ['']; expect(() => parsePlan(JSON.stringify(plan()))).toThrow('invalid room routine');
  space.routine = ['Good']; space.runs![0].completed = 99;
  expect(() => parsePlan(JSON.stringify(plan()))).toThrow('invalid room routine');
  space.runs![0].completed = 0; space.runs![0].finishedAt = new Date().toISOString();
  expect(() => parsePlan(JSON.stringify(plan()))).toThrow('invalid room routine');
});
