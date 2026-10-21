import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import { addDays, emptyPlan, parsePlan, dayKey } from '../src/model';
import { configureBathroom } from '../src/bathroom';
import { STORAGE_KEY } from '../src/storage';

let root: Root;
let container: HTMLDivElement;
const click = (text: string) => {
  const button = [...container.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.trim() === text);
  expect(button, text).toBeDefined(); act(() => button!.click());
};
const fill = (name: string, value: string) => { const input = container.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!; expect(input).not.toBeNull(); input.value = value; };
const submit = () => act(() => { (container.querySelector('dialog form') || container.querySelector('form'))!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
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
  click('Add task'); click('Test kitchen'); fill('title', 'Wipe test counter'); submit(); click('Add selected tasks'); click('Close');
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
  expect(container.querySelector('dialog h2')?.textContent).toBe('Kitchen');
  expect(container.querySelector('[name="minutes"]')).toBeNull();
  click('Counters');
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  click('Add selected tasks');
  expect(container.querySelector('dialog h2')?.textContent).toBe('Kitchen');
  expect(container.querySelector('[role="status"]')?.textContent).toContain('added');
  click('Close');
  const plan = parsePlan(localStorage.getItem(STORAGE_KEY)!);
  expect(plan.spaces).toHaveLength(1); expect(plan.spaces[0].name).toBe('Kitchen');
  expect(plan.tasks).toHaveLength(2);
  expect(plan.tasks[0]).toMatchObject({ title: 'Wash dishes', spaceId: plan.spaces[0].id, intervalDays: 0, due: dayKey() });
  click('Add task'); click('Kitchen'); click('Sink'); click('Add selected tasks');
  expect(parsePlan(localStorage.getItem(STORAGE_KEY)!).spaces).toHaveLength(1);
});
it('cancels without creating rooms and keeps failed room/task saves atomic', () => {
  act(() => root.render(React.createElement(App)));
  click('Add task'); click('Kitchen'); click('Dishes'); click('Close');
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  click('Add task'); click('Bathroom'); click('Toilet');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  click('Add selected tasks'); expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  expect(container.querySelector('dialog [role="alert"]')?.textContent).toContain('not applied');
  expect(container.querySelector('dialog')?.open).toBe(true);
});

it('prepares tools, clocks in, reloads, pauses and clocks out without checking every step during work', () => {
  act(() => root.render(React.createElement(App)));
  click('Add task'); click('Kitchen'); click('Dishes'); click('Get ready');
  expect(container.querySelector('dialog')?.textContent).toContain('Tools & supplies');
  click('Back to activities');
  expect(container.querySelector('dialog h2')?.textContent).toBe('Kitchen');
  click('Get ready');
  const failure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  click('Clock in'); expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  expect(container.querySelector('dialog [role="alert"]')?.textContent).toContain('not applied');
  failure.mockRestore(); click('Clock in');
  const id = parsePlan(localStorage.getItem(STORAGE_KEY)!).sessions![0].id;
  act(() => root.unmount()); root = createRoot(container); act(() => root.render(React.createElement(App)));
  expect(container.textContent).toContain('You are clocked in');
  click('Pause'); expect(parsePlan(localStorage.getItem(STORAGE_KEY)!).sessions![0].pausedAt).not.toBeNull();
  click('Resume cleaning'); click('Clock out'); click('All finished');
  const finishFailure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  submit(); expect(parsePlan(localStorage.getItem(STORAGE_KEY)!).sessions![0].endedAt).toBeNull();
  finishFailure.mockRestore(); submit();
  const saved = parsePlan(localStorage.getItem(STORAGE_KEY)!);
  expect(saved.sessions![0]).toMatchObject({ id, completed: ['Wash dishes'], pausedAt: null });
  expect(saved.sessions![0].endedAt).not.toBeNull();
  go('history'); expect(container.textContent).toContain('1 clocked out');
});

