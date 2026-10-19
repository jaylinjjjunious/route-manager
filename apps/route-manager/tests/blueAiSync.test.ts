import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useJobs, type UseJobsReturn } from '../src/features/jobs/useJobs';
import { normalizeBlueAiPayload } from '../server/blueai/blueAiPayload';
import fixture from './fixtures/blueai-job.json';

const api = vi.hoisted(() => ({ authFetchJson: vi.fn() }));
vi.mock('../src/services/apiClient', () => api);

it('automatically refreshes hook calendar groups, persists changes and respects local deletion', async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  vi.useFakeTimers();
  const ownerId = '11111111-1111-4111-8111-111111111111';
  const first = normalizeBlueAiPayload(fixture, ownerId);
  let snapshot = first;
  api.authFetchJson.mockImplementation(async () => ({ enabled: true, jobs: [snapshot] }));
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let state: UseJobsReturn;
  function Calendar() {
    state = useJobs(fixture.date, { blueAiUserId: ownerId });
    return React.createElement('div', {}, state.weeklyDays.map(day => React.createElement('p', { key: day.date }, `${day.date}: ${day.jobs.map(job => job.storeName).join(',')}`)));
  }
  try {
    await act(async () => { root.render(React.createElement(Calendar)); });
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(state!.jobs.filter(job => job.blueAi)).toHaveLength(1);
    expect(container.querySelector('p')?.textContent).toContain('Store display audit');
    expect(state!.weeklyDays[0].date).toBe('2026-09-28');
    snapshot = { ...first, scheduledDate: '2026-09-29', blueAi: { ...first.blueAi, revision: 2 } };
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(state!.weeklyDays[1].jobs.some(job => job.id === first.id)).toBe(true);
    expect(JSON.parse(localStorage.getItem('route_optimizer_jobs')!).find(job => job.id === first.id).scheduledDate).toBe('2026-09-29');
    act(() => state!.replaceJobs(state!.deleteJob(first.id)));
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(state!.jobs.some(job => job.id === first.id)).toBe(false);
  } finally {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    vi.useRealTimers();
  }
});
