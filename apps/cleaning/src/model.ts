import { parseBathroom, type BathroomSchedule } from './bathroom';
import { parseSessions, type CleaningSession } from './sessions';
import { parseRoutineFields, type RoutineRun } from './routines';
export type Space = { id: string; name: string; archived: boolean; routine?: string[]; runs?: RoutineRun[]; bathroom?: BathroomSchedule };
export type Task = { id: string; spaceId: string; title: string; minutes: number; intervalDays: number; due: string; done: boolean; archived: boolean; lastDay: string | null; lastEvent: string | null };
export type Completion = { id: string; taskId: string; title: string; spaceName: string; at: string; day: string; intervalDays: number; priorDue: string; nextDue: string; priorDone: boolean; priorDay: string | null; priorEvent: string | null };
export type Plan = { version: 1 | 2 | 3 | 4; spaces: Space[]; tasks: Task[]; history: Completion[]; sessions?: CleaningSession[] };
export const emptyPlan = (): Plan => ({ version: 1, spaces: [], tasks: [], history: [] });
export const dayKey = (date = new Date()): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const isDay = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1900 && !Number.isNaN(Date.parse(`${value}T12:00:00`)) && dayKey(new Date(`${value}T12:00:00`)) === value;
export function addDays(day: string, days: number): string {
  if (!isDay(day)) throw new Error('Choose a valid due date.');
  const date = new Date(`${day}T12:00:00`); date.setDate(date.getDate() + days); return dayKey(date);
}
export const frequency = (days: number): string => days === 0 ? 'One time' : days === 1 ? 'Daily' : days === 7 ? 'Weekly' : `Every ${days} days`;
export const activeTasks = (plan: Plan): Task[] => plan.tasks.filter(task => !task.archived && plan.spaces.some(space => space.id === task.spaceId && !space.archived));
export const dueTasks = (plan: Plan, today: string): Task[] => activeTasks(plan).filter(task => !task.done && task.due <= today && task.lastDay !== today).sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));

export function completeTask(plan: Plan, id: string, now = new Date()): Plan {
  const task = activeTasks(plan).find(item => item.id === id);
  const today = dayKey(now);
  if (!task || task.done || task.lastDay === today) return plan;
  const nextDue = task.intervalDays ? addDays(today, task.intervalDays) : task.due;
  const event: Completion = { id: crypto.randomUUID(), taskId: id, title: task.title, spaceName: plan.spaces.find(space => space.id === task.spaceId)!.name, at: now.toISOString(), day: today, intervalDays: task.intervalDays, priorDue: task.due, nextDue, priorDone: task.done, priorDay: task.lastDay, priorEvent: task.lastEvent };
  return { ...plan, tasks: plan.tasks.map(item => item.id !== id ? item : { ...item, due: nextDue, done: !item.intervalDays, lastDay: today, lastEvent: event.id }), history: [event, ...plan.history] };
}
export function canUndo(plan: Plan, event: Completion): boolean {
  const task = plan.tasks.find(item => item.id === event.taskId);
  return !!task && task.lastEvent === event.id && task.due === event.nextDue && task.intervalDays === event.intervalDays && task.done === (event.intervalDays === 0);
}
export function undoCompletion(plan: Plan, id: string): Plan {
  const event = plan.history.find(item => item.id === id);
  if (!event || !canUndo(plan, event)) throw new Error('This task changed after completion. Edit its schedule instead.');
  return { ...plan, history: plan.history.filter(item => item.id !== id), tasks: plan.tasks.map(task => task.id !== event.taskId ? task : { ...task, due: event.priorDue, done: event.priorDone, lastDay: event.priorDay, lastEvent: event.priorEvent }) };
}

