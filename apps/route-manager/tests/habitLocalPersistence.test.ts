import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useHabits, type UseHabitsReturn } from '../src/features/habits/useHabits';

let state: UseHabitsReturn;
let root: Root;
let container: HTMLDivElement;
function Harness() { state = useHabits('2026-10-25'); return null; }
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); });

it('keeps existing local tasks and new logs through remount without calling a nonexistent backend', async () => {
  const request = vi.spyOn(globalThis, 'fetch');
  localStorage.setItem('habit_tracker_tasks', JSON.stringify([{ id: 'existing', name: 'Existing task', targetMinutes: 10, lastMinutes: 10, createdAt: '2026-10-01T00:00:00Z' }]));
  await act(async () => root.render(React.createElement(Harness)));
  expect(state.habitSyncStatus).toBe('local');
  expect(state.activeHabitTask.name).toBe('Existing task');
  act(() => state.handleLogHabitSession());
  expect(state.habitLogs).toHaveLength(1);
  const saved = localStorage.getItem('habit_tracker_logs');
  act(() => root.unmount()); root = createRoot(container);
  await act(async () => root.render(React.createElement(Harness)));
  expect(state.habitLogs).toHaveLength(1);
  expect(localStorage.getItem('habit_tracker_logs')).toBe(saved);
  expect(request).not.toHaveBeenCalled();
});
