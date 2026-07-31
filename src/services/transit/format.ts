import type { TransitFreshness } from '../../types';

/** Minutes until the given unix-seconds departure (clamped at 0). */
export function minutesUntil(unixSeconds: number, nowMs = Date.now()): number {
  return Math.max(0, Math.round((unixSeconds * 1000 - nowMs) / 60000));
}

/** "Now" / "in 8 min" / "in 1 hr 5 min" for a departure countdown. */
export function formatMinutesUntil(unixSeconds: number, nowMs = Date.now()): string {
  const minutes = minutesUntil(unixSeconds, nowMs);
  if (minutes <= 0) return 'now';
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `in ${hours} hr ${rest} min` : `in ${hours} hr`;
}

export function formatClockTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatFreshnessLabel(freshness: TransitFreshness | undefined): string {
  if (!freshness) return '';
  const ageMs = Date.now() - new Date(freshness.lastUpdatedAt).getTime();
  if (freshness.source === 'live') return 'Live';
  if (freshness.source === 'cache') return `Updated ${Math.max(0, Math.round(ageMs / 1000))}s ago`;
  const minutes = Math.round(ageMs / 60000);
  return `Offline — ${minutes > 0 ? `${minutes}m old` : 'just now'}`;
}

export function isFreshnessStale(freshness: TransitFreshness | undefined, staleAfterMs: number): boolean {
  if (!freshness) return true;
  if (freshness.source === 'stale') return true;
  return Date.now() - new Date(freshness.lastUpdatedAt).getTime() > staleAfterMs;
}
