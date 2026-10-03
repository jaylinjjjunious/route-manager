// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import MonthlyCheckInSettings from '../src/features/probation/MonthlyCheckInSettings';
import type { ProbationCheckInState } from '../src/features/probation/useProbationCheckIn';
const browser = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('../src/hooks/useExternalBrowser', () => ({ useExternalBrowser: () => browser }));
it('opens the official provider once through the tracked launcher without an embedded login', () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const el = document.createElement('div'); const root = createRoot(el);
  const state: ProbationCheckInState = { monthKey: '2026-09', phase: 'overdue', locked: true, completed: false, device: 'computer', record: null, error: '', syncStatus: { pendingSync: false }, syncToServer: vi.fn(), loadFromServer: vi.fn(), openCeCheckIn: vi.fn(), attachProof: vi.fn(), captureComputerProof: vi.fn(), confirmCompleted: vi.fn() };
  act(() => root.render(React.createElement(MonthlyCheckInSettings, { state })));
  expect(el.querySelector('iframe')).toBeNull();
  const launch = [...el.querySelectorAll('button')].find(button => button.textContent?.includes('Open Official CE Check-In'))!;
  act(() => launch.click());
  expect(state.openCeCheckIn).toHaveBeenCalledTimes(1);
  expect(state.confirmCompleted).not.toHaveBeenCalled();
  act(() => root.unmount());
});
