/**
 * Live current-weather lookup for the Road Readiness Panel.
 *
 * Uses the free, no-key Open-Meteo API for current conditions. Data is
 * display-only: temperature, feels-like, condition label, and a day/night
 * aware icon key. It never influences Road Readiness status or Ride Mode
 * eligibility (that logic lives in roadReadiness.ts and uses the manual wind
 * setting).
 */

export type WeatherIconKey =
  | "sun"
  | "moon"
  | "cloud-sun"
  | "cloud-moon"
  | "cloud"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder"
  | "fog";

export interface CurrentWeather {
  temperatureC: number;
  feelsLikeC: number;
  weatherCode: number;
  isDay: boolean;
  condition: string;
  icon: WeatherIconKey;
}

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export function toFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

export function formatTempF(celsius: number): string {
  return `${toFahrenheit(celsius)}°`;
}

/**
 * Maps a WMO weather code plus day/night flag to a human condition label and a
 * polished icon key. Pure and testable.
 */
export function mapWeatherCode(code: number, isDay: boolean): { condition: string; icon: WeatherIconKey } {
  if (code === 0) {
    return isDay ? { condition: "Clear", icon: "sun" } : { condition: "Clear", icon: "moon" };
  }
  if (code === 1 || code === 2) {
    return isDay ? { condition: "Partly cloudy", icon: "cloud-sun" } : { condition: "Partly cloudy", icon: "cloud-moon" };
  }
  if (code === 3) return { condition: "Overcast", icon: "cloud" };
  if (code === 45 || code === 48) return { condition: "Fog", icon: "fog" };
  if (code >= 51 && code <= 57) return { condition: "Drizzle", icon: "drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { condition: "Rain", icon: "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { condition: "Snow", icon: "snow" };
  if (code >= 95) return { condition: "Thunderstorm", icon: "thunder" };
  return { condition: "Overcast", icon: "cloud" };
}

interface OpenMeteoCurrent {
  temperature_2m: number;
  apparent_temperature: number;
  weather_code: number;
  is_day: number;
}

interface OpenMeteoResponse {
  current?: OpenMeteoCurrent;
}

export async function fetchCurrentWeather(latitude: number, longitude: number, signal?: AbortSignal): Promise<CurrentWeather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,apparent_temperature,weather_code,is_day",
    temperature_unit: "celsius",
    timezone: "auto",
    forecast_days: "1",
  });
  const res = await fetch(`${OPEN_METEO_URL}?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`Weather request failed (${res.status})`);
  }
  const json = (await res.json()) as OpenMeteoResponse;
  if (!json.current) {
    throw new Error("Weather response contained no current conditions");
  }
  const current = json.current;
  const isDay = current.is_day === 1;
  const { condition, icon } = mapWeatherCode(current.weather_code, isDay);
  return {
    temperatureC: current.temperature_2m,
    feelsLikeC: current.apparent_temperature,
    weatherCode: current.weather_code,
    isDay,
    condition,
    icon,
  };
}
