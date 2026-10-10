import type { SupabaseClient } from '@supabase/supabase-js';
import type { DurableBudgetStore } from './requestBudget';

/** Reuse the service-role-only audit table; quota events contain no prompts or images.
 * Admission is serialized by requestBudget for the single production Express process.
 * Multiple replicas need an atomic database RPC before scaling.
 */
export function createDurableBudget(database: SupabaseClient | null): DurableBudgetStore | undefined {
  if (!database) return undefined;
  return {
    async admit(owner, group, month, limit) {
      const query = () => database.from('activity_log').select('id', { count: 'exact', head: true })
        .eq('feature', 'security_budget').eq('action', group).gte('created_at', `${month}-01T00:00:00Z`);
      const [account, total] = await Promise.all([query().eq('owner_id', owner), query()]);
      if (account.error || total.error || account.count === null || total.count === null) throw new Error('Durable accounting unavailable.');
      const globalLimit = group === 'ai' ? 2000 : group === 'transit' ? 1500 : 2000;
      if (account.count >= limit || total.count >= globalLimit) return false;
      const { error } = await database.from('activity_log').insert({
        owner_id: owner, feature: 'security_budget', action: group,
        summary: `Admitted ${group} request`, metadata: { month },
      });
      if (error) throw new Error('Durable accounting unavailable.');
      return true;
    },
  };
}
