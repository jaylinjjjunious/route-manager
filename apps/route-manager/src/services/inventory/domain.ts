import type { Job } from '../../types';

export type InventoryDomain = 'merchandising' | 'contract_parts';

export function getInventoryDomain(job: Pick<Job, 'inventoryDomain'>): InventoryDomain {
  return job.inventoryDomain === 'contract_parts' ? 'contract_parts' : 'merchandising';
}

export function inventoryDomainLabel(domain: InventoryDomain): string {
  return domain === 'contract_parts' ? 'Contract parts' : 'Merchandising / secret shopping';
}
