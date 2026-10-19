import { expect, it } from 'vitest';
import { normalizeProbationRecord, probationRequestKey } from '../server/admin/probationRecord';
import { mergeRecord, fingerprint } from '../src/features/probation/probationSync';
import type { ProbationCheckInRecord } from '../src/features/probation/useProbationCheckIn';
const record = { monthKey: '2026-10', device: 'computer', events: [{ type: 'opened_ce', device: 'computer', at: '2026-10-02T10:00:00Z' }] };
it('rejects client assertions of provider verification and invalid reporting months', () => {
  expect(() => normalizeProbationRecord({ ...record, verificationLevel: 'provider_verified' })).toThrow();
  expect(() => normalizeProbationRecord({ ...record, monthKey: '2026-13' })).toThrow();
});
it('uses identical retry keys for equivalent normalized events and separates accounts', () => {
  const first = normalizeProbationRecord(record);
  const retry = normalizeProbationRecord({ ...record, events: [...record.events, ...record.events] });
  expect(probationRequestKey('owner-a', first)).toBe(probationRequestKey('owner-a', retry));
  expect(probationRequestKey('owner-b', first)).not.toBe(probationRequestKey('owner-a', first));
});
it('rejects malformed event timestamps and unsupported proof content', () => {
  expect(() => normalizeProbationRecord({ ...record, events: [{ ...record.events[0], at: 'bad' }] })).toThrow();
  expect(() => normalizeProbationRecord({ ...record, proofDataUrl: 'data:text/html;base64,YQ==' })).toThrow();
});
it('keeps pending proof and merges server completion and events without marking pending edits synced', () => {
  const local: ProbationCheckInRecord = { monthKey: '2026-10', device: 'phone', proofName: 'new.jpg', proofDataUrl: 'new', events: [{ type: 'proof_attached', device: 'phone', at: '2026-10-02T12:00:00Z' }], serverSynced: false };
  const remote: ProbationCheckInRecord = { ...local, proofName: 'old.jpg', proofDataUrl: 'old', completedAt: '2026-10-02T10:00:00Z', serverSynced: true, events: [{ type: 'completed', device: 'phone', at: '2026-10-02T10:00:00Z' }] };
  const merged = mergeRecord(local, remote);
  expect(merged.proofName).toBe('new.jpg');
  expect(merged.completedAt).toBe(remote.completedAt);
  expect(merged.events).toHaveLength(2);
  expect(merged.serverSynced).toBe(false);
  expect(fingerprint({ ...local, serverSynced: true })).toBe(fingerprint(local));
});
