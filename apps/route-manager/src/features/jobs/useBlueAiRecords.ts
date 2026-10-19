import { useEffect, useState } from 'react';
import { authFetchJson } from '../../services/apiClient';
import type { BlueAiRecord, BlueAiRecordsResponse } from './blueAiJobs';

export function useBlueAiRecords(ownerId?: string) {
  const [feed, setFeed] = useState<{
    ownerId?: string; assigned: BlueAiRecord[]; available: BlueAiRecord[]; message: string;
  }>({ assigned: [], available: [], message: 'Loading BlueAI records…' });

  useEffect(() => {
    if (!ownerId) return;
    const controller = new AbortController();
    let busy = false;
    const poll = async () => {
      if (busy || document.visibilityState === 'hidden') return;
      busy = true;
      try {
        const response = await authFetchJson<BlueAiRecordsResponse>('/api/integrations/blueai/records', { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!response || typeof response.enabled !== 'boolean') throw new Error('Invalid records response');
        if (!response.enabled) {
          setFeed({ ownerId, assigned: [], available: [], message: response.reason === 'account_mismatch'
            ? 'BlueAI is connected to a different account. Sign in with the connected account to view its records.'
            : 'BlueAI is not configured for this account yet.' });
          return;
        }
        if (!Array.isArray(response.assigned) || !Array.isArray(response.available)) throw new Error('Invalid records response');
        setFeed({ ownerId, assigned: response.assigned, available: response.available,
          message: response.assigned.length + response.available.length ? 'BlueAI records synced.' : 'No BlueAI records received yet.' });
      } catch {
        if (!controller.signal.aborted) setFeed(current => ({
          ownerId, assigned: current.ownerId === ownerId ? current.assigned : [],
          available: current.ownerId === ownerId ? current.available : [],
          message: 'Unable to refresh BlueAI records. Retrying automatically; any records below may be out of date.',
        }));
      } finally { busy = false; }
    };
    void poll();
    const timer = window.setInterval(poll, 15000);
    window.addEventListener('focus', poll);
    document.addEventListener('visibilitychange', poll);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', poll);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [ownerId]);

  // Never show a previous account's records, even during the render before effects run.
  return ownerId && feed.ownerId === ownerId ? feed : {
    assigned: [], available: [],
    message: ownerId ? 'Loading BlueAI records…' : 'Sign in to sync your BlueAI records.',
  };
}
