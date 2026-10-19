import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ProtectedApp from '../src/auth/ProtectedApp';
import { setStorageOwner } from '../src/utils/ownerStorage';

vi.mock('../src/auth/AuthProvider', () => ({ useAuth: () => ({ session: null, user: null, loading: false, verificationMode: false }) }));
vi.mock('../src/components/LoginPage', () => ({ default: ({ onForgotPassword }: { onForgotPassword: () => void }) => React.createElement('button', { onClick: onForgotPassword }, 'Forgot password') }));
vi.mock('../src/components/ForgotPasswordPage', () => ({ default: ({ onBack }: { onBack: () => void }) => React.createElement('button', { onClick: onBack }, 'Back to login') }));
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); setStorageOwner(null); });

it('keeps password recovery in the hosted room and exposes a parent-menu exit before login', () => {
  window.history.replaceState(null, '', '/route-manager/');
  act(() => root.render(React.createElement(ProtectedApp)));
  expect(container.querySelector('a')?.getAttribute('href')).toBe('/#home');
  act(() => container.querySelector<HTMLButtonElement>('button')!.click());
  expect(window.location.pathname).toBe('/route-manager/forgot-password');
  expect(container.textContent).toContain('Back to login');
  act(() => container.querySelector<HTMLButtonElement>('button')!.click());
  expect(window.location.pathname).toBe('/route-manager/login');
});
it('preserves standalone authentication URLs', () => {
  window.history.replaceState(null, '', '/login');
  act(() => root.render(React.createElement(ProtectedApp)));
  act(() => container.querySelector<HTMLButtonElement>('button')!.click());
  expect(window.location.pathname).toBe('/forgot-password');
});
