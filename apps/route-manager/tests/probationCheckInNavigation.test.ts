// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import ProbationCheckInPanel from '../src/features/probation/ProbationCheckInPanel';
import type { ProbationCheckInState } from '../src/features/probation/useProbationCheckIn';

it('opens the in-app check-in page without launching the provider or recording completion', () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const element = document.createElement('div');
  const root = createRoot(element);
  const onOpenCheckIn = vi.fn();
  const state: ProbationCheckInState = {
    monthKey: '2026-10', phase: 'early', locked: false, completed: false,
    device: 'phone', record: null, error: '', syncStatus: { pendingSync: false },
    syncToServer: vi.fn(), loadFromServer: vi.fn(), openCeCheckIn: vi.fn(),
    attachProof: vi.fn(), captureComputerProof: vi.fn(), confirmCompleted: vi.fn(),
  };
  try {
    act(() => root.render(React.createElement(ProbationCheckInPanel, { state, onOpenCheckIn })));
    const button = [...element.querySelectorAll('button')].find(item => item.textContent?.includes('Check In Now'));
    expect(button).toBeTruthy();
    act(() => button!.click());
    expect(onOpenCheckIn).toHaveBeenCalledOnce();
    expect(state.openCeCheckIn).not.toHaveBeenCalled();
    expect(state.confirmCompleted).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
  }
});
