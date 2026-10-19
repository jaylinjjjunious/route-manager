import { expect, it } from 'vitest';
import { buildJobMapsUrl } from '../src/utils/jobNavigation';

const job = { address: 'Family Dollar 600 Norris Rd', coordinates: { lat: 35, lng: -119 } };
it('uses the job address and explicit app starting point for every mode', () => {
  for (const mode of ['bicycling', 'walking', 'driving'] as const) {
    const url = new URL(buildJobMapsUrl(job, { lat: 35.39, lng: -119.02 }, mode));
    expect(url.searchParams.get('origin')).toBe('35.39,-119.02');
    expect(url.searchParams.get('destination')).toBe(job.address);
    expect(url.searchParams.get('travelmode')).toBe(mode);
  }
});
it('uses the preceding job address rather than its stale coordinates', () => {
  const previous = { address: 'Previous store & pickup', coordinates: { lat: 1, lng: 2 } };
  expect(new URL(buildJobMapsUrl(job, previous, 'walking')).searchParams.get('origin')).toBe(previous.address);
});
it('falls back to coordinates only when the address is blank', () => {
  const url = new URL(buildJobMapsUrl({ ...job, address: ' ' }, undefined, 'driving'));
  expect(url.searchParams.get('destination')).toBe('35,-119');
  expect(url.searchParams.has('origin')).toBe(false);
});
