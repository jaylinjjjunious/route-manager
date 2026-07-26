import type { TransitProvider } from './provider';
import { GoogleRoutesTransitProvider } from './googleRoutesProvider';
import { MockTransitProvider } from './mockProvider';

let cachedProvider: TransitProvider | null = null;

export function getTransitProvider(): TransitProvider {
  if (cachedProvider) return cachedProvider;

  const useGoogle = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY;

  cachedProvider = useGoogle ? new GoogleRoutesTransitProvider() : new MockTransitProvider();
  return cachedProvider;
}
