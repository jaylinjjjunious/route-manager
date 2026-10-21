import type { Space } from './model';

export type RoutineRun = { id: string; spaceName: string; steps: string[]; completed: number; startedAt: string; finishedAt: string | null };
export const activeRun = (space: Space) => space.runs?.find(run => run.finishedAt === null);
export function validSteps(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 100 && value.every(step => typeof step === 'string' && step.trim().length > 0 && step.length <= 200);
}
export function parseRoutineFields(space: Space): Partial<Space> {
  const invalid = () => { throw new Error('This backup contains an invalid room routine.'); };
  const fields: Partial<Space> = {};
  if (space.routine !== undefined) {
    if (!validSteps(space.routine)) invalid();
    fields.routine = [...space.routine!];
  }
  if (space.runs !== undefined) {
    if (!Array.isArray(space.runs) || space.runs.length > 500) invalid();
    const runs = space.runs!;
    const timestamp = (value: unknown) => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && value.length <= 40 && Number.isFinite(Date.parse(value));
    for (const run of runs) {
      if (!run || typeof run.id !== 'string' || !run.id || run.id.length > 100 || typeof run.spaceName !== 'string' || !run.spaceName.trim() || run.spaceName.length > 80 || !validSteps(run.steps) || !run.steps.length || !Number.isInteger(run.completed) || run.completed < 0 || run.completed > run.steps.length || !timestamp(run.startedAt) || !(run.finishedAt === null || (timestamp(run.finishedAt) && run.completed === run.steps.length && Date.parse(run.finishedAt) >= Date.parse(run.startedAt)))) invalid();
    }
    if (new Set(runs.map(run => run.id)).size !== runs.length || runs.filter(run => run.finishedAt === null).length > 1) invalid();
    fields.runs = runs.map(run => ({ id: run.id, spaceName: run.spaceName, steps: [...run.steps], completed: run.completed, startedAt: run.startedAt, finishedAt: run.finishedAt }));
  }
  return fields;
}
export function editRoutine(space: Space, steps: string[]): Space {
  if (!validSteps(steps)) throw new Error('Use up to 100 steps, with at most 200 characters per step.');
  return { ...space, routine: steps };
}
export function startRoutine(space: Space, now = new Date()): Space {
  if (space.archived) throw new Error('Restore this space before starting its routine.');
  if (activeRun(space)) return space;
  if (!space.routine?.length) throw new Error('Add some steps to this room first.');
  if ((space.runs?.length || 0) >= 500) throw new Error('This room has reached its saved routine limit. Export a backup before making more changes.');
  return { ...space, runs: [{ id: crypto.randomUUID(), spaceName: space.name, steps: [...space.routine], completed: 0, startedAt: now.toISOString(), finishedAt: null }, ...space.runs || []] };
}
export function updateRun(space: Space, id: string, expected: number, action: 'next' | 'back' | 'finish', now = new Date()): Space {
  const run = activeRun(space);
  if (space.archived || !run || run.id !== id || run.completed !== expected) throw new Error('This routine changed. Reopen it to continue.');
  if (action === 'finish' && run.completed !== run.steps.length) throw new Error('Complete every step before finishing this routine.');
  const changed = action === 'finish' ? { ...run, finishedAt: now.toISOString() } : { ...run, completed: Math.max(0, Math.min(run.steps.length, run.completed + (action === 'next' ? 1 : -1))) };
  return { ...space, runs: space.runs!.map(item => item.id === id ? changed : item) };
}
