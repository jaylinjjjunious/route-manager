import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { useProofVault } from '../src/features/proofVault/useProofVault';
import ProofHistoryModal from '../src/features/proofVault/ProofHistoryModal';
import ProofVaultModal from '../src/features/proofVault/ProofVaultModal';
import type { ProofRecord } from '../src/features/proofVault/types';
import type { Job } from '../src/types';

const completedJobs: Job[] = [];
let root: Root;
let container: HTMLDivElement;
function Harness() {
  const vault = useProofVault({ completedJobs });
  return React.createElement(React.Fragment, null,
    React.createElement('button', { onClick: vault.openProofHistory }, 'Open vault'),
    vault.isProofHistoryOpen && !vault.selectedProofRecord && React.createElement(ProofHistoryModal, {
      records: vault.proofRecords, onSelect: vault.openProof, onClose: vault.closeProofHistory,
    }),
    vault.selectedProofRecord && React.createElement(ProofVaultModal, {
      selectedProofRecord: vault.selectedProofRecord, onClose: vault.closeProof,
      onBack: vault.closeProof, onAddAssets: vault.addProofAssets, onUpdateNotes: vault.updateProofNotes,
    }),
  );
}
function click(text: string) {
  const button = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes(text));
  expect(button).toBeDefined();
  act(() => button!.click());
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); localStorage.clear(); });

it('opens an empty vault instead of silently ignoring the More action, and closes with Escape', () => {
  act(() => root.render(React.createElement(Harness)));
  click('Open vault');
  expect(container.querySelector('[role=dialog]')).not.toBeNull();
  expect(container.textContent).toContain('No proof folders yet');
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(container.querySelector('[role=dialog]')).toBeNull();
  expect(document.body.style.overflow).toBe('');
});

it('browses older job folders, returns to the list, and preserves evidence and notes', () => {
  const folder = (jobId: string, date: string): ProofRecord => ({
    jobId, storeName: jobId, address: `${jobId} address`, completionTime: date, arrivalTime: date,
    createdAt: date, updatedAt: date, photos: [], screenshots: [], receipts: [], notes: `${jobId} notes`,
  });
  const older = folder('Older job', '2026-10-01T12:00:00Z');
  older.photos.push({ id: 'proof', name: 'Original photo', dataUrl: 'data:image/png;base64,fake', addedAt: older.createdAt });
  localStorage.setItem('proof_vault_records', JSON.stringify({ [older.jobId]: older, 'Newer job': folder('Newer job', '2026-10-02T12:00:00Z') }));
  act(() => root.render(React.createElement(Harness)));
  click('Open vault');
  const folders = Array.from(container.querySelectorAll('li button'));
  expect(folders[0].textContent).toContain('Newer job');
  click('Older job');
  expect(container.textContent).toContain('Original photo');
  expect(container.querySelector('textarea')?.value).toBe('Older job notes');
  click('All proof folders');
  expect(container.querySelectorAll('li')).toHaveLength(2);
  expect(JSON.parse(localStorage.getItem('proof_vault_records')!)['Older job']).toEqual(older);
  act(() => container.querySelector<HTMLButtonElement>('[aria-label="Close proof vault"]')!.click());
  expect(container.querySelector('[role=dialog]')).toBeNull();
});
