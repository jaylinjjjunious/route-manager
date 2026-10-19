/**
 * weatherSelector.ts
 *
 * Pure normalization and selection layer for semantic weather artwork states.
 * Converts real weather provider data into one of 21 semantic states.
 */

import type { SemanticWeatherState, WeatherNormalizationInput } from "./weatherTypes";

const EXTREME_HEAT_TEMP_C = 35; // 35°C is 95°F
const HIGH_WIND_SPEED_KMH = 38; // ~24 mph (Beaufort 6 strong breeze)
const SUNRISE_SUNSET_WINDOW_MS = 35 * 60 * 1000; // 35 minutes before or after

/**
 * Checks if current time is near a solar event (sunrise or sunset).
 */
function isNearSolarEvent(eventIso: string | null | undefined, currentTimeIso?: string | null): boolean {
  if (!eventIso) return false;
  const eventTime = new Date(eventIso).getTime();
  if (Number.isNaN(eventTime)) return false;

  const currentTime = currentTimeIso ? new Date(currentTimeIso).getTime() : Date.now();
  if (Number.isNaN(currentTime)) return false;

  return Math.abs(currentTime - eventTime) <= SUNRISE_SUNSET_WINDOW_MS;
}

/**
 * Selects the semantic weather state purely based on available weather signals.
 * Never invents information not present in the input.
 */
export function selectSemanticWeatherState(
  input: WeatherNormalizationInput | null | undefined,
): SemanticWeatherState {
  if (!input) {
    return "fallback";
  }

  const {
    weatherCode,
    isDay,
    temperatureC,
    feelsLikeC,
    precipitationMm,
    windSpeedKmh,
    cloudCoverPct,
    condition,
    sunriseIso,
    sunsetIso,
    currentTimeIso,
  } = input;

  // If weatherCode is completely missing and condition is missing, fallback
  if (
    (weatherCode === null || weatherCode === undefined || Number.isNaN(weatherCode)) &&
    !condition
  ) {
    return "fallback";
  }

  const code = weatherCode ?? -1;
  const lowerCondition = condition ? condition.trim().toLowerCase() : "";

  // 1. Thunderstorm (codes 95, 96, 99 or condition)
  if ((code >= 95 && code <= 99) || lowerCondition.includes("thunder")) {
    return "thunderstorm";
  }

  // 2. Sleet / Freezing Precipitation (codes 56, 57, 66, 67 or condition)
  if (code === 56 || code === 57 || code === 66 || code === 67 || lowerCondition.includes("sleet") || lowerCondition.includes("freezing")) {
    return "sleet";
  }

  // 3. Snow
  if (code === 73 || code === 75 || code === 86 || lowerCondition.includes("heavy snow")) {
    return "heavy-snow";
  }
  if ((code >= 71 && code <= 77) || code === 85 || lowerCondition.includes("snow")) {
    return "snow";
  }

  // 4. Rain
  if (
    code === 65 ||
    code === 82 ||
    lowerCondition.includes("heavy rain") ||
    (precipitationMm !== null && precipitationMm !== undefined && precipitationMm >= 5.0)
  ) {
    return "heavy-rain";
  }
  if (
    code === 63 ||
    code === 81
  ) {
    if (precipitationMm !== null && precipitationMm !== undefined && precipitationMm >= 4.0) {
      return "heavy-rain";
    }
    return "light-rain";
  }
  if (
    (code >= 51 && code <= 55) ||
    code === 61 ||
    code === 80 ||
    lowerCondition.includes("drizzle") ||
    lowerCondition.includes("rain") ||
    lowerCondition.includes("shower")
  ) {
    return "light-rain";
  }

  // 5. Fog
  if (code === 45 || code === 48 || lowerCondition.includes("fog")) {
    return "fog";
  }

  // 6. Windy (when not raining/snowing/storming, and sustained high wind speed)
  if (
    (windSpeedKmh !== null && windSpeedKmh !== undefined && windSpeedKmh >= HIGH_WIND_SPEED_KMH) ||
    lowerCondition === "windy"
  ) {
    return "windy";
  }

  // 7. Sunrise / Sunset (during fair/cloudy conditions when within window)
  if (isNearSolarEvent(sunriseIso, currentTimeIso)) {
    return "sunrise";
  }
  if (isNearSolarEvent(sunsetIso, currentTimeIso)) {
    return "sunset";
  }

  // 8. Hazy sun (codes 4, 5, or haze condition during daytime)
  if (isDay !== false && (code === 4 || code === 5 || lowerCondition.includes("haze") || lowerCondition.includes("hazy"))) {
    return "hazy-sun";
  }

  // 9. Nighttime states
  if (isDay === false) {
    if (code === 0 || code === 1 || lowerCondition === "clear") {
      return "clear-night";
    }
    if (code === 2 || lowerCondition.includes("partly cloudy")) {
      return "partly-cloudy-night";
    }
    if (code === 3 || lowerCondition.includes("cloud") || lowerCondition.includes("overcast")) {
      return "cloudy-night";
    }
    return "fallback";
  }

  // 10. Daytime states
  // Extreme heat on sunny/partly cloudy days (air temp or heat index / feels like)
  const isExtremeHeat =
    (temperatureC !== null && temperatureC !== undefined && temperatureC >= EXTREME_HEAT_TEMP_C) ||
    (feelsLikeC !== null && feelsLikeC !== undefined && feelsLikeC >= EXTREME_HEAT_TEMP_C);

  // Check explicit cloud cover percentage first if provided
  if (cloudCoverPct !== null && cloudCoverPct !== undefined) {
    if (cloudCoverPct > 85) return "overcast";
    if (cloudCoverPct >= 60) return "cloudy";
  }

  if (code === 0 || lowerCondition === "clear" || lowerCondition === "sunny") {
    if (isExtremeHeat) return "very-hot";
    return "sunny";
  }

  if (code === 1 || lowerCondition.includes("mostly sunny") || lowerCondition.includes("mainly clear")) {
    if (isExtremeHeat) return "very-hot";
    return "mostly-sunny";
  }

  // Explicit cloudy condition overrides generic code
  if (lowerCondition.includes("cloudy") && !lowerCondition.includes("partly cloudy") && !lowerCondition.includes("overcast")) {
    return "cloudy";
  }

  if (code === 2 || lowerCondition.includes("partly cloudy")) {
    if (isExtremeHeat) return "very-hot";
    return "partly-cloudy";
  }

  // Distinguish Cloudy vs Overcast
  if (lowerCondition.includes("overcast")) {
    return "overcast";
  }

  if (code === 3) {
    return "overcast";
  }

  return "fallback";
}

