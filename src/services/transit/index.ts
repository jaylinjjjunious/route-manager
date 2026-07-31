import type { TransitProvider } from './provider';
import { TransitApiProvider } from './transitApiProvider';
import { GoogleRoutesTransitProvider } from './googleRoutesProvider';
import { MockTransitProvider } from './mockProvider';

let cachedProvider: TransitProvider | null = null;

/**
 * The official Transit API provider is used when `VITE_TRANSIT_PROVIDER` is
 * set to `transit`. This flag is safe to ship in the browser: it only selects
 * the provider; the real API key stays on the server.
 */
export function isTransitApiEnabled(): boolean {
  return import.meta.env.VITE_TRANSIT_PROVIDER === 'transit';
}

export function getTransitProvider(): TransitProvider {
  if (cachedProvider) return cachedProvider;

  if (isTransitApiEnabled()) {
    cachedProvider = new TransitApiProvider();
    return cachedProvider;
  }

  const useGoogle = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY;

  cachedProvider = useGoogle ? new GoogleRoutesTransitProvider() : new MockTransitProvider();
  return cachedProvider;
}

export function getTransitStatusProvider(): TransitApiProvider | null {
  if (isTransitApiEnabled()) {
    return cachedProvider instanceof TransitApiProvider ? cachedProvider : new TransitApiProvider();
  }
  return null;
}
