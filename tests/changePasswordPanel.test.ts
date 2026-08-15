// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChangePasswordPanel, { validatePassword } from '../src/components/auth/ChangePasswordPanel';

const updatePassword = vi.fn();
let mockUser: { email: string } | null = { email: 'owner@example.com' };

vi.mock('../src/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    updatePassword,
  }),
}));

let container: HTMLDivElement;
let root: Root;

async function renderPanel() {
  await act(async () => {
    root.render(React.createElement(ChangePasswordPanel));
    await Promise.resolve();
  });
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function submitForm() {
  const form = document.querySelector('form');
  expect(form).toBeTruthy();
  await act(async () => {
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  updatePassword.mockReset();
  updatePassword.mockResolvedValue({});
  mockUser = { email: 'owner@example.com' };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
});

describe('ChangePasswordPanel', () => {
  it('validates minimum length without calling updatePassword', () => {
    expect(validatePassword('short', 'short')).toBe('Password must be at least 8 characters.');
  });

  it('validates password mismatch without calling updatePassword', async () => {
    await renderPanel();
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'));

    await act(async () => {
      setInputValue(inputs[0], 'long-enough');
      setInputValue(inputs[1], 'different');
      await Promise.resolve();
    });
    await submitForm();

    expect(updatePassword).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Passwords do not match.');
  });

  it('submits the new password through updatePassword and clears the form on success', async () => {
    await renderPanel();
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'));

    await act(async () => {
      setInputValue(inputs[0], 'new-secure-password');
      setInputValue(inputs[1], 'new-secure-password');
      await Promise.resolve();
    });
    await submitForm();

    expect(updatePassword).toHaveBeenCalledWith('new-secure-password');
    expect(document.body.textContent).toContain('Password updated.');
    expect(inputs[0].value).toBe('');
    expect(inputs[1].value).toBe('');
  });

  it('shows Supabase update errors without exposing password values', async () => {
    updatePassword.mockResolvedValueOnce({ error: 'Supabase update failed.' });
    await renderPanel();
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'));

    await act(async () => {
      setInputValue(inputs[0], 'another-secure-password');
      setInputValue(inputs[1], 'another-secure-password');
      await Promise.resolve();
    });
    await submitForm();

    expect(document.body.textContent).toContain('Supabase update failed.');
    expect(document.body.textContent).not.toContain('another-secure-password');
  });

  it('does not render credential fields in local verification mode without a Supabase user', async () => {
    mockUser = null;
    await renderPanel();

    expect(document.body.textContent).toContain('Sign in with your real account');
    expect(document.querySelectorAll('input')).toHaveLength(0);
  });
});
