import { describe, expect, it } from 'vitest';
import {
  SONIC_PROCEDURE_HARNESS_PREFIX,
  createSonicHarnessJob,
  createSonicHarnessJobs,
  ensureSonicProcedureHarnessJobs,
  includesSonicHarnessJob,
  isSonicProcedureHarnessEnabled,
  resetSonicProcedureHarnessJobs,
} from '../src/features/jobs/sonicProcedureHarness';

describe('sonic procedure harness', () => {
  it('is enabled only in dev with the correct flag', () => {
    expect(isSonicProcedureHarnessEnabled({ DEV: true, VITE_ENABLE_SONIC_PROCEDURE_HARNESS: 'true' })).toBe(true);
    expect(isSonicProcedureHarnessEnabled({ DEV: true, VITE_ENABLE_SONIC_PROCEDURE_HARNESS: 'false' })).toBe(false);
    expect(isSonicProcedureHarnessEnabled({ DEV: false, VITE_ENABLE_SONIC_PROCEDURE_HARNESS: 'true' })).toBe(false);
    expect(isSonicProcedureHarnessEnabled({})).toBe(false);
  });

  it('creates a Sonic harness job with the correct assignment', () => {
    const job = createSonicHarnessJob(['V400M', 'UX301'], '2026-08-16', 0);
    expect(job.id).toContain(SONIC_PROCEDURE_HARNESS_PREFIX);
    expect(job.storeName).toContain('V400M + UX301');
    expect(job.jobType).toBe('field_task');
    expect(job.routeId).toBe('A');
    expect(job.deviceTypes).toEqual(['V400M', 'UX301']);
    expect(job.inventoryDomain).toBe('contract_parts');
    expect(job.procedureAssignment).toMatchObject({
      procedureId: 'sonic-verifone-device-swap',
      procedureVersion: '1.0.0',
      assignmentSource: 'manual',
    });
    expect(job.lifecycle?.status).toBe('planned');
  });

  it('creates all 6 device combinations', () => {
    const jobs = createSonicHarnessJobs('2026-08-16');
    expect(jobs).toHaveLength(6);
    expect(jobs[0].deviceTypes).toEqual(['V400M']);
    expect(jobs[1].deviceTypes).toEqual(['UX301']);
    expect(jobs[2].deviceTypes).toEqual(['UX401']);
    expect(jobs[3].deviceTypes).toEqual(['V400M', 'UX301']);
    expect(jobs[4].deviceTypes).toEqual(['UX301', 'UX401']);
    expect(jobs[5].deviceTypes).toEqual(['V400M', 'UX301', 'UX401']);
  });

  it('detects harness presence', () => {
    const jobs = createSonicHarnessJobs('2026-08-16');
    expect(includesSonicHarnessJob(jobs)).toBe(true);
    expect(includesSonicHarnessJob([])).toBe(false);
  });

  it('adds harness jobs when enabled and absent', () => {
    const base = [{ id: 'seed-1', storeName: 'Test', address: '123 Main', pay: 10, estimatedMinutes: 15, jobType: 'field_task', dueTime: '12:00', notes: '', status: 'ready', routeId: 'A', coordinates: { lat: 0, lng: 0 } }];
    const result = ensureSonicProcedureHarnessJobs(base, true, '2026-08-16');
    expect(result.filter(j => j.id.startsWith(SONIC_PROCEDURE_HARNESS_PREFIX))).toHaveLength(6);
    expect(result.find(j => j.id === 'seed-1')).toBeTruthy();
  });

  it('removes harness jobs when disabled', () => {
    const harness = createSonicHarnessJobs('2026-08-16');
    const base = [{ id: 'seed-1', storeName: 'Test', address: '123 Main', pay: 10, estimatedMinutes: 15, jobType: 'field_task', dueTime: '12:00', notes: '', status: 'ready', routeId: 'A', coordinates: { lat: 0, lng: 0 } }];
    const combined = [...harness, ...base];
    const result = ensureSonicProcedureHarnessJobs(combined, false, '2026-08-16');
    expect(result.filter(j => j.id.startsWith(SONIC_PROCEDURE_HARNESS_PREFIX))).toHaveLength(0);
    expect(result.find(j => j.id === 'seed-1')).toBeTruthy();
  });

  it('preserves existing harness jobs when already present', () => {
    const harness = createSonicHarnessJobs('2026-08-16');
    const base = [{ id: 'seed-1', storeName: 'Test', address: '123 Main', pay: 10, estimatedMinutes: 15, jobType: 'field_task', dueTime: '12:00', notes: '', status: 'ready', routeId: 'A', coordinates: { lat: 0, lng: 0 } }];
    const combined = [...harness, ...base];
    const result = ensureSonicProcedureHarnessJobs(combined, true, '2026-08-16');
    expect(result.filter(j => j.id.startsWith(SONIC_PROCEDURE_HARNESS_PREFIX))).toHaveLength(6);
  });

  it('reset replaces all harness jobs with fresh ones', () => {
    const oldHarness = createSonicHarnessJobs('2026-08-15');
    const base = [{ id: 'seed-1', storeName: 'Test', address: '123 Main', pay: 10, estimatedMinutes: 15, jobType: 'field_task', dueTime: '12:00', notes: '', status: 'ready', routeId: 'A', coordinates: { lat: 0, lng: 0 } }];
    const combined = [...oldHarness, ...base];
    const result = resetSonicProcedureHarnessJobs(combined, '2026-08-16');
    const newHarness = result.filter(j => j.id.startsWith(SONIC_PROCEDURE_HARNESS_PREFIX));
    expect(newHarness).toHaveLength(6);
    expect(newHarness[0].scheduledDate).toBe('2026-08-16');
    expect(result.find(j => j.id === 'seed-1')).toBeTruthy();
  });
});
