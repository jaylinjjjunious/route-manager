export type ResetTime = {
  hour: number;
  minute: number;
};

export const SHOWER_CYCLE_RESET: ResetTime = { hour: 6, minute: 0 };

/** Same as SHOWER_CYCLE_RESET.hour — kept for backward compatibility */
export const SHOWER_CYCLE_RESET_HOUR = SHOWER_CYCLE_RESET.hour;

export const REQUIRED_SHOWER_BARCODE = '075371003233';

export const getLocalDateKey = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export function getCurrentCycleId(
  now: Date,
  resetTime: ResetTime = SHOWER_CYCLE_RESET
): string {
  const boundary = new Date(now);
  boundary.setHours(resetTime.hour, resetTime.minute, 0, 0);

  if (now < boundary) {
    boundary.setDate(boundary.getDate() - 1);
  }

  return getLocalDateKey(boundary);
}

export const getShowerCycleId = (date: Date = new Date()) =>
  getCurrentCycleId(date, SHOWER_CYCLE_RESET);

export const getNextResetTime = (
  now: Date,
  resetTime: ResetTime = SHOWER_CYCLE_RESET
): Date => {
  const next = new Date(now);
  next.setHours(resetTime.hour, resetTime.minute, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
};

export const getCycleLabel = (cycleId: string): string =>
  new Date(`${cycleId}T12:00:00`).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });

export const getBarcodeEnding = (barcode: string) => barcode.slice(-4);
