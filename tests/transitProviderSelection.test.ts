import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

describe('transit provider selection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_TRANSIT_PROVIDER', undefined);
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', undefined);
    vi.stubEnv('VITE_GOOGLE_MAPS_PLATFORM_KEY', undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('enables the official Transit API only when VITE_TRANSIT_PROVIDER is transit', async () => {
    const off = await import('../src/services/transit');
    expect(off.isTransitApiEnabled()).toBe(false);

    vi.stubEnv('VITE_TRANSIT_PROVIDER', 'transit');
    const on = await import('../src/services/transit');
    expect(on.isTransitApiEnabled()).toBe(true);
  });

  it('selects the TransitApiProvider when enabled', async () => {
    vi.stubEnv('VITE_TRANSIT_PROVIDER', 'transit');
    const { getTransitProvider } = await import('../src/services/transit');
    expect(getTransitProvider().name).toBe('transit-api');
  });

  it('falls back to the mock provider when disabled without Google keys', async () => {
    const { getTransitProvider } = await import('../src/services/transit');
    expect(getTransitProvider().name).toBe('mock-transit');
  });

  it('returns a status provider only when the Transit API is enabled', async () => {
    const off = await import('../src/services/transit');
    expect(off.getTransitStatusProvider()).toBeNull();

    vi.stubEnv('VITE_TRANSIT_PROVIDER', 'transit');
    const on = await import('../src/services/transit');
    expect(on.getTransitStatusProvider()).not.toBeNull();
  });
});
