// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import MonthlyCheckInSettings from '../src/features/probation/MonthlyCheckInSettings';
import type { ProbationCheckInState } from '../src/features/probation/useProbationCheckIn';
const browser = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('../src/hooks/useExternalBrowser', () => ({ useExternalBrowser: () => browser }));
it('renders embedded CE Check-In panel in incomplete state', () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const el = document.createElement('div'); const root = createRoot(el);
  const state: ProbationCheckInState = { monthKey: '2026-09', phase: 'overdue', locked: true, completed: false, device: 'computer', record: null, error: '', openCeCheckIn: vi.fn(), attachProof: vi.fn(), captureComputerProof: vi.fn(), confirmCompleted: vi.fn() };
  act(() => root.render(React.createElement(MonthlyCheckInSettings, { state })));
  const iframe = el.querySelector('iframe');
  expect(iframe).toBeTruthy();
  expect(iframe?.src).toContain('/api/proxy/ce-checkin');
  act(() => root.unmount());
});
