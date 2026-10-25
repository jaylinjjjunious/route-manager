import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAppNavigation, type AppTab } from '../src/hooks/useAppNavigation';

let root: Root;
let container: HTMLDivElement;
function Harness() {
  const { currentTab, handleTabChange } = useAppNavigation();
  return React.createElement('div', null, React.createElement('output', null, currentTab),
    ...(['dashboard', 'jobs', 'inventory'] as AppTab[]).map(tab => React.createElement('button', { key: tab, onClick: () => handleTabChange(tab) }, tab)));
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  window.history.replaceState(null, '', '/route-manager/#dashboard');
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); });
function click(text: string) { act(() => Array.from(container.querySelectorAll('button')).find(button => button.textContent === text)!.click()); }

it('preserves page history, restores Back/Forward, and avoids duplicate entries', async () => {
  act(() => root.render(React.createElement(Harness)));
  const original = history.length;
  click('jobs'); click('jobs'); click('inventory');
  expect(history.length).toBe(original + 2);
  act(() => history.back());
  await vi.waitFor(() => expect(container.querySelector('output')?.textContent).toBe('jobs'));
  expect(location.hash).toBe('#jobs');
  act(() => history.back());
  await vi.waitFor(() => expect(container.querySelector('output')?.textContent).toBe('dashboard'));
  act(() => history.forward());
  await vi.waitFor(() => expect(container.querySelector('output')?.textContent).toBe('jobs'));
});

it.each(['', '#more', '#settings', '#routes', '#unknown'])(
  'opens or restores %s as Today, retaining Jobs as a real destination', async hash => {
    window.history.replaceState(null, '', '/route-manager/' + hash);
    act(() => root.render(React.createElement(Harness)));
    expect(container.querySelector('output')?.textContent).toBe('dashboard');
    click('jobs');
    act(() => history.back());
    await vi.waitFor(() => expect(container.querySelector('output')?.textContent).toBe('dashboard'));
  },
);
