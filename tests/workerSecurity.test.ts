import { expect, it, vi } from 'vitest';

vi.mock('vinext/server/app-router-entry', () => ({ default: { fetch: vi.fn(() => new Response('app')) } }));
vi.mock('vinext/server/image-optimization', () => ({
  handleImageOptimization: vi.fn(), DEFAULT_DEVICE_SIZES: [], DEFAULT_IMAGE_SIZES: [],
}));
import worker from '../worker/index';

it('retires every legacy entry before reading a body or using the shared database', async () => {
  const prepare = vi.fn(() => { throw new Error('Legacy database must not be accessed'); });
  const env = {
    DB: { prepare, batch: vi.fn() }, ASSETS: { fetch: vi.fn() },
    IMAGES: { input: vi.fn(() => { throw new Error('Unexpected image processing'); }) },
  };
  const ctx = {} as Parameters<typeof worker.fetch>[2];
  for (const endpoint of ['/api/habits', '/api/shower-proof', '/api/shower-proofs', '/api/shower-proofs/example/image', '/api/safety-news']) {
    for (const method of ['GET', 'POST', 'DELETE']) {
      const request = new Request(`https://worker.example${endpoint}`, { method, ...(method === 'POST' ? { body: 'deliberately invalid body' } : {}) });
      const response = await worker.fetch(request, env, ctx);
      expect(response.status).toBe(410);
      expect((await response.json()).code).toBe('LEGACY_API_RETIRED');
      expect(request.bodyUsed).toBe(false);
    }
  }
  expect(prepare).not.toHaveBeenCalled();
});
