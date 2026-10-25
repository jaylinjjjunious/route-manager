import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GUEST_MODE_KEY, GUEST_PLAN_KEY, guestDirections, readGuestPlan, setGuestMode, writeGuestPlan } from '../src/guest/guestStorage';

const auth = vi.hoisted(() => ({ session: null as any, user: null as any, loading: false, verificationMode: false,
  workspaceBypassAvailable: false, signIn: vi.fn(), enableWorkspaceBypass: vi.fn() }));
vi.mock('../src/auth/AuthProvider', () => ({ useAuth: () => auth }));
vi.mock('../src/App', () => ({ default: () => React.createElement('div', null, 'PRIVATE ACCOUNT APP') }));
import ProtectedApp from '../src/auth/ProtectedApp';
import { getStorageOwner } from '../src/utils/ownerStorage';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); sessionStorage.clear();
  auth.session = null; auth.user = null;
  window.history.replaceState(null, '', '/route-manager/login');
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); });

describe('guest storage boundary', () => {
  it('reads and writes only the guest key even with private and unowned records present', () => {
    localStorage.setItem('jobs', 'PRIVATE LEGACY JOB');
    localStorage.setItem('jobs:owner-123', 'PRIVATE ACCOUNT JOB');
    const reads = vi.spyOn(Storage.prototype, 'getItem');
    expect(readGuestPlan().jobs).toEqual([]);
    expect(reads.mock.calls).toEqual([[GUEST_PLAN_KEY]]);
    writeGuestPlan({ version: 1, startAddress: 'Guest start', jobs: [{ id: 'guest-1', title: 'Guest job', address: 'Guest destination', date: '2026-10-25', completed: false }] });
    expect(readGuestPlan().jobs[0].title).toBe('Guest job');
    expect(localStorage.getItem('jobs')).toBe('PRIVATE LEGACY JOB');
    expect(localStorage.getItem('jobs:owner-123')).toBe('PRIVATE ACCOUNT JOB');
  });

  it('refuses malformed guest data without overwriting it', () => {
    localStorage.setItem(GUEST_PLAN_KEY, '{"version":0}');
    expect(() => readGuestPlan()).toThrow();
    expect(localStorage.getItem(GUEST_PLAN_KEY)).toBe('{"version":0}');
  });

  it('encodes directions using only guest destination and guest starting address', () => {
    const url = new URL(guestDirections({ id: 'g', title: 'g', address: '100 Main & First', date: '2026-10-25', completed: false }, 'Guest origin'));
    expect(url.origin).toBe('https://www.google.com');
    expect(url.searchParams.get('destination')).toBe('100 Main & First');
    expect(url.searchParams.get('origin')).toBe('Guest origin');
  });
});

describe('guest auth boundary', () => {
  it('enters a real guest workspace from login and keeps it through remount without an account identity', async () => {
    localStorage.setItem('jobs', 'PRIVATE JOB MUST STAY HIDDEN');
    await act(async () => root.render(React.createElement(ProtectedApp)));
    const bypass = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Bypass sign-in');
    expect(bypass).toBeTruthy();
    await act(async () => { bypass!.click(); });
    await vi.waitFor(() => expect(container.textContent).toContain('Guest workspace'));
    expect(container.textContent).toContain('Add job');
    expect(container.textContent).not.toContain('PRIVATE');
    expect(getStorageOwner()).toBeNull();
    expect(sessionStorage.getItem(GUEST_MODE_KEY)).toBe('active');
    act(() => root.unmount()); root = createRoot(container);
    await act(async () => root.render(React.createElement(ProtectedApp)));
    expect(container.textContent).toContain('Guest workspace');
    const signIn = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Sign in');
    await act(async () => signIn!.click());
    expect(container.textContent).toContain('Sign in to continue');
    expect(sessionStorage.getItem(GUEST_MODE_KEY)).toBeNull();
    expect(localStorage.getItem('jobs')).toBe('PRIVATE JOB MUST STAY HIDDEN');
  });

  it('gives a real session precedence and clears the guest-entry marker', async () => {
    setGuestMode(true); auth.user = { id: 'owner-123' }; auth.session = { user: auth.user };
    await act(async () => root.render(React.createElement(ProtectedApp)));
    await vi.waitFor(() => expect(container.textContent).toContain('PRIVATE ACCOUNT APP'));
    expect(container.textContent).not.toContain('Guest workspace');
    expect(getStorageOwner()).toBe('owner-123');
    expect(sessionStorage.getItem(GUEST_MODE_KEY)).toBeNull();
  });
});
