(() => {
  if (location.origin !== 'https://route-manager-phtj.onrender.com') return;
  const handler = window.webkit?.messageHandlers?.routeNavigation;
  if (!handler || window.__routeNativeNavigation) return;
  const ids = ['today', 'jobs', 'more'];
  const style = document.createElement('style');
  style.textContent = 'html[data-native-navigation="ready"] .mobile-bottom-nav-shell { visibility: hidden !important; pointer-events: none !important; }';
  document.head.append(style);
  let previous = '';
  let pending = false;
  function publish() {
    pending = false;
    const buttons = ids.map(id => document.getElementById(`nav-tab-${id}`));
    const nav = buttons[0]?.closest('.mobile-bottom-nav-shell');
    const fullscreenOverlay = [...document.querySelectorAll('.fixed.inset-0')].some(element => {
      const css = getComputedStyle(element);
      return css.display !== 'none' && css.visibility !== 'hidden' &&
        css.pointerEvents !== 'none' && Number(css.zIndex) >= 50;
    });
    const visible = Boolean(nav && buttons.every(Boolean) &&
      getComputedStyle(nav).display !== 'none' &&
      !fullscreenOverlay && !document.querySelector('[aria-modal="true"], [role="dialog"]'));
    const badge = buttons[1]?.querySelector('span.relative > span')?.textContent?.trim() || '';
    const state = {
      visible,
      selected: ids[buttons.findIndex(button => button?.getAttribute('aria-current') === 'page')] || 'more',
      badge: /^\d{1,2}\+?$/.test(badge) ? badge : '',
      dark: document.documentElement.classList.contains('dark'),
    };
    const next = JSON.stringify(state);
    if (next !== previous) {
      previous = next;
      handler.postMessage(state);
    }
  }
  function schedule() {
    if (!pending) {
      pending = true;
      requestAnimationFrame(publish);
    }
  }
  window.__routeNativeNavigation = {
    activate(id) {
      if (ids.includes(id)) document.getElementById(`nav-tab-${id}`)?.click();
      schedule();
    },
  };
  new MutationObserver(schedule).observe(document.documentElement, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ['aria-current', 'aria-modal', 'role', 'class'],
  });
  window.addEventListener('hashchange', schedule);
  publish();
})();