it('sets up the Bathroom schedule and advances only finished activities when clocking out', () => {
  act(() => root.render(React.createElement(App)));
  expect(container.textContent).toContain('Bathroom start date');
  click('Set up Bathroom');
  let plan = parsePlan(localStorage.getItem(STORAGE_KEY)!);
  expect(plan.version).toBe(4); expect(plan.spaces).toHaveLength(1); expect(plan.spaces[0].bathroom?.lastDone).toEqual({});
  click('Start cleaning');
  expect(container.querySelectorAll('dialog [aria-pressed="true"]')).toHaveLength(2);
  click('Get ready'); click('Back to activities');
  expect(container.querySelector('dialog h2')?.textContent).toContain('today');
  click('Get ready'); click('Clock in'); click('Clock out'); click('All finished'); submit();
  plan = parsePlan(localStorage.getItem(STORAGE_KEY)!);
  expect(plan.spaces[0].bathroom?.lastDone).toEqual({ toilet: dayKey(), sink: dayKey() });
  expect(plan.history).toHaveLength(0); expect(plan.tasks).toHaveLength(0);
  expect(container.textContent).toContain('Nothing due right now');
});

it('marks only checked bathroom cleaning finished, handles save failure, undoes, and keeps the result after reload',()=>{
  const initial=configureBathroom(emptyPlan(),dayKey(),dayKey());
  localStorage.setItem(STORAGE_KEY,JSON.stringify(initial));
  act(()=>root.render(React.createElement(App)));
  click('Mark finished');expect(container.querySelector<HTMLButtonElement>('dialog .primary')!.disabled).toBe(true);
  act(()=>container.querySelector<HTMLInputElement>('dialog input[type="checkbox"]')!.click());
  const fail=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('full');});
  click('Save finished cleaning');expect(container.querySelector('dialog')).not.toBeNull();expect(container.querySelector('.bathroom-due-list')!.textContent).toContain('Toilet wipe-down');fail.mockRestore();
  click('Save finished cleaning');expect(container.querySelector('dialog')).toBeNull();
  expect(container.querySelector('.bathroom-due-list')!.textContent).not.toContain('Toilet wipe-down');expect(container.querySelector('.bathroom-due-list')!.textContent).toContain('Sink wipe-down');
  click('Undo last finish');expect(parsePlan(localStorage.getItem(STORAGE_KEY)!).spaces[0].bathroom!.lastDone).toEqual({});
  click('Mark finished');act(()=>container.querySelector<HTMLInputElement>('dialog input[type="checkbox"]')!.click());click('Save finished cleaning');
  act(()=>root.unmount());root=createRoot(container);act(()=>root.render(React.createElement(App)));
  expect(container.querySelector('.bathroom-due-list')!.textContent).not.toContain('Toilet wipe-down');expect(container.querySelector('.finished-today')!.textContent).toContain('Toilet wipe-down');
});

it('shows only due daily, fortnightly and monthly work when starting cleaning',()=>{
  const today=dayKey();
  for (const [start, count] of [[today,2],[addDays(today,-14),5],[addDays(today,-40),6]] as const) {
    const plan=configureBathroom(emptyPlan(),start,start);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(plan));act(()=>root.render(React.createElement(App,{key:start})));
    click('Start cleaning');const dialog=container.querySelector('dialog')!;
    expect(dialog.querySelectorAll('.picker-choice')).toHaveLength(count);
    expect(dialog.textContent).toContain('Toilet wipe-down');expect(dialog.textContent).toContain('Sink wipe-down');
    expect(dialog.textContent?.includes('Clean bathroom floor')).toBe(count>=5);
    expect(dialog.textContent?.includes('Clean the shower')).toBe(count===6);
    click('Get ready');expect(container.querySelector('dialog')!.querySelectorAll('.routine-steps li')).toHaveLength(count);
    click('Back to activities');click('Back');
  }
});
