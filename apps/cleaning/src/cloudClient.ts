import { createClient } from '@supabase/supabase-js';
import { parsePlan } from './model';
import type { CloudApi, Snapshot } from './cloudSync';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloudClient = url && key ? createClient(url, key) : null;
export function cloudApi(owner: string): CloudApi {
  async function request(path: string, body?: object): Promise<unknown> {
    const { data } = await cloudClient!.auth.getSession();
    if (!data.session || data.session.user.id !== owner) throw new Error('Sign in to this account again to sync.');
    const response = await fetch(`${url}/rest/v1/${path}`, { method: body ? 'POST' : 'GET', headers: { apikey: key, Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.code === '40001' ? 'The cloud plan changed. Retry sync to compare both plans.' : response.status === 401 ? 'Sign in again to sync.' : 'Cloud storage could not be reached. Retry when online.');
    }
    return response.json();
  }
  function snapshot(value: unknown): Snapshot | null {
    if (!Array.isArray(value) || value.length > 1) throw new Error('The cloud returned an invalid plan.');
    if (!value.length) return null;
    const row = value[0];
    if (row.owner_id !== owner || !Number.isSafeInteger(row.revision) || row.revision < 1 || typeof row.updated_at !== 'string') throw new Error('The cloud returned an invalid account plan.');
    return { plan: parsePlan(JSON.stringify(row.plan)), revision: row.revision, updated_at: row.updated_at };
  }
  return {
    load: async () => snapshot(await request('cleaning_plans?select=owner_id,plan,revision,updated_at')),
    save: async (plan, revision) => { const result = snapshot(await request('rpc/cleaning_save_plan', { p_plan: plan, p_revision: revision })); if (!result) throw new Error('The cloud did not confirm this save.'); return result; },
  };
}
