// Entries are URLs, never imports of another application's implementation.
const routeManagerUrl = import.meta.env.VITE_ROUTE_MANAGER_URL || '/route-manager/#dashboard';
export const rooms = [{ id: 'route-manager', name: 'Route Manager', description: 'Plan your day, manage jobs, and use your route tools.', href: routeManagerUrl }];

export function legacyRoomLink(hash: string): string | null {
  const tab = hash.slice(1);
  if (!['dashboard', 'jobs', 'more', 'inventory', 'battery', 'tracker', 'habits', 'tools', 'settings', 'checkin', 'changepassword', 'admin', 'diagnostics', 'route', 'routes'].includes(tab)) return null;
  return `/route-manager/#${tab}`;
}
