/**
 * weatherArtwork.ts
 *
 * Centralized asset registry for 3D dimensional weather artwork.
 * Maps semantic weather states to dedicated static asset paths under /weather/.
 */

import type { SemanticWeatherState } from "./weatherTypes";

export const WEATHER_ARTWORK_PATHS: Record<Exclude<SemanticWeatherState, "fallback">, string> = {
  "sunny": "/weather/sunny.png",
  "mostly-sunny": "/weather/mostly-sunny.png",
  "partly-cloudy": "/weather/partly-cloudy.png",
  "hazy-sun": "/weather/hazy-sun.png",
  "very-hot": "/weather/very-hot.png",
  "cloudy": "/weather/cloudy.png",
  "overcast": "/weather/overcast.png",
  "light-rain": "/weather/light-rain.png",
  "heavy-rain": "/weather/heavy-rain.png",
  "thunderstorm": "/weather/thunderstorm.png",
  "snow": "/weather/snow.png",
  "heavy-snow": "/weather/heavy-snow.png",
  "sleet": "/weather/sleet.png",
  "fog": "/weather/fog.png",
  "windy": "/weather/windy.png",
  "clear-night": "/weather/clear-night.png",
  "partly-cloudy-night": "/weather/partly-cloudy-night.png",
  "cloudy-night": "/weather/cloudy-night.png",
  "sunrise": "/weather/sunrise.png",
  "sunset": "/weather/sunset.png",
};

/**
 * Resolves the public asset URL for a given semantic weather state.
 * Returns null for "fallback" or unmapped states.
 */
export function resolveWeatherArtwork(state: SemanticWeatherState): string | null {
  if (state === "fallback") {
    return null;
  }
  return WEATHER_ARTWORK_PATHS[state] ?? null;
}

/**
 * Returns all expected artwork filenames for verification and reporting.
 */
export function getExpectedArtworkFilenames(): string[] {
  return Object.values(WEATHER_ARTWORK_PATHS).map((path) => path.replace(/^\/weather\//, ""));
}
