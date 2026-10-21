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
  click('Add task'); click('Test kitchen'); click('Write my own task'); fill('title', 'Wipe test counter'); fill('interval', '1'); submit();
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

it('builds a room routine, resumes after reload, records a visit and restarts with every step', () => {
  act(() => root.render(React.createElement(App)));
  click('Add a space'); fill('name', 'Routine kitchen'); submit(); go('spaces');
  click('Build routine');
  container.querySelector<HTMLTextAreaElement>('[name="steps"]')!.value = 'Gather supplies\nWipe counters'; submit();
  click('Start routine'); click('Complete step');
  expect(container.querySelector('dialog')?.textContent).toContain('Wipe counters');
  act(() => root.unmount()); root = createRoot(container); act(() => root.render(React.createElement(App)));
  click('Continue routine'); expect(container.querySelector('dialog')?.textContent).toContain('1 of 2');
  click('Undo last step'); click('Complete step'); click('Complete step');
  const prior = localStorage.getItem(STORAGE_KEY);
  const failure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  click('Finish routine'); expect(localStorage.getItem(STORAGE_KEY)).toBe(prior);
  expect(container.querySelector('dialog [role="alert"]')?.textContent).toContain('not applied');
  failure.mockRestore(); click('Finish routine');
  expect(container.querySelector('dialog')).toBeNull();
  go('history'); expect(container.textContent).toContain('1 visits finished');
  expect(parsePlan(localStorage.getItem(STORAGE_KEY)!).history).toHaveLength(0);
  go('spaces'); click('Start routine'); expect(container.querySelector('dialog')?.textContent).toContain('0 of 2');
});

it('chooses a room before its activities and saves a suggested room and task together only on Save', () => {
  act(() => root.render(React.createElement(App)));
  click('Add task');
  expect(container.querySelector('dialog')?.textContent).not.toContain('Dishes');
  click('Bathroom'); expect(container.querySelector('dialog')?.textContent).toContain('Toilet');
  expect(container.querySelector('dialog')?.textContent).not.toContain('Dishes');
  click('← Choose another room'); click('Kitchen'); click('Dishes');
  expect(container.querySelector<HTMLInputElement>('[name="title"]')?.value).toBe('Wash dishes');
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  click('← Back to Kitchen'); click('Dishes'); submit();
  const plan = parsePlan(localStorage.getItem(STORAGE_KEY)!);
  expect(plan.spaces).toHaveLength(1); expect(plan.spaces[0].name).toBe('Kitchen');
  expect(plan.tasks[0]).toMatchObject({ title: 'Wash dishes', spaceId: plan.spaces[0].id });
  click('Add task'); click('Kitchen'); click('Sink'); submit();
  expect(parsePlan(localStorage.getItem(STORAGE_KEY)!).spaces).toHaveLength(1);
});
it('cancels without creating rooms and keeps failed room/task saves atomic', () => {
  act(() => root.render(React.createElement(App)));
  click('Add task'); click('Kitchen'); click('Dishes'); click('Cancel');
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  click('Add task'); click('Bathroom'); click('Toilet');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  submit(); expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  expect(container.querySelector('dialog [role="alert"]')?.textContent).toContain('not applied');
  expect(container.querySelector('dialog')?.open).toBe(true);
});
