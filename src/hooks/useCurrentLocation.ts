import { useCallback, useRef, useState } from 'react';

export type LocationStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable' | 'error';

export interface CurrentCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface UseCurrentLocationResult {
  status: LocationStatus;
  coords: CurrentCoordinates | null;
  error: string | null;
  locate: () => Promise<CurrentCoordinates | null>;
}

function toLocationStatus(code: number): LocationStatus {
  if (code === 1) return 'denied';
  if (code === 2) return 'unavailable';
  return 'error';
}

/**
 * Requests the browser geolocation on demand. Never auto-prompts: callers
 * trigger `locate()` from a user gesture so the permission prompt is expected.
 */
export function useCurrentLocation(): UseCurrentLocationResult {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [coords, setCoords] = useState<CurrentCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const locate = useCallback((): Promise<CurrentCoordinates | null> => {
    return new Promise((resolve) => {
      if (busyRef.current) {
        resolve(coords);
        return;
      }
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setStatus('unavailable');
        setError('Location is not available on this device.');
        resolve(null);
        return;
      }

      busyRef.current = true;
      setStatus('locating');
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next: CurrentCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          busyRef.current = false;
          setCoords(next);
          setStatus('granted');
          resolve(next);
        },
        (positionError) => {
          busyRef.current = false;
          const nextStatus = toLocationStatus(positionError.code);
          setStatus(nextStatus);
          setError(positionError.message || 'Could not determine your location.');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
      );
    });
  }, [coords]);

  return { status, coords, error, locate };
}
