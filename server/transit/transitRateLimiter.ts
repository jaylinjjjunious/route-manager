/**
 * Sliding-window rate limiter that keeps the server under the Transit API
 * free-tier budget (5 requests per minute).
 *
 * `tryAcquire()` records a timestamp when a slot is granted. Timestamps older
 * than the window are pruned. `release()` returns a slot that was granted but
 * never reached the upstream API (network-level failure), so the budget is not
 * wasted. `getStatus()` exposes the limiter state for the /api/transit/status
 * endpoint so the app can show "rate limited" state to the user.
 */

export interface RateLimitStatus {
  limit: number;
  used: number;
  remaining: number;
  windowStartMs: number;
  nextAvailableAtMs: number;
  pending: number;
  inFlight: number;
}

interface TransitRateLimiterOptions {
  max?: number;
  windowMs?: number;
}

export class TransitRateLimiter {
  private readonly max: number;
  private readonly windowMs: number;
  private timestamps: number[] = [];
  private pendingCount = 0;
  private inFlightCount = 0;

  constructor(options: TransitRateLimiterOptions = {}) {
    this.max = options.max ?? 5;
    this.windowMs = options.windowMs ?? 60_000;
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    this.timestamps = this.timestamps.filter((t) => t > cutoff);
  }

  tryAcquire(now = Date.now()): boolean {
    this.prune(now);
    if (this.timestamps.length >= this.max) return false;
    this.timestamps.push(now);
    return true;
  }

  release(): void {
    // Return the oldest slot (one that never reached the upstream API).
    if (this.timestamps.length > 0) this.timestamps.shift();
  }

  beginPending(): void {
    this.pendingCount += 1;
  }

  endPending(): void {
    this.pendingCount = Math.max(0, this.pendingCount - 1);
  }

  beginInFlight(): void {
    this.inFlightCount += 1;
  }

  endInFlight(): void {
    this.inFlightCount = Math.max(0, this.inFlightCount - 1);
  }

  reset(): void {
    this.timestamps = [];
    this.pendingCount = 0;
    this.inFlightCount = 0;
  }

  getStatus(now = Date.now()): RateLimitStatus {
    this.prune(now);
    const used = this.timestamps.length;
    const remaining = Math.max(0, this.max - used);
    const windowStartMs = used > 0 ? Math.min(...this.timestamps) : now;
    const nextAvailableAtMs = used >= this.max ? this.timestamps[0] + this.windowMs : now;
    return {
      limit: this.max,
      used,
      remaining,
      windowStartMs,
      nextAvailableAtMs,
      pending: this.pendingCount,
      inFlight: this.inFlightCount,
    };
  }
}
