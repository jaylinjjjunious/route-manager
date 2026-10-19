import { useEffect, useState } from 'react';
import { authFetchJson } from '../apiClient';
import { getStorageOwner, getStorageOwnerEpoch } from '../../utils/ownerStorage';
import type { InventoryDomain } from './domain';

export interface InventoryJobSummary {
  id: string;
  storeName: string;
  address: string;
  inventoryDomain?: InventoryDomain;
  routeId?: string;
}

export function mergeInventoryJobs(local: InventoryJobSummary[], remote: InventoryJobSummary[]): InventoryJobSummary[] {
  const localIds = new Set(local.map(job => job.id));
  return [...local, ...remote.filter(job => !localIds.has(job.id))];
}

export function useInventoryAccountJobs(domain: InventoryDomain, enabled: boolean) {
  const [jobs, setJobs] = useState<InventoryJobSummary[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    setJobs([]); setError('');
    if (!enabled) return;
    const owner = getStorageOwner(), epoch = getStorageOwnerEpoch();
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      if (!owner) return;
      try {
        const query = new URLSearchParams({ domain, expectedOwnerId: owner });
        const data = await authFetchJson<{ jobs: InventoryJobSummary[] }>(`/api/inventory/jobs?${query}`, { signal: controller.signal });
        if (active && owner === getStorageOwner() && epoch === getStorageOwnerEpoch()) { setJobs(data.jobs); setError(''); }
      } catch { if (active) setError('Account inventory jobs could not load. Local jobs remain available.'); }
    };
    void load(); window.addEventListener('online',load); window.addEventListener('focus',load);
    return () => { active = false; controller.abort(); window.removeEventListener('online',load); window.removeEventListener('focus',load); };
  }, [domain, enabled]);
  return { jobs, error };
}
