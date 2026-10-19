/**
 * Semantic weather types and normalization contracts.
 */

export type SemanticWeatherState =
  | "sunny"
  | "mostly-sunny"
  | "partly-cloudy"
  | "hazy-sun"
  | "very-hot"
  | "cloudy"
  | "overcast"
  | "light-rain"
  | "heavy-rain"
  | "thunderstorm"
  | "snow"
  | "heavy-snow"
  | "sleet"
  | "fog"
  | "windy"
  | "clear-night"
  | "partly-cloudy-night"
  | "cloudy-night"
  | "sunrise"
  | "sunset"
  | "fallback";

export interface WeatherNormalizationInput {
  weatherCode?: number | null;
  isDay?: boolean | null;
  temperatureC?: number | null;
  feelsLikeC?: number | null;
  precipitationMm?: number | null;
  windSpeedKmh?: number | null;
  cloudCoverPct?: number | null;
  condition?: string | null;
  sunriseIso?: string | null;
  sunsetIso?: string | null;
  currentTimeIso?: string | null;
}
