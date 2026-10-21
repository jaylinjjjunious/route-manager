import { emptyPlan, parsePlan, type Plan } from './model';
export const STORAGE_KEY = 'all-in-one.cleaning.personal.v1';
export function readPlan(storage: Pick<Storage, 'getItem'>): { plan: Plan; raw: string | null; error: string } {
  let raw: string | null = null;
  try { raw = storage.getItem(STORAGE_KEY); return { plan: raw === null ? emptyPlan() : parsePlan(raw), raw, error: '' }; }
  catch { return { plan: emptyPlan(), raw, error: 'Saved data could not be read. It has not been replaced. Export the existing data before recovering from a backup.' }; }
}
export function savePlan(storage: Pick<Storage, 'getItem' | 'setItem'>, next: Plan, expectedRaw: string | null): string {
  if (storage.getItem(STORAGE_KEY) !== expectedRaw) throw new Error('Your plan changed in another tab. Reload this page before making more changes.');
  const raw = JSON.stringify(parsePlan(JSON.stringify(next)));
  try { storage.setItem(STORAGE_KEY, raw); } catch { throw new Error('Your browser could not save this change. Free up storage or export a backup. The change was not applied.'); }
  return raw;
}
