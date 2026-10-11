// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import JobDetailModal from '../src/features/jobs/JobDetailModal';
import type { Job } from '../src/types';
let root: Root;
let container: HTMLDivElement;
const job: Job = { id: 'test', storeName: 'Vons', address: '5201 White Ln', pay: 25, estimatedMinutes: 30, jobType: 'retail_audit', dueTime: '17:00', notes: '', status: 'ready', routeId: 'A', coordinates: { lat: 35, lng: -119 } };
let onClose: ReturnType<typeof vi.fn<() => void>>;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0; });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container); onClose = vi.fn();
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
function render(locked = false, currentJob = job) {
  act(() => root.render(React.createElement(JobDetailModal, { job: currentJob, routeIndex: 0, legDistance: 5, rideMinutes: 30, navLink: '', isOutlier: false, jobAccessLocked: locked, onToggleComplete: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onDuplicate: vi.fn(), onToggleRoute: vi.fn(), onClose })));
}
it('shows address and logo without the retired workflow tabs', () => {
  render();
  expect(document.querySelector('img')?.getAttribute('src')).toBe('/store-logos/vons.svg');
  expect(document.body.textContent).toContain(job.address);
  expect(document.querySelector('[role=tab]')).toBeNull();
  expect(document.body.textContent).toContain('12 min');
});
it('changes the maps destination travel mode and estimate', () => {
  render();
  const bike = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Bike')!;
  act(() => bike.click());
  const link = document.querySelector('a')!;
  expect(new URL(link.href).searchParams.get('travelmode')).toBe('bicycling');
  expect(new URL(link.href).searchParams.get('destination')).toBe(job.address);
  expect(document.body.textContent).toContain('30 min');
});
it('prevents navigation while monthly job access is locked', () => {
  render(true);
  expect(document.querySelector('a')?.hasAttribute('href')).toBe(false);
  expect(document.querySelector('a')?.getAttribute('aria-disabled')).toBe('true');
  expect(document.body.textContent).toContain('Check-in required');
});
it('closes with Escape and restores body scrolling', () => {
  render();
  expect(document.body.style.overflow).toBe('hidden');
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(onClose).toHaveBeenCalledOnce();
  act(() => root.render(null));
  expect(document.body.style.overflow).toBe('');
});
it('shows a placeholder when no store logo is available', () => {
  render(false, { ...job, storeName: 'Unknown Test Store' });
  expect(document.querySelector('img')).toBeNull();
  expect(document.querySelector('svg.lucide-image')).not.toBeNull();
});

it('opens each tool with the selected job ID and blocks tools when job access is locked', () => {
  const onOpenScan = vi.fn(); const onOpenPreviewGuide = vi.fn(); const onOpenInventory = vi.fn();
  const props = { job, routeIndex: 0, legDistance: 5, rideMinutes: 30, navLink: '', isOutlier: false,
    jobAccessLocked: false, onToggleComplete: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(),
    onDuplicate: vi.fn(), onToggleRoute: vi.fn(), onClose, onOpenScan, onOpenPreviewGuide, onOpenInventory };
  act(() => root.render(React.createElement(JobDetailModal, props)));
  for (const [label, callback] of [['Scan', onOpenScan], ['Preview Guide', onOpenPreviewGuide], ['Inventory', onOpenInventory]] as const) {
    const button = Array.from(document.querySelectorAll('button')).find(button => button.textContent === label)!;
    act(() => button.click());
    expect(callback).toHaveBeenCalledExactlyOnceWith(job.id);
  }
  act(() => root.render(React.createElement(JobDetailModal, { ...props, jobAccessLocked: true })));
  for (const label of ['Scan', 'Preview Guide', 'Inventory']) {
    expect(Array.from(document.querySelectorAll('button')).find(button => button.textContent === label)?.disabled).toBe(true);
  }
});
