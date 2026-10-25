import { useCallback, useEffect, useState } from 'react';
import { isRetiredRouteDestination, roomBase, roomPathname } from '../utils/roomLocation';

export const APP_TABS = ['dashboard', 'jobs', 'inventory', 'battery', 'tracker', 'habits', 'tools', 'checkin', 'changepassword', 'admin', 'diagnostics', 'support'] as const;
export type AppTab = typeof APP_TABS[number];

function tabFromLocation(): AppTab {
  const hash = window.location.hash.toLowerCase();
  if (isRetiredRouteDestination(roomPathname(window.location.pathname)) || isRetiredRouteDestination(hash)) {
    window.history.replaceState(null, '', `${roomBase()}#dashboard`);
    return 'dashboard';
  }
  if (hash === '#more' || hash === '#settings') {
    window.history.replaceState(null, '', '#dashboard');
    return 'dashboard';
  }
  const tab = hash.slice(1) as AppTab;
  return APP_TABS.includes(tab) ? tab : 'dashboard';
}

export function useAppNavigation() {
  const [currentTab, setCurrentTab] = useState<AppTab>(tabFromLocation);
  const scrollToPage = () => window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  const handleTabChange = useCallback((destination: AppTab) => {
    const tab = APP_TABS.includes(destination) ? destination : 'dashboard';
    setCurrentTab(tab);
    // Each deliberate page change gets a history entry; repeated taps do not.
    if (window.location.hash !== `#${tab}`) window.history.pushState(null, '', `#${tab}`);
    scrollToPage();
  }, []);

  useEffect(() => {
    const restore = () => { setCurrentTab(tabFromLocation()); scrollToPage(); };
    window.addEventListener('hashchange', restore);
    window.addEventListener('popstate', restore);
    return () => {
      window.removeEventListener('hashchange', restore);
      window.removeEventListener('popstate', restore);
    };
  }, []);
  return { currentTab, handleTabChange };
}
