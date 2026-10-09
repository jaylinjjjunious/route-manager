import { Capacitor } from '@capacitor/core';

const DEFAULT_API_ORIGIN = 'https://route-manager-phtj.onrender.com';

/** Bundled native assets have a local origin; Express stays on Render. */
export function serverUrl(value: string): string {
  if (!Capacitor.isNativePlatform()) return value;
  const local = new URL(window.location.href);
  const url = new URL(value, local);
  if (url.protocol !== local.protocol || url.host !== local.host) return value;
  const origin = import.meta.env.VITE_API_ORIGIN || DEFAULT_API_ORIGIN;
  const backend = new URL(origin);
  if (backend.protocol !== 'https:' || backend.username || backend.password || backend.pathname !== '/' || backend.search || backend.hash) {
    throw new Error('Native API origin must be an HTTPS origin without credentials or a path.');
  }
  return `${backend.origin}${url.pathname}${url.search}${url.hash}`;
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string') return fetch(serverUrl(input), init);
  if (input instanceof URL) return fetch(serverUrl(input.href), init);
  const url = serverUrl(input.url);
  return fetch(url === input.url ? input : new Request(url, input), init);
}