/**
 * Returns accessible description for the weather state.
 */
export function getWeatherAltText(state: SemanticWeatherState): string {
  switch (state) {
    case "sunny":
      return "Realistic 3D sunny weather artwork";
    case "mostly-sunny":
      return "Realistic 3D mostly sunny weather artwork";
    case "partly-cloudy":
      return "Realistic 3D partly cloudy weather artwork";
    case "hazy-sun":
      return "Realistic 3D hazy sun weather artwork";
    case "very-hot":
      return "Realistic 3D intense heat weather artwork";
    case "cloudy":
      return "Realistic 3D cloudy weather artwork";
    case "overcast":
      return "Realistic 3D overcast weather artwork";
    case "light-rain":
      return "Realistic 3D light rain weather artwork";
    case "heavy-rain":
      return "Realistic 3D heavy rain weather artwork";
    case "thunderstorm":
      return "Realistic 3D thunderstorm weather artwork";
    case "snow":
      return "Realistic 3D snow weather artwork";
    case "heavy-snow":
      return "Realistic 3D heavy snow weather artwork";
    case "sleet":
      return "Realistic 3D sleet weather artwork";
    case "fog":
      return "Realistic 3D fog weather artwork";
    case "windy":
      return "Realistic 3D windy weather artwork";
    case "clear-night":
      return "Realistic 3D clear night moon weather artwork";
    case "partly-cloudy-night":
      return "Realistic 3D partly cloudy night weather artwork";
    case "cloudy-night":
      return "Realistic 3D cloudy night weather artwork";
    case "sunrise":
      return "Realistic 3D sunrise weather artwork";
    case "sunset":
      return "Realistic 3D sunset weather artwork";
    case "fallback":
    default:
      return "Weather condition icon";
  }
}
