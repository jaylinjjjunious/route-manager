import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import { parsePlan, dayKey } from '../src/model';
import { STORAGE_KEY } from '../src/storage';

let root: Root;
let container: HTMLDivElement;
const click = (text: string) => {
  const button = [...container.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === text);
  expect(button, text).toBeDefined(); act(() => button!.click());
};
const fill = (name: string, value: string) => { const input = container.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!; expect(input).not.toBeNull(); input.value = value; };
const submit = () => act(() => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
const go = (page: string) => act(() => { window.history.replaceState(null, '', `/#${page}`); window.dispatchEvent(new HashChangeEvent('hashchange')); });
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  localStorage.clear(); window.history.replaceState(null, '', '/');
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); localStorage.clear(); vi.restoreAllMocks(); });

it('creates personal work, completes it, undoes it and recovers the saved schedule after remount', () => {
  act(() => root.render(React.createElement(App)));
  click('Add a space'); fill('name', 'Test kitchen'); submit(); go('spaces');
  click('Add task'); fill('title', 'Wipe test counter'); fill('interval', '1'); submit();
  const complete = container.querySelector<HTMLButtonElement>('[aria-label="Complete Wipe test counter"]')!;
  act(() => complete.click());
  expect(parsePlan(localStorage.getItem(STORAGE_KEY)!).history).toHaveLength(1);
  go('history'); expect(container.textContent).toContain('Test kitchen'); click('Undo');
  expect(parsePlan(localStorage.getItem(STORAGE_KEY)!).history).toHaveLength(0);
  act(() => root.unmount()); root = createRoot(container); go('today'); act(() => root.render(React.createElement(App)));
  expect(container.textContent).toContain('Wipe test counter');
  expect(parsePlan(localStorage.getItem(STORAGE_KEY)!).tasks[0].due).toBe(dayKey());
  expect(container.querySelector('a')?.getAttribute('href')).toBe('/#home');
});
it('leaves an unsaved space out of the UI and shows the saving error inside its open dialog', () => {
  act(() => root.render(React.createElement(App)));
  click('Add a space'); fill('name', 'Unsaved space');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); }); submit();
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  expect(container.querySelector('dialog [role="alert"]')?.textContent).toContain('not applied');
  expect(container.querySelector('dialog')?.open).toBe(true);
});