const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const nullableText = (value: unknown): boolean => value === null || text(value, 100);
export function parsePlan(raw: string): Plan {
  if (new Blob([raw]).size > 2 * 1024 * 1024) throw new Error('Backups must be smaller than 2 MB.');
  let data: any;
  try { data = JSON.parse(raw); } catch { throw new Error('This file is not a valid cleaning backup.'); }
  const invalid = () => { throw new Error('This backup contains invalid or unsupported cleaning data.'); };
  if (!data || ![1, 2, 3, 4].includes(data.version) || !Array.isArray(data.spaces) || !Array.isArray(data.tasks) || !Array.isArray(data.history) || data.spaces.length > 500 || data.tasks.length > 5000 || data.history.length > 10000) invalid();
  const unique = (items: any[]) => items.every(item => item && text(item.id, 100)) && new Set(items.map(item => item.id)).size === items.length;
  if (![data.spaces, data.tasks, data.history].every(unique)) invalid();
  for (const space of data.spaces) if (!text(space.name, 80) || typeof space.archived !== 'boolean') invalid();
  for (const task of data.tasks) {
    if (!text(task.title, 120) || !data.spaces.some((space: Space) => space.id === task.spaceId) || !Number.isInteger(task.minutes) || task.minutes < 1 || task.minutes > 480 || !Number.isInteger(task.intervalDays) || task.intervalDays < 0 || task.intervalDays > 365 || !isDay(task.due) || typeof task.done !== 'boolean' || typeof task.archived !== 'boolean' || !(task.lastDay === null || isDay(task.lastDay)) || !nullableText(task.lastEvent)) invalid();
  }
  for (const event of data.history) {
    if (!text(event.title, 120) || !text(event.spaceName, 80) || !data.tasks.some((task: Task) => task.id === event.taskId) || !isDay(event.day) || !text(event.at, 50) || Number.isNaN(Date.parse(event.at)) || !isDay(event.priorDue) || !isDay(event.nextDue) || !Number.isInteger(event.intervalDays) || event.intervalDays < 0 || event.intervalDays > 365 || typeof event.priorDone !== 'boolean' || !(event.priorDay === null || isDay(event.priorDay)) || !nullableText(event.priorEvent)) invalid();
  }
  for (const task of data.tasks) if (task.lastEvent !== null && !data.history.some((event: Completion) => event.id === task.lastEvent && event.taskId === task.id && event.day === task.lastDay)) invalid();
  const sessions = data.sessions === undefined ? undefined : parseSessions(data.sessions, data.spaces);
  return { ...(sessions === undefined ? {} : { sessions }), version: data.version === 4 || data.spaces.some((space: Space) => space.bathroom !== undefined) || sessions?.some(session => session.bathroomItems !== undefined) ? 4 : data.version === 3 || sessions !== undefined ? 3 : data.version === 2 || data.spaces.some((space: Space) => space.routine !== undefined || space.runs !== undefined) ? 2 : 1, spaces: data.spaces.map((s: Space) => ({ id: s.id, name: s.name, archived: s.archived, ...parseRoutineFields(s), ...(s.bathroom === undefined ? {} : { bathroom: parseBathroom(s.bathroom) }) })), tasks: data.tasks.map((t: Task) => ({ id: t.id, spaceId: t.spaceId, title: t.title, minutes: t.minutes, intervalDays: t.intervalDays, due: t.due, done: t.done, archived: t.archived, lastDay: t.lastDay, lastEvent: t.lastEvent })), history: data.history.map((e: Completion) => ({ id: e.id, taskId: e.taskId, title: e.title, spaceName: e.spaceName, at: e.at, day: e.day, intervalDays: e.intervalDays, priorDue: e.priorDue, nextDue: e.nextDue, priorDone: e.priorDone, priorDay: e.priorDay, priorEvent: e.priorEvent })) };
}
export function mergeBackup(current: Plan, imported: Plan): Plan {
  const merge = <T extends { id: string }>(existing: T[], incoming: T[]) => [...existing, ...incoming.filter(item => !existing.some(original => original.id === item.id))];
  return parsePlan(JSON.stringify({ version: Math.max(current.version, imported.version), ...((current.sessions !== undefined || imported.sessions !== undefined) ? { sessions: merge(current.sessions || [], imported.sessions || []) } : {}), spaces: merge(current.spaces, imported.spaces), tasks: merge(current.tasks, imported.tasks), history: merge(current.history, imported.history).sort((a, b) => b.at.localeCompare(a.at)) }));
}
export function starterPlan(today: string): Plan {
  const plan = emptyPlan();
  const rooms: [string, [string, number, number][]][] = [
    ['Kitchen', [['Wipe counters', 5, 1], ['Clean the sink', 5, 1]]],
    ['Bathroom', [['Wipe the sink', 5, 1], ['Clean the mirror', 5, 7]]],
    ['Living area', [['Put things back in place', 10, 1], ['Vacuum the floor', 15, 7]]],
  ];
  for (const [name, tasks] of rooms) {
    const space = { id: crypto.randomUUID(), name, archived: false }; plan.spaces.push(space);
    for (const [title, minutes, intervalDays] of tasks) plan.tasks.push({ id: crypto.randomUUID(), spaceId: space.id, title, minutes, intervalDays, due: today, done: false, archived: false, lastDay: null, lastEvent: null });
  }
  return plan;
}
