import type { Job } from '../../types';
import { authFetchJson } from '../../services/apiClient';

export interface BlueAiSource {
  ownerId: string;
  sourceApp: string;
  externalId: string;
  revision: number;
  startTime: string;
  endTime: string;
  endDate: string;
  timezone: 'America/Los_Angeles';
  payKnown: boolean;
}

export interface BlueAiRecord {
  id: string;
  sourceApp: 'barrister';
  externalId: string;
  category: 'assigned' | 'available';
  title: string;
  city: string | null;
  payRaw: string | null;
  scheduleRaw: string | null;
  statusRaw: string | null;
  descriptionRaw: string | null;
  receivedAt: string;
  updatedAt: string;
  revision: number;
}

export interface BlueAiRecordsResponse {
  enabled: boolean;
  assigned: BlueAiRecord[];
  available: BlueAiRecord[];
}

/** Only source-owned fields change. Local lifecycle, proofs, notes and routing survive. */
export function mergeBlueAiJobs(current: Job[], incoming: Job[], ownerId: string, deletedIds: string[] = []): Job[] {
  let next = current;
  for (const source of incoming) {
    if (source.blueAi?.ownerId !== ownerId || deletedIds.includes(source.id)) continue;
    const previous = next.find(job => job.id === source.id);
    if (previous && (!previous.blueAi || previous.blueAi.revision >= source.blueAi.revision)) continue;
    const merged: Job = previous ? {
      ...previous,
      storeName: source.storeName,
      address: source.address,
      scheduledDate: source.scheduledDate,
      dueTime: source.dueTime,
      estimatedMinutes: source.estimatedMinutes,
      pay: source.blueAi.payKnown ? source.pay : previous.pay,
      coordinates: previous.address === source.address && source.coordinates.lat === 0 && source.coordinates.lng === 0
        ? previous.coordinates : source.coordinates,
      blueAi: source.blueAi,
    } : source;
    next = previous ? next.map(job => job.id === source.id ? merged : job) : [...next, merged];
  }
  return next;
}

export async function fetchBlueAiRecords(category?: 'assigned' | 'available'): Promise<BlueAiRecord[]> {
  const params = category ? `?category=${category}` : '';
  const response = await authFetchJson<BlueAiRecordsResponse>(`/api/integrations/blueai/records${params}`);
  if (!response.enabled) return [];
  return category ? response[category] : [...response.assigned, ...response.available];
}