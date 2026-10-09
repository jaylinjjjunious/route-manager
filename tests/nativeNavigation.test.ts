import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync('ios-shell/native-navigation.js', 'utf8');
const markup = `<nav class="mobile-bottom-nav-shell">
  <button id="nav-tab-today" aria-current="page">Today</button>
  <button id="nav-tab-jobs"><span class="relative"><span>12</span></span>Jobs</button>
  <button id="nav-tab-more">More</button>
</nav>`;

function fixture(url = 'https://route-manager-phtj.onrender.com/') {
  const dom = new JSDOM(markup, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const postMessage = vi.fn();
  (dom.window as any).webkit = { messageHandlers: { routeNavigation: { postMessage } } };
  dom.window.eval(source);
  return { dom, postMessage };
}

describe('native navigation website contract', () => {
  it('publishes selection/count and preserves web navigation until native acknowledgement', () => {
    const { dom, postMessage } = fixture();
    try {
      expect(postMessage).toHaveBeenLastCalledWith({ visible: true, selected: 'today', badge: '12', dark: false });
      expect(dom.window.document.documentElement.dataset.nativeNavigation).toBeUndefined();
      const click = vi.fn();
      dom.window.document.getElementById('nav-tab-jobs')!.addEventListener('click', click);
      (dom.window as any).__routeNativeNavigation.activate('jobs');
      (dom.window as any).__routeNativeNavigation.activate('settings');
      expect(click).toHaveBeenCalledTimes(1);
    } finally { dom.window.close(); }
  });

  it('tracks theme, selection, dialog visibility and removed ride-mode navigation', async () => {
    const { dom, postMessage } = fixture();
    try {
      const document = dom.window.document;
      document.documentElement.classList.add('dark');
      document.getElementById('nav-tab-today')!.removeAttribute('aria-current');
      document.getElementById('nav-tab-jobs')!.setAttribute('aria-current', 'page');
      await vi.waitFor(() => expect(postMessage).toHaveBeenLastCalledWith({ visible: true, selected: 'jobs', badge: '12', dark: true }));
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      document.body.append(modal);
      await vi.waitFor(() => expect(postMessage.mock.lastCall![0].visible).toBe(false));
      modal.remove();
      await vi.waitFor(() => expect(postMessage.mock.lastCall![0].visible).toBe(true));
      const legacyModal = document.createElement('div');
      legacyModal.className = 'fixed inset-0';
      legacyModal.style.zIndex = '70';
      document.body.append(legacyModal);
      await vi.waitFor(() => expect(postMessage.mock.lastCall![0].visible).toBe(false));
      legacyModal.remove();
      await vi.waitFor(() => expect(postMessage.mock.lastCall![0].visible).toBe(true));
      document.querySelector('nav')!.remove();
      await vi.waitFor(() => expect(postMessage.mock.lastCall![0].visible).toBe(false));
    } finally { dom.window.close(); }
  });

  it.each(['https://example.com/', 'https://route-manager-phtj.onrender.com.evil.example/', 'http://route-manager-phtj.onrender.com/'])('does not install on an untrusted URL: %s', url => {
    const { dom, postMessage } = fixture(url);
    try {
      expect(postMessage).not.toHaveBeenCalled();
      expect((dom.window as any).__routeNativeNavigation).toBeUndefined();
      expect(dom.window.document.querySelector('style')).toBeNull();
    } finally { dom.window.close(); }
  });
});
