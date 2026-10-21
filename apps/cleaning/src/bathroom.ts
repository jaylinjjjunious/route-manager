import { addDays, dayKey, isDay, type Plan, type Space } from './model';
import type { CleaningSession } from './sessions';

export const bathroomActivities = [
  { id: 'toilet', title: 'Toilet wipe-down', cadence: 'Daily', days: 1 },
  { id: 'sink', title: 'Sink wipe-down', cadence: 'Daily', days: 1 },
  { id: 'walls', title: 'Clean bathroom walls', cadence: 'Every two weeks', days: 14 },
  { id: 'cabinets', title: 'Clean bathroom cabinets', cadence: 'Every two weeks', days: 14 },
  { id: 'floor', title: 'Clean bathroom floor', cadence: 'Every two weeks', days: 14 },
  { id: 'shower', title: 'Clean the shower', cadence: 'Monthly', days: 0 },
] as const;
export type BathroomId = typeof bathroomActivities[number]['id'];
export type BathroomSchedule = { start: string; lastDone: Partial<Record<BathroomId, string>> };
export function nextMonth(day: string): string {
  if (!isDay(day)) throw new Error('Choose a valid start date.');
  const date = new Date(`${day}T12:00:00`); const targetDay = date.getDate();
  date.setDate(1); date.setMonth(date.getMonth() + 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12).getDate(); date.setDate(Math.min(targetDay, last));
  return dayKey(date);
}
export function parseBathroom(value: unknown): BathroomSchedule {
  const data = value as BathroomSchedule;
  if (!data || !isDay(data.start) || !data.lastDone || typeof data.lastDone !== 'object' || Array.isArray(data.lastDone) || Object.entries(data.lastDone).some(([id, day]) => !bathroomActivities.some(item => item.id === id) || !isDay(day))) throw new Error('This backup contains an invalid bathroom schedule.');
  return { start: data.start, lastDone: { ...data.lastDone } };
}
export function bathroomDue(schedule: BathroomSchedule, id: BathroomId): string {
  const item = bathroomActivities.find(item => item.id === id)!;
  const last = schedule.lastDone[id];
  return last ? item.days ? addDays(last, item.days) : nextMonth(last) : item.days === 1 ? schedule.start : item.days ? addDays(schedule.start, item.days) : nextMonth(schedule.start);
}
export function configureBathroom(plan: Plan, start: string, today: string): Plan {
  if (!isDay(start) || start < today) throw new Error('Choose today or a future start date.');
  const existing = plan.spaces.find(space => !space.archived && (space.bathroom || space.name.trim().toLowerCase() === 'bathroom'));
  if (existing?.bathroom && Object.keys(existing.bathroom.lastDone).length) throw new Error('The start date is fixed after your first completed cleaning.');
  if (plan.sessions?.some(session => !session.endedAt)) throw new Error('Clock out before changing the start date.');
  const space: Space = { ...(existing || { id: crypto.randomUUID(), name: 'Bathroom', archived: false }), bathroom: { start, lastDone: {} } };
  return { ...plan, version: 4, spaces: existing ? plan.spaces.map(item => item.id === space.id ? space : item) : [...plan.spaces, space] };
}
export function finishBathroom(plan: Plan, session: CleaningSession): Plan {
  if (!session.bathroomItems || !session.endedAt) return plan;
  const day = dayKey(new Date(session.endedAt));
  return { ...plan, spaces: plan.spaces.map(space => {
    if (space.id !== session.spaceId || !space.bathroom) return space;
    const lastDone = { ...space.bathroom.lastDone };
    for (const id of session.bathroomItems!) {
      const item = bathroomActivities.find(item => item.id === id)!;
      if (session.completed.includes(item.title) && (!lastDone[id] || lastDone[id]! < day)) lastDone[id] = day;
    }
    return { ...space, bathroom: { ...space.bathroom, lastDone } };
  }) };
}

export function completeBathroomItems(plan: Plan, spaceId: string, ids: BathroomId[], now = new Date()): Plan {
  const room = plan.spaces.find(space => space.id === spaceId && !space.archived && space.bathroom);
  if (!room?.bathroom) throw new Error('This bathroom schedule is no longer available.');
  if (plan.sessions?.some(session => !session.endedAt)) throw new Error('Use Clock out to save the work from your current session.');
  const today = dayKey(now);
  if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !bathroomActivities.some(item => item.id === id) || bathroomDue(room.bathroom!, id) > today)) throw new Error('Choose only cleaning that is due today.');
  const lastDone = { ...room.bathroom.lastDone };
  for (const id of ids) lastDone[id] = today;
  return { ...plan, spaces: plan.spaces.map(space => space.id === spaceId ? { ...space, bathroom: { ...room.bathroom!, lastDone } } : space) };
}

export function undoBathroomFinish(plan: Plan, spaceId: string, prior: BathroomSchedule, saved: BathroomSchedule): Plan {
  const room = plan.spaces.find(space => space.id === spaceId && !space.archived);
  if (!room?.bathroom || JSON.stringify(room.bathroom) !== JSON.stringify(saved) || plan.sessions?.some(session => !session.endedAt)) throw new Error('The bathroom schedule changed. This finish can no longer be undone.');
  return { ...plan, spaces: plan.spaces.map(space => space.id === spaceId ? { ...space, bathroom: prior } : space) };
}
