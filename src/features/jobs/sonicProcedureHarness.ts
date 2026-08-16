import type { Job } from '../../types';

export const SONIC_PROCEDURE_HARNESS_PREFIX = 'dev-sonic-harness';

export interface SonicHarnessEnv {
  DEV?: boolean;
  VITE_ENABLE_SONIC_PROCEDURE_HARNESS?: string;
}

export function isSonicProcedureHarnessEnabled(env: SonicHarnessEnv): boolean {
  return env.DEV === true && env.VITE_ENABLE_SONIC_PROCEDURE_HARNESS === 'true';
}

export function createSonicHarnessJob(
  deviceTypes: string[],
  today: string,
  index: number,
): Job {
  const id = `${SONIC_PROCEDURE_HARNESS_PREFIX}-${deviceTypes.join('-').toLowerCase()}-${index}`;
  const deviceLabel = deviceTypes.join(' + ');
  return {
    id,
    storeName: `Sonic Test — ${deviceLabel}`,
    address: '1951 Golden State Ave, Bakersfield, CA',
    pay: 55.0,
    estimatedMinutes: 90,
    jobType: 'field_task',
    dueTime: '14:00',
    notes: `Development-only Sonic procedure test job with ${deviceLabel}. Enable with VITE_ENABLE_SONIC_PROCEDURE_HARNESS=true.`,
    status: 'ready',
    routeId: 'A',
    coordinates: { lat: 35.3802, lng: -119.0125 },
    priority: 'high',
    scheduledDate: today,
    deviceTypes,
    inventoryDomain: 'contract_parts',
    lifecycle: {
      schemaVersion: 1,
      status: 'planned',
      workState: 'not_started',
      visits: [],
      events: [],
    },
    procedureAssignment: {
      procedureId: 'sonic-verifone-device-swap',
      procedureVersion: '1.0.0',
      assignedAt: new Date().toISOString(),
      assignmentSource: 'manual',
      note: 'Auto-assigned by Sonic procedure harness',
    },
  };
}

const HARNESS_DEVICE_COMBINATIONS: string[][] = [
  ['V400M'],
  ['UX301'],
  ['UX401'],
  ['V400M', 'UX301'],
  ['UX301', 'UX401'],
  ['V400M', 'UX301', 'UX401'],
];

export function createSonicHarnessJobs(today: string): Job[] {
  return HARNESS_DEVICE_COMBINATIONS.map((deviceTypes, index) =>
    createSonicHarnessJob(deviceTypes, today, index),
  );
}

export function includesSonicHarnessJob(jobs: Job[]): boolean {
  return jobs.some(job => job.id.startsWith(SONIC_PROCEDURE_HARNESS_PREFIX));
}

export function ensureSonicProcedureHarnessJobs(
  jobs: Job[],
  enabled: boolean,
  today: string,
): Job[] {
  const withoutHarness = jobs.filter(job => !job.id.startsWith(SONIC_PROCEDURE_HARNESS_PREFIX));
  if (!enabled) return withoutHarness;
  return includesSonicHarnessJob(jobs)
    ? withoutHarness.concat(jobs.filter(job => job.id.startsWith(SONIC_PROCEDURE_HARNESS_PREFIX)))
    : [...createSonicHarnessJobs(today), ...withoutHarness];
}

export function resetSonicProcedureHarnessJobs(jobs: Job[], today: string): Job[] {
  return [...createSonicHarnessJobs(today), ...jobs.filter(job => !job.id.startsWith(SONIC_PROCEDURE_HARNESS_PREFIX))];
}
