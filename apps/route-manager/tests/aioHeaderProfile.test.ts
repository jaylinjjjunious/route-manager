// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import AioHeader from '../src/components/aio/AioHeader';
import ProfileMenu from '../src/components/aio/ProfileMenu';
import { BottomTabBar } from '../src/components/aio/primitives';
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
function renderMenu(overrides: Partial<React.ComponentProps<typeof ProfileMenu>> = {}) {
  const props = {theme: 'dark' as const, onToggleTheme: vi.fn(), startAddress: 'Test hub', onUpdateStart: vi.fn(), onNavigate: vi.fn(), onOpenProof: vi.fn(), onSignOut: vi.fn(), ...overrides};
  act(() => root.render(React.createElement(ProfileMenu, props))); return props;
}
function click(text: string) { const button=Array.from(container.querySelectorAll('button')).find(b=>b.textContent===text); expect(button).toBeDefined(); act(()=>button?.click()); }
it('keeps the avatar and renders controls under the profile divider without email or More', () => {
  act(()=>root.render(React.createElement(AioHeader, {userName:'Test Driver', renderProfileMenu:()=>React.createElement('button',null,'Inventory')})));
  const button=container.querySelector('button[aria-label="Open profile menu"]');expect(button).not.toBeNull();act(()=> (button as HTMLButtonElement).click());
  const panel=container.querySelector('[aria-label="Profile menu"]');expect(panel?.textContent).toContain('Test Driver');expect(panel?.textContent).toContain('Inventory');expect(panel?.textContent).not.toContain('Open More');
  expect(panel?.querySelector('img')?.getAttribute('src')).toBe('/profile/avatar.webp');
  expect(existsSync('public/profile/avatar.webp')).toBe(true);
});
it('opens each retained destination from the panel',()=>{
  const p=renderMenu({isAdmin:true});
  for(const [label,id] of [['Inventory','inventory'],['Monthly Check-In','checkin'],['Battery','battery'],['Tracker','tracker'],['Transit tools','tools'],['Habits','habits'],['Debug Center','support'],['Diagnostics Console','diagnostics'],['Admin Portal','admin'],['Change password','changepassword']]) {click(label);expect(p.onNavigate).toHaveBeenLastCalledWith(id);}
  click('Proof Vault');expect(p.onOpenProof).toHaveBeenCalledOnce();click('Sign out');expect(p.onSignOut).toHaveBeenCalledOnce();
});
it('keeps admin and development entries out of ordinary menus',()=>{renderMenu();expect(container.textContent).not.toContain('Admin Portal');expect(container.textContent).not.toContain('Diagnostics Console');expect(container.textContent).not.toContain('Test Job');expect(container.textContent).not.toContain('Purge');});
it('saves the entered starting address only on submit',()=>{
  const p=renderMenu();const input=container.querySelector('input')!; input.value='New hub';expect(p.onUpdateStart).not.toHaveBeenCalled();
  // jsdom FormData differs from the Node implementation.
  const original=globalThis.FormData; globalThis.FormData=window.FormData;
  try {act(()=>container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(p.onUpdateStart).toHaveBeenCalledWith('New hub');} finally {globalThis.FormData=original;}
});
it('toggles the theme using the existing callback',()=>{const p=renderMenu();click('Switch to light mode');expect(p.onToggleTheme).toHaveBeenCalledOnce();});
it('offers only Today and Jobs in bottom navigation',()=>{act(()=>root.render(React.createElement(BottomTabBar,{current:'today',onChange:()=>undefined})));expect(container.querySelector('#nav-tab-today')).not.toBeNull();expect(container.querySelector('#nav-tab-jobs')).not.toBeNull();expect(container.querySelector('#nav-tab-more')).toBeNull();});
