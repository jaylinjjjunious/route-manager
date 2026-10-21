import type { Plan, Space } from './model';

export type CleaningSession = { id: string; spaceId: string; spaceName: string; activities: string[]; tools: string[]; startedAt: string; pausedAt: string | null; pausedMs: number; endedAt: string | null; completed: string[]; note: string };
export const currentSession = (plan: Plan) => plan.sessions?.find(session => session.endedAt === null);
export function workingMs(session: CleaningSession, now = Date.now()): number {
  return Math.max(0, Date.parse(session.endedAt || session.pausedAt || new Date(now).toISOString()) - Date.parse(session.startedAt) - session.pausedMs);
}
export function duration(ms: number): string {
  const seconds = Math.floor(ms / 1000); return `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor(seconds / 60 % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
export function suggestedTools(activities: string[]): string[] {
  const all = activities.join(' ').toLowerCase();
  return ['Cleaning cloths', 'Gloves', ...(all.includes('toilet') ? ['Toilet brush'] : []), ...(all.includes('dishes') || all.includes('sink') ? ['Sponge or dish brush', 'Dish soap'] : []), ...(all.includes('floor') || all.includes('vacuum') ? ['Broom or vacuum', 'Mop'] : []), ...(all.includes('mirror') ? ['Glass cloth'] : []), 'Suitable cleaning product', 'Trash bag'];
}
export function parseSessions(value: unknown, spaces: Space[]): CleaningSession[] {
  const invalid = () => { throw new Error('This backup contains invalid cleaning session data.'); };
  const strings = (v: unknown, max: number): v is string[] => Array.isArray(v) && v.length <= 100 && new Set(v).size === v.length && v.every(s => typeof s === 'string' && s.trim().length > 0 && s.length <= max);
  const stamp = (v: unknown): v is string => typeof v === 'string' && v.length <= 40 && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
  if (!Array.isArray(value) || value.length > 2000) invalid();
  const sessions = value as CleaningSession[];
  for (const s of sessions) {
    if (!s || typeof s.id !== 'string' || !s.id || s.id.length > 100 || !spaces.some(space => space.id === s.spaceId) || typeof s.spaceName !== 'string' || !s.spaceName.trim() || s.spaceName.length > 80 || !strings(s.activities, 120) || !s.activities.length || !strings(s.tools, 120) || !stamp(s.startedAt) || !(s.pausedAt === null || stamp(s.pausedAt)) || !(s.endedAt === null || stamp(s.endedAt)) || !Number.isSafeInteger(s.pausedMs) || s.pausedMs < 0 || !strings(s.completed, 120) || s.completed.some(item => !s.activities.includes(item)) || typeof s.note !== 'string' || s.note.length > 1000) invalid();
    const start = Date.parse(s.startedAt);
    if ((s.pausedAt && Date.parse(s.pausedAt) < start + s.pausedMs) || (s.endedAt && (s.pausedAt !== null || Date.parse(s.endedAt) < start + s.pausedMs)) || (!s.endedAt && (s.completed.length || s.note))) invalid();
  }
  if (new Set(sessions.map(s => s.id)).size !== sessions.length || sessions.filter(s => !s.endedAt).length > 1) invalid();
  return sessions.map(s => ({ id: s.id, spaceId: s.spaceId, spaceName: s.spaceName, activities: [...s.activities], tools: [...s.tools], startedAt: s.startedAt, pausedAt: s.pausedAt, pausedMs: s.pausedMs, endedAt: s.endedAt, completed: [...s.completed], note: s.note }));
}
export function clockIn(plan: Plan, room: Space, activities: string[], tools: string[], now = new Date()): Plan {
  if (currentSession(plan)) throw new Error('Clock out of your current session before starting another.');
  const existing = plan.spaces.find(space => space.id === room.id);
  if (existing?.archived) throw new Error('Restore this room before clocking in.');
  const session: CleaningSession = { id: crypto.randomUUID(), spaceId: room.id, spaceName: existing?.name || room.name, activities: [...activities], tools: [...tools], startedAt: now.toISOString(), pausedAt: null, pausedMs: 0, endedAt: null, completed: [], note: '' };
  return { ...plan, version: 3, spaces: existing ? plan.spaces : [...plan.spaces, room], sessions: [session, ...plan.sessions || []] };
}
export function changeSession(plan: Plan, id: string, change: 'pause' | 'resume' | 'finish', result?: { completed: string[]; note: string }, now = new Date()): Plan {
  const s = currentSession(plan);
  if (!s || s.id !== id) throw new Error('This cleaning session changed. Reopen it to continue.');
  if (now.getTime() < Date.parse(s.pausedAt || s.startedAt)) throw new Error('Your device clock moved backwards. Check its time before saving.');
  if (change === 'pause' && s.pausedAt || change === 'resume' && !s.pausedAt) return plan;
  const pausedMs = s.pausedMs + (s.pausedAt ? now.getTime() - Date.parse(s.pausedAt) : 0);
  let updated: CleaningSession;
  if (change === 'finish') {
    if (!result) throw new Error('Choose what you finished before clocking out.');
    updated = { ...s, endedAt: now.toISOString(), pausedAt: null, pausedMs, completed: result.completed, note: result.note.trim() };
  } else updated = change === 'pause' ? { ...s, pausedAt: now.toISOString() } : { ...s, pausedAt: null, pausedMs };
  return { ...plan, sessions: plan.sessions!.map(item => item.id === id ? updated : item) };
}
