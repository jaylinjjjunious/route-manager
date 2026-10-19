import type { CustodyEvent, CustodyLedger } from './chainOfCustody';
const GENESIS_HASH = 'GENESIS';

export function canonicalEvent(event: Omit<CustodyEvent, 'hash'>): string {
  const legacyFields = {
    id: event.id,
    jobId: event.jobId,
    itemId: event.itemId,
    type: event.type,
    occurredAt: event.occurredAt,
    partNumber: event.partNumber,
    serialNumber: event.serialNumber,
    coordinates: event.coordinates || null,
    evidenceIds: event.evidenceIds,
    receiptNumber: event.receiptNumber || null,
    trackingNumber: event.trackingNumber || null,
    notes: event.notes || null,
    previousHash: event.previousHash,
  };
  if (event.integrityVersion === 1) return JSON.stringify(legacyFields);
  const domainFields = {
    ...legacyFields,
    domain: event.domain,
    packageId: event.packageId || null,
    packageContents: event.packageContents || null,
  };
  if (event.integrityVersion === 2) return JSON.stringify(domainFields);
  const inventoryFields = { ...domainFields, equipmentLabel: event.equipmentLabel || null, sourceContext: event.sourceContext || null };
  if (event.integrityVersion === 3) return JSON.stringify(inventoryFields);
  return JSON.stringify({
    ...inventoryFields,
    requirementId: event.requirementId || null,
    procedureId: event.procedureId || null,
    procedureVersion: event.procedureVersion || null,
    procedureStepId: event.procedureStepId || null,
    visitId: event.visitId || null,
    requirementRole: event.requirementRole || null,
  });
}

export async function digest(value: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(value);
    const buffer = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fallback-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function verifyCustodyLedger(ledger: CustodyLedger): Promise<{ valid: boolean; brokenEventId?: string }> {
  let previousHash = GENESIS_HASH;
  for (const event of ledger.events) {
    if (event.previousHash !== previousHash) return { valid: false, brokenEventId: event.id };
    const expectedHash = await digest(canonicalEvent(event));
    if (expectedHash !== event.hash) return { valid: false, brokenEventId: event.id };
    previousHash = event.hash;
  }
  return { valid: true };
}

