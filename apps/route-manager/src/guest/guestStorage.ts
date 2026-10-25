// Guest data never shares a key, model or migration with account data.
export const GUEST_PLAN_KEY = 'aio-route-manager-guest-plan:v1';
export const GUEST_MODE_KEY = 'aio-route-manager-guest-mode:v1';

export interface GuestJob {
  id: string;
  title: string;
  address: string;
  date: string;
  completed: boolean;
}
export interface GuestPlan { version: 1; startAddress: string; jobs: GuestJob[] }

export function isGuestMode(): boolean {
  try { return sessionStorage.getItem(GUEST_MODE_KEY) === 'active'; } catch { return false; }
}
export function setGuestMode(active: boolean) {
  try {
    if (active) sessionStorage.setItem(GUEST_MODE_KEY, 'active');
    else sessionStorage.removeItem(GUEST_MODE_KEY);
  } catch { /* In-memory entry still works when browser storage is unavailable. */ }
}

export function readGuestPlan(): GuestPlan {
  const empty: GuestPlan = { version: 1, startAddress: '', jobs: [] };
  const raw = localStorage.getItem(GUEST_PLAN_KEY);
  if (!raw) return empty;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Invalid guest plan');
  const plan = value as GuestPlan;
  if (plan.version !== 1 || typeof plan.startAddress !== 'string' || !Array.isArray(plan.jobs)
    || plan.jobs.length > 1000 || plan.jobs.some(job => !job || typeof job.id !== 'string'
      || typeof job.title !== 'string' || typeof job.address !== 'string'
      || typeof job.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(job.date)
      || typeof job.completed !== 'boolean')) throw new Error('Invalid guest plan');
  return { version: 1, startAddress: plan.startAddress, jobs: plan.jobs.map(({ id, title, address, date, completed }) => ({ id, title, address, date, completed })) };
}
export function writeGuestPlan(plan: GuestPlan) {
  localStorage.setItem(GUEST_PLAN_KEY, JSON.stringify(plan));
}

export function guestToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function guestDirections(job: GuestJob, origin: string): string {
  const query = new URLSearchParams({ api: '1', destination: job.address, travelmode: 'driving' });
  if (origin.trim()) query.set('origin', origin.trim());
  return `https://www.google.com/maps/dir/?${query}`;
}
