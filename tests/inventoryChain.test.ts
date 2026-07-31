import { describe, expect, it, beforeEach } from 'vitest';
import {
  appendCustodyEvent,
  createCustodyEvent,
  emptyCustodyLedger,
  loadCustodyLedger,
  loadSyncQueue,
  saveCustodyLedger,
  verifyCustodyLedger,
  type CustodyItem,
} from '../src/services/inventory/chainOfCustody';

function makeItem(): CustodyItem {
  return {
    domain: 'merchandising',
    id: 'item-1',
    jobId: 'job-1',
    partNumber: 'P-100',
    serialNumber: 'S-100',
    status: 'received',
    evidence: [],
    eventIds: [],
    updatedAt: new Date().toISOString(),
  };
}

describe('chain of custody ledger', () => {
  beforeEach(() => localStorage.clear());

  it('creates a linked receive/install/remove/return history and persists it offline', async () => {
    let ledger = emptyCustodyLedger('job-1');
    const item = makeItem();
    const types = ['receive_in', 'install', 'removal', 'return'] as const;

    for (const type of types) {
      const event = await createCustodyEvent({
        jobId: 'job-1',
        itemId: item.id,
        type,
        partNumber: item.partNumber,
        serialNumber: item.serialNumber,
        previousHash: ledger.events.at(-1)?.hash,
        receiptNumber: type === 'return' ? 'RCPT-1' : undefined,
        trackingNumber: type === 'return' ? 'TRACK-1' : undefined,
      });
      ledger = appendCustodyEvent(ledger, event, { ...item, status: type === 'return' ? 'returned' : type === 'install' ? 'installed' : type === 'removal' ? 'removed' : 'received' });
    }

    expect(ledger.events).toHaveLength(4);
    expect(ledger.events[1].previousHash).toBe(ledger.events[0].hash);
    expect(ledger.events[3].receiptNumber).toBe('RCPT-1');
    expect(ledger.events[3].trackingNumber).toBe('TRACK-1');
    expect(ledger.items[0].status).toBe('returned');
    expect(loadCustodyLedger('job-1').events).toHaveLength(4);
    expect(loadSyncQueue()).toHaveLength(4);
    await expect(verifyCustodyLedger(ledger)).resolves.toEqual({ valid: true });
  });

  it('detects tampering in an event payload or chain link', async () => {
    let ledger = emptyCustodyLedger('job-1');
    const event = await createCustodyEvent({
      jobId: 'job-1',
      itemId: 'item-1',
      type: 'receive_in',
      partNumber: 'P-100',
      serialNumber: 'S-100',
    });
    ledger = appendCustodyEvent(ledger, event, makeItem());

    const tampered = { ...ledger, events: [{ ...ledger.events[0], serialNumber: 'S-TAMPERED' }] };
    await expect(verifyCustodyLedger(tampered)).resolves.toMatchObject({ valid: false, brokenEventId: event.id });
  });

  it('ignores invalid storage and starts an empty ledger', () => {
    localStorage.setItem('inventory_custody_ledger_v1:job-1', '{bad json');
    expect(loadCustodyLedger('job-1')).toEqual(emptyCustodyLedger('job-1'));
    saveCustodyLedger(emptyCustodyLedger('job-2'));
    expect(loadCustodyLedger('job-2').jobId).toBe('job-2');
  });

  it('keeps merchandising package custody separate from contract-parts custody', async () => {
    const ledger = emptyCustodyLedger('job-1', 'merchandising');
    const event = await createCustodyEvent({
      domain: 'merchandising',
      jobId: 'job-1',
      itemId: 'package-1',
      type: 'receive_in',
      partNumber: '',
      serialNumber: '',
      packageId: 'PKG-1',
      packageContents: 'Shelf tags',
    });
    appendCustodyEvent(ledger, event, { ...makeItem(), id: 'package-1', domain: 'merchandising', partNumber: '', serialNumber: '', packageId: 'PKG-1', packageContents: 'Shelf tags' });

    expect(loadCustodyLedger('job-1', 'merchandising').events).toHaveLength(1);
    expect(loadCustodyLedger('job-1', 'contract_parts').events).toHaveLength(0);
    expect(loadCustodyLedger('job-1', 'merchandising').events[0].packageId).toBe('PKG-1');
  });
});
