import { describe, expect, it } from 'vitest';
import { TransitRateLimiter } from '../server/transit/transitRateLimiter';

describe('TransitRateLimiter', () => {
  it('allows up to the max requests per window', () => {
    const limiter = new TransitRateLimiter({ max: 5, windowMs: 60_000 });
    const t0 = 1_000_000;
    expect([0, 1, 2, 3, 4].map((i) => limiter.tryAcquire(t0 + i * 1000))).toEqual([true, true, true, true, true]);
    expect(limiter.tryAcquire(t0 + 5 * 1000)).toBe(false);
  });

  it('reports remaining/used via getStatus', () => {
    const limiter = new TransitRateLimiter({ max: 5, windowMs: 60_000 });
    limiter.tryAcquire(1_000);
    limiter.tryAcquire(2_000);
    const status = limiter.getStatus(3_000);
    expect(status.used).toBe(2);
    expect(status.remaining).toBe(3);
    expect(status.limit).toBe(5);
  });

  it('prunes slots that slide out of the window', () => {
    const limiter = new TransitRateLimiter({ max: 2, windowMs: 60_000 });
    limiter.tryAcquire(0);
    limiter.tryAcquire(10_000);
    expect(limiter.tryAcquire(20_000)).toBe(false);
    // 61s later the first slot has expired.
    expect(limiter.tryAcquire(61_000)).toBe(true);
    expect(limiter.getStatus(61_000).used).toBe(2);
  });

  it('release() returns a slot that never reached upstream', () => {
    const limiter = new TransitRateLimiter({ max: 1, windowMs: 60_000 });
    expect(limiter.tryAcquire(0)).toBe(true);
    limiter.release();
    expect(limiter.tryAcquire(1000)).toBe(true);
  });

  it('tracks pending and in-flight counts', () => {
    const limiter = new TransitRateLimiter({ max: 5, windowMs: 60_000 });
    limiter.beginPending();
    limiter.beginPending();
    limiter.endPending();
    limiter.beginInFlight();
    const status = limiter.getStatus(0);
    expect(status.pending).toBe(1);
    expect(status.inFlight).toBe(1);
    limiter.endPending();
    limiter.endInFlight();
    expect(limiter.getStatus(0).pending).toBe(0);
    expect(limiter.getStatus(0).inFlight).toBe(0);
  });
});
