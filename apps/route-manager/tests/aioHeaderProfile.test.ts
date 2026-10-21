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
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
function renderMenu(overrides: Partial<React.ComponentProps<typeof ProfileMenu>> = {}) {
  const props = {theme: 'dark' as const, onToggleTheme: vi.fn(), startAddress: 'Test hub', onUpdateStart: vi.fn(), onNavigate: vi.fn(), onOpenProof: vi.fn(), onSignOut: vi.fn(), ...overrides};
  act(() => root.render(React.createElement(ProfileMenu, props))); return props;
}
function click(text: string) { const button=Array.from(container.querySelectorAll('button')).find(b=>b.textContent===text); expect(button).toBeDefined(); act(()=>button?.click()); }
it('opens the left sidebar from the wordmark while leaving the avatar in place', () => {
  act(()=>root.render(React.createElement(AioHeader, {userName:'Test Driver', renderProfileMenu:()=>React.createElement('button',null,'Inventory')})));
  const button=container.querySelector('button[aria-label="Open navigation sidebar"]');expect(button).not.toBeNull();act(()=> (button as HTMLButtonElement).click());
  const panel=container.querySelector('[aria-label="Navigation sidebar"]');expect(panel?.textContent).toContain('Test Driver');expect(panel?.textContent).toContain('Inventory');expect(panel?.textContent).not.toContain('Open More');
  expect(panel?.querySelector('img')?.getAttribute('src')).toBe('/profile/avatar.webp');
  expect((panel as HTMLDialogElement).open).toBe(true);
  expect(container.querySelector('img[alt="Your profile picture"]')?.closest('dialog')).toBeNull();
  expect(document.body.style.overflow).toBe('hidden');
  click('×'); expect((panel as HTMLDialogElement).open).toBe(false);expect(document.body.style.overflow).not.toBe('hidden');
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

function touch(type: string, target: Element, x: number, y: number) {
  const event = new Event(type, {bubbles:true});
  Object.defineProperty(event, type === 'touchstart' ? 'touches' : 'changedTouches', {value:[{clientX:x, clientY:y}]});
  act(()=>target.dispatchEvent(event));
}
it('opens only from a horizontal edge swipe and closes with a left swipe',()=>{
  act(()=>root.render(React.createElement(AioHeader,{renderProfileMenu:()=>React.createElement('button',null,'Inventory')})));
  const panel=container.querySelector('dialog')!;
  touch('touchstart',container,100,200);touch('touchend',container,200,200);expect(panel.open).toBe(false);
  touch('touchstart',container,5,200);touch('touchend',container,100,300);expect(panel.open).toBe(false);
  touch('touchstart',container,5,200);touch('touchend',container,100,205);expect(panel.open).toBe(true);
  touch('touchstart',panel,200,200);touch('touchend',panel,90,205);expect(panel.open).toBe(false);
});
it('does not open an edge swipe over another modal workflow',()=>{
  act(()=>root.render(React.createElement(AioHeader,{renderProfileMenu:()=>null})));
  const other=document.createElement('div');other.setAttribute('aria-modal','true');document.body.appendChild(other);
  try {touch('touchstart',other,5,200);touch('touchend',other,100,205);expect(container.querySelector('dialog')!.open).toBe(false);}finally{other.remove();}
});
