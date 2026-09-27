// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import MonthlyCheckInSettings from '../src/features/probation/MonthlyCheckInSettings';
import type { ProbationCheckInState } from '../src/features/probation/useProbationCheckIn';
const browser = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('../src/hooks/useExternalBrowser', () => ({ useExternalBrowser: () => browser }));
it('delegates Check In Now once to the audited launcher', () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const el = document.createElement('div'); const root = createRoot(el);
  const state: ProbationCheckInState = { monthKey: '2026-09', phase: 'overdue', locked: true, completed: false, device: 'computer', record: null, error: '', openCeCheckIn: vi.fn(), attachProof: vi.fn(), captureComputerProof: vi.fn(), confirmCompleted: vi.fn() };
  act(() => root.render(React.createElement(MonthlyCheckInSettings, { state })));
  const button = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.includes('Check In Now'))!;
  act(() => button.click());
  expect(state.openCeCheckIn).toHaveBeenCalledOnce();
  expect(browser.open).not.toHaveBeenCalled();
  act(() => root.unmount());
});
