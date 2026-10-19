import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import SoftwareShell, { isRouteManagerLocation } from '../src/shell/SoftwareShell';

const lifecycle = vi.hoisted(() => ({ mounts: 0, unmounts: 0 }));
vi.mock('../src/auth/AuthProvider', () => ({ useAuth: () => ({ user: { email: 'test@example.com' }, signOut: vi.fn() }) }));
vi.mock('../src/App', () => ({ default: ({ onExitToHallway }: { onExitToHallway: () => void }) => {
  useEffect(() => { lifecycle.mounts++; return () => { lifecycle.unmounts++; }; }, []);
  return React.createElement('div', null, 'Room-only content', React.createElement('button', { onClick: onExitToHallway }, 'Main menu'));
} }));
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  window.history.replaceState(null, '', '/');
  lifecycle.mounts = 0; lifecycle.unmounts = 0;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); });
const render = () => act(async () => { root.render(React.createElement(SoftwareShell)); });

it('opens the hallway without mounting room code, then enters and fully exits the room', async () => {
  await render();
  expect(container.textContent).toContain('Your hallway.');
  expect(lifecycle.mounts).toBe(0);
  await act(async () => { container.querySelector<HTMLButtonElement>('[aria-label="Open Route Manager"]')!.click(); });
  expect(window.location.hash).toBe('#dashboard');
  expect(container.textContent).toContain('Room-only content');
  expect(container.textContent).not.toContain('Your hallway.');
  await act(async () => { container.querySelector<HTMLButtonElement>('button')!.click(); });
  expect(window.location.hash).toBe('#home');
  expect(lifecycle.unmounts).toBe(1);
  expect(container.textContent).not.toContain('Room-only content');
  expect(document.activeElement).toBe(container.querySelector('h1'));
});

it('keeps bookmarks and browser navigation connected to the correct workspace', async () => {
  window.history.replaceState(null, '', '/#inventory');
  await render();
  expect(container.textContent).toContain('Room-only content');
  await act(async () => {
    window.history.replaceState(null, '', '/#home');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  expect(container.textContent).toContain('Your hallway.');
  await act(async () => {
    window.history.replaceState(null, '', '/#checkin');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(container.textContent).toContain('Room-only content');
});

it('recognizes existing room links and leaves the hallway and unknown links outside', () => {
  for (const hash of ['#jobs', '#checkin', '#route', '#diagnostics']) expect(isRouteManagerLocation({ pathname: '/', hash })).toBe(true);
  for (const pathname of ['/admin', '/routes', '/jobs']) expect(isRouteManagerLocation({ pathname, hash: '' })).toBe(true);
  for (const hash of ['', '#home', '#unknown']) expect(isRouteManagerLocation({ pathname: '/', hash })).toBe(false);
});
