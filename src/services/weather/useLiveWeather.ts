/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useLiveWeather
 *
 * Loads live current conditions for the Road Readiness Panel without ever
 * interrupting the user: geolocation is only read when permission has already
 * been granted. A `prompt`/`denied` permission state, a missing Permissions
 * API, an unavailable geolocation, or any offline/request failure silently
 * falls back to the supplied hub coordinates (or the unavailable state) so the
 * panel stays balanced and never shows fabricated values.
 */

import { useEffect, useState } from "react";
import { fetchCurrentWeather, type CurrentWeather } from "./currentWeather";

export type LiveWeatherStatus = "loading" | "ready" | "unavailable";

export interface LiveWeatherCoordinates {
  latitude: number;
  longitude: number;
}

export interface UseLiveWeatherResult {
  status: LiveWeatherStatus;
  weather: CurrentWeather | null;
}

export async function resolveLocation(
  fallback: LiveWeatherCoordinates,
): Promise<LiveWeatherCoordinates> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return fallback;
  try {
    if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
      return fallback;
    }
    const permission = await navigator.permissions.query({ name: "geolocation" });
    if (permission.state !== "granted") return fallback;
    const position = await new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
      );
    });
    if (!position) return fallback;
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return fallback;
  }
}

export function useLiveWeather(fallback: LiveWeatherCoordinates): UseLiveWeatherResult {
  const [status, setStatus] = useState<LiveWeatherStatus>("loading");
  const [weather, setWeather] = useState<CurrentWeather | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      const coords = await resolveLocation(fallback);
      if (cancelled) return;
      try {
        const result = await fetchCurrentWeather(coords.latitude, coords.longitude, controller.signal);
        if (cancelled) return;
        setWeather(result);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setWeather(null);
        setStatus("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [fallback.latitude, fallback.longitude]);

  return { status, weather };
}
