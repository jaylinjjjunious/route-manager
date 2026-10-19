import { describe, expect, it, vi, afterEach } from "vitest";
import {
  mapWeatherCode,
  toFahrenheit,
  formatTempF,
} from "../src/services/weather/currentWeather";
import { resolveLocation } from "../src/services/weather/useLiveWeather";

const HUB = { latitude: 35.3904, longitude: -119.0255 };

describe("current weather display helpers", () => {
  it("converts Celsius to rounded Fahrenheit", () => {
    expect(toFahrenheit(0)).toBe(32);
    expect(toFahrenheit(26.7)).toBe(80);
    expect(toFahrenheit(-40)).toBe(-40);
    expect(formatTempF(26.7)).toBe("80°");
  });

  it("maps WMO codes with day/night aware icons", () => {
    expect(mapWeatherCode(0, true)).toEqual({ condition: "Clear", icon: "sun" });
    expect(mapWeatherCode(0, false)).toEqual({ condition: "Clear", icon: "moon" });
    expect(mapWeatherCode(2, true)).toEqual({ condition: "Partly cloudy", icon: "cloud-sun" });
    expect(mapWeatherCode(2, false)).toEqual({ condition: "Partly cloudy", icon: "cloud-moon" });
    expect(mapWeatherCode(3, true)).toEqual({ condition: "Overcast", icon: "cloud" });
    expect(mapWeatherCode(48, true)).toEqual({ condition: "Fog", icon: "fog" });
    expect(mapWeatherCode(55, true)).toEqual({ condition: "Drizzle", icon: "drizzle" });
    expect(mapWeatherCode(61, true)).toEqual({ condition: "Rain", icon: "rain" });
    expect(mapWeatherCode(86, false)).toEqual({ condition: "Snow", icon: "snow" });
    expect(mapWeatherCode(95, true)).toEqual({ condition: "Thunderstorm", icon: "thunder" });
    expect(mapWeatherCode(88, true)).toEqual({ condition: "Overcast", icon: "cloud" });
  });
});

describe("resolveLocation fallbacks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to hub coordinates when geolocation is unavailable", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });
    expect(await resolveLocation(HUB)).toEqual(HUB);
  });

  it("falls back without prompting when permission is not granted", async () => {
    const query = vi.fn().mockResolvedValue({ state: "denied" });
    vi.stubGlobal("navigator", { permissions: { query }, geolocation: {} });
    expect(await resolveLocation(HUB)).toEqual(HUB);
    expect(query).toHaveBeenCalledWith({ name: "geolocation" });
  });

  it("uses live coordinates when permission is already granted", async () => {
    const query = vi.fn().mockResolvedValue({ state: "granted" });
    const getCurrentPosition = vi.fn((success: (pos: unknown) => void) =>
      success({ coords: { latitude: 40.0, longitude: -74.0 } }),
    );
    vi.stubGlobal("navigator", { permissions: { query }, geolocation: { getCurrentPosition } });
    expect(await resolveLocation(HUB)).toEqual({ latitude: 40.0, longitude: -74.0 });
  });

  it("falls back when the permission lookup itself fails", async () => {
    vi.stubGlobal("navigator", {
      permissions: {
        query: vi.fn(() => Promise.reject(new Error("permissions unavailable"))),
      },
      geolocation: {},
    });
    expect(await resolveLocation(HUB)).toEqual(HUB);
  });
});
