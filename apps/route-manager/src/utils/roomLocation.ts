export function roomBase(pathname = window.location.pathname): string {
  return pathname === '/route-manager' || pathname.startsWith('/route-manager/') ? '/route-manager/' : '/';
}

export function roomPathname(pathname: string): string {
  return roomBase(pathname) === '/route-manager/' ? `/${pathname.slice('/route-manager/'.length)}` : pathname;
}

export function hallwayUrl(): string {
  return import.meta.env.VITE_HALLWAY_URL || '/#home';
}
