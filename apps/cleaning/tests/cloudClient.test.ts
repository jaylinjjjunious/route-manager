// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptyPlan } from '../src/model';
const auth = vi.hoisted(()=>({getSession:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({auth})}));
let api: typeof import('../src/cloudClient');
beforeEach(async()=>{vi.stubEnv('VITE_SUPABASE_URL','https://cloud.example.invalid');vi.stubEnv('VITE_SUPABASE_ANON_KEY','public-test-key');vi.resetModules();api=await import('../src/cloudClient');});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.clearAllMocks();});
it('refuses to send a plan after the signed-in owner changes',async()=>{
  auth.getSession.mockResolvedValue({data:{session:{user:{id:'other'},access_token:'test-token'}}});const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  await expect(api.cloudApi('owner').save(emptyPlan(),0)).rejects.toThrow('this account');expect(fetcher).not.toHaveBeenCalled();
});
it('pins each request to its verified owner token and rejects another owner response',async()=>{
  auth.getSession.mockResolvedValue({data:{session:{user:{id:'owner'},access_token:'test-token'}}});
  const fetcher=vi.fn(async()=>({ok:true,json:async()=>[{owner_id:'other',plan:emptyPlan(),revision:1,updated_at:'2026-10-21T12:00:00Z'}]}));vi.stubGlobal('fetch',fetcher);
  await expect(api.cloudApi('owner').load()).rejects.toThrow('invalid account');expect(fetcher.mock.calls[0]).toBeDefined();
});
