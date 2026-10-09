import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { transferableAbortController } from 'node:util';
import { Capacitor } from '@capacitor/core';
import { apiFetch, serverUrl } from '../src/services/apiOrigin';

beforeEach(() => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  vi.stubGlobal('window', { location: { href: 'capacitor://localhost/#dashboard' } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('routes bundled API and proof paths to Render despite the custom scheme having a null URL origin', () => {
  expect(serverUrl('/api/probation-check-ins?month=2026-10')).toBe('https://route-manager-phtj.onrender.com/api/probation-check-ins?month=2026-10');
  expect(serverUrl('capacitor://localhost/api/health')).toBe('https://route-manager-phtj.onrender.com/api/health');
  expect(serverUrl('/shower-proof-assets/example.jpg')).toBe('https://route-manager-phtj.onrender.com/shower-proof-assets/example.jpg');
});
it('preserves third-party URLs, inline proof data, and browser requests', () => {
  expect(serverUrl('https://cecheckin.com')).toBe('https://cecheckin.com');
  expect(serverUrl('data:image/png;base64,example')).toBe('data:image/png;base64,example');
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  expect(serverUrl('/api/health')).toBe('/api/health');
});
it('rejects insecure or credential-bearing native backend configuration', () => {
  for (const origin of ['http://example.com', 'https://user:password@example.com', 'https://example.com/api', 'https://example.com?token=secret']) {
    vi.stubEnv('VITE_API_ORIGIN', origin);
    expect(() => serverUrl('/api/health')).toThrow('HTTPS origin');
  }
});
it('preserves authenticated multipart upload options', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
  const body = new FormData();
  body.append('proofImage', new Blob(['test']), 'test.jpg');
  const init = { method: 'POST', headers: { Authorization: 'Bearer test-token' }, body };
  await apiFetch('/api/shower-proofs', init);
  expect(fetchMock).toHaveBeenCalledWith('https://route-manager-phtj.onrender.com/api/shower-proofs', init);
});
it('preserves Request methods, headers, and bodies when moving a native request', async () => {
  // Node's Request must use Node's abort classes, rather than jsdom's classes.
  const controller = transferableAbortController();
  vi.stubGlobal('AbortController', controller.constructor);
  vi.stubGlobal('AbortSignal', controller.signal.constructor);
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
  const request = new Request('capacitor://localhost/api/test', { method: 'POST', headers: { Authorization: 'Bearer test-token' }, body: 'payload' });
  await apiFetch(request);
  const sent = fetchMock.mock.calls[0][0] as Request;
  expect(sent.url).toBe('https://route-manager-phtj.onrender.com/api/test');
  expect(sent.method).toBe('POST');
  expect(sent.headers.get('Authorization')).toBe('Bearer test-token');
  expect(await sent.text()).toBe('payload');
});
