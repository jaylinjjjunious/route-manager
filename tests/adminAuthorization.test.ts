import { beforeAll, beforeEach, afterAll, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ getUserById: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { admin: { getUserById: auth.getUserById } } }),
}));
let isAdmin: typeof import('../server/admin/activityLog').isAdmin;
beforeAll(async () => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-only-key');
  vi.resetModules();
  ({ isAdmin } = await import('../server/admin/activityLog'));
});
beforeEach(() => { auth.getUserById.mockReset(); });
afterAll(() => vi.unstubAllEnvs());

it('does not grant admin access from user-editable metadata', async () => {
  auth.getUserById.mockResolvedValue({ data: { user: { app_metadata: {}, user_metadata: { role: 'admin' } } }, error: null });
  expect(await isAdmin('ordinary-user')).toBe(false);
});
it('accepts a server-assigned admin role', async () => {
  auth.getUserById.mockResolvedValue({ data: { user: { app_metadata: { role: 'admin' }, user_metadata: {} } }, error: null });
  expect(await isAdmin('admin-user')).toBe(true);
});
it('fails closed when lookup fails', async () => {
  auth.getUserById.mockResolvedValue({ data: { user: null }, error: new Error('unavailable') });
  expect(await isAdmin('ordinary-user')).toBe(false);
});
it('fails closed when lookup throws', async () => {
  auth.getUserById.mockRejectedValue(new Error('network failure'));
  expect(await isAdmin('ordinary-user')).toBe(false);
});
