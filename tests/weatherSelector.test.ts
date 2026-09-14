import { describe, expect, it } from "vitest";
import { selectSemanticWeatherState, getWeatherAltText } from "../src/services/weather/weatherSelector";
import { resolveWeatherArtwork, getExpectedArtworkFilenames, WEATHER_ARTWORK_PATHS } from "../src/services/weather/weatherArtwork";
import type { SemanticWeatherState } from "../src/services/weather/weatherTypes";

describe("weatherSelector: semantic state normalization", () => {
  it("Sunny daytime -> sunny", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 0,
        isDay: true,
        temperatureC: 25,
      }),
    ).toBe("sunny");
  });

  it("Extremely hot sunny daytime -> very-hot", () => {
    // 35°C = 95°F
    expect(
      selectSemanticWeatherState({
        weatherCode: 0,
        isDay: true,
        temperatureC: 36,
      }),
    ).toBe("very-hot");

    // Feels like trigger
    expect(
      selectSemanticWeatherState({
        weatherCode: 0,
        isDay: true,
        temperatureC: 32,
        feelsLikeC: 35.5,
      }),
    ).toBe("very-hot");
  });

  it("Sunny below extreme heat boundary remains sunny", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 0,
        isDay: true,
        temperatureC: 34.5,
        feelsLikeC: 34.5,
      }),
    ).toBe("sunny");
  });

  it("Mostly sunny -> mostly-sunny when distinguishable", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 1,
        isDay: true,
        temperatureC: 24,
      }),
    ).toBe("mostly-sunny");
  });

  it("Partly cloudy daytime -> partly-cloudy", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 2,
        isDay: true,
        temperatureC: 22,
      }),
    ).toBe("partly-cloudy");
  });

  it("Cloudy -> cloudy", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 3,
        condition: "Cloudy",
        isDay: true,
      }),
    ).toBe("cloudy");

    expect(
      selectSemanticWeatherState({
        weatherCode: 2,
        cloudCoverPct: 75,
        isDay: true,
      }),
    ).toBe("cloudy");
  });

  it("Overcast -> overcast when distinguishable", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 3,
        condition: "Overcast",
        isDay: true,
      }),
    ).toBe("overcast");

    expect(
      selectSemanticWeatherState({
        weatherCode: 3,
        isDay: true,
      }),
    ).toBe("overcast");
  });

  it("Light rain -> light-rain", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 51,
        isDay: true,
      }),
    ).toBe("light-rain");

    expect(
      selectSemanticWeatherState({
        weatherCode: 61,
        isDay: true,
      }),
    ).toBe("light-rain");

    expect(
      selectSemanticWeatherState({
        weatherCode: 80,
        isDay: true,
      }),
    ).toBe("light-rain");
  });

  it("Heavy rain -> heavy-rain", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 65,
        isDay: true,
      }),
    ).toBe("heavy-rain");

    expect(
      selectSemanticWeatherState({
        weatherCode: 82,
        isDay: true,
      }),
    ).toBe("heavy-rain");

    expect(
      selectSemanticWeatherState({
        weatherCode: 61,
        precipitationMm: 6.2,
        isDay: true,
      }),
    ).toBe("heavy-rain");
  });

  it("Thunderstorm -> thunderstorm", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 95,
        isDay: true,
      }),
    ).toBe("thunderstorm");

    expect(
      selectSemanticWeatherState({
        weatherCode: 96,
        isDay: false,
      }),
    ).toBe("thunderstorm");
  });

  it("Snow -> snow", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 71,
        isDay: true,
      }),
    ).toBe("snow");

    expect(
      selectSemanticWeatherState({
        weatherCode: 77,
        isDay: true,
      }),
    ).toBe("snow");
  });

  it("Heavy snow -> heavy-snow when distinguishable", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 73,
        isDay: true,
      }),
    ).toBe("heavy-snow");

    expect(
      selectSemanticWeatherState({
        weatherCode: 75,
        isDay: true,
      }),
    ).toBe("heavy-snow");

    expect(
      selectSemanticWeatherState({
        weatherCode: 86,
        isDay: false,
      }),
    ).toBe("heavy-snow");
  });

  it("Sleet -> sleet", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 56,
        isDay: true,
      }),
    ).toBe("sleet");

    expect(
      selectSemanticWeatherState({
        weatherCode: 66,
        isDay: true,
      }),
    ).toBe("sleet");
  });

  it("Fog -> fog", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 45,
        isDay: true,
      }),
    ).toBe("fog");

    expect(
      selectSemanticWeatherState({
        weatherCode: 48,
        isDay: false,
      }),
    ).toBe("fog");
  });

  it("Windy -> windy when appropriate", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 0,
        isDay: true,
        windSpeedKmh: 42,
      }),
    ).toBe("windy");

    // Moderate wind below 38 kmh is not classified as windy
    expect(
      selectSemanticWeatherState({
        weatherCode: 0,
        isDay: true,
        windSpeedKmh: 20,
      }),
    ).toBe("sunny");

    // Thunderstorm takes precedence over windy
    expect(
      selectSemanticWeatherState({
        weatherCode: 95,
        isDay: true,
        windSpeedKmh: 50,
      }),
    ).toBe("thunderstorm");
  });

  it("Hazy sun -> hazy-sun", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 4,
        isDay: true,
      }),
    ).toBe("hazy-sun");

    expect(
      selectSemanticWeatherState({
        condition: "Hazy",
        isDay: true,
      }),
    ).toBe("hazy-sun");
  });

  it("Clear nighttime -> clear-night", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 0,
        isDay: false,
      }),
    ).toBe("clear-night");

    expect(
      selectSemanticWeatherState({
        weatherCode: 1,
        isDay: false,
      }),
    ).toBe("clear-night");
  });

  it("Partly cloudy nighttime -> partly-cloudy-night", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 2,
        isDay: false,
      }),
    ).toBe("partly-cloudy-night");
  });

  it("Cloudy nighttime -> cloudy-night", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 3,
        isDay: false,
      }),
    ).toBe("cloudy-night");
  });

  it("Sunrise and sunset boundary tests", () => {
    const sunriseIso = "2026-09-14T06:30:00.000Z";
    const sunsetIso = "2026-09-14T19:00:00.000Z";

    // 15 mins after sunrise -> sunrise
    expect(
      selectSemanticWeatherState({
        weatherCode: 0,
        isDay: true,
        sunriseIso,
        currentTimeIso: "2026-09-14T06:45:00.000Z",
      }),
    ).toBe("sunrise");

    // 50 mins after sunrise -> normal daytime sunny
    expect(
      selectSemanticWeatherState({
        weatherCode: 0,
        isDay: true,
        sunriseIso,
        currentTimeIso: "2026-09-14T07:20:00.000Z",
      }),
    ).toBe("sunny");

    // 10 mins before sunset -> sunset
    expect(
      selectSemanticWeatherState({
        weatherCode: 0,
        isDay: true,
        sunsetIso,
        currentTimeIso: "2026-09-14T18:50:00.000Z",
      }),
    ).toBe("sunset");

    // 60 mins before sunset -> normal daytime sunny
    expect(
      selectSemanticWeatherState({
        weatherCode: 0,
        isDay: true,
        sunsetIso,
        currentTimeIso: "2026-09-14T18:00:00.000Z",
      }),
    ).toBe("sunny");
  });

  it("Unknown condition -> fallback", () => {
    expect(
      selectSemanticWeatherState({
        weatherCode: 999,
        isDay: true,
      }),
    ).toBe("fallback");

    expect(
      selectSemanticWeatherState({
        weatherCode: -5,
      }),
    ).toBe("fallback");
  });

  it("Missing weather -> fallback", () => {
    expect(selectSemanticWeatherState(null)).toBe("fallback");
    expect(selectSemanticWeatherState(undefined)).toBe("fallback");
    expect(selectSemanticWeatherState({})).toBe("fallback");
  });
});

describe("weatherArtwork: asset registry mapping", () => {
  const allStates: Array<Exclude<SemanticWeatherState, "fallback">> = [
    "sunny",
    "mostly-sunny",
    "partly-cloudy",
    "hazy-sun",
    "very-hot",
    "cloudy",
    "overcast",
    "light-rain",
    "heavy-rain",
    "thunderstorm",
    "snow",
    "heavy-snow",
    "sleet",
    "fog",
    "windy",
    "clear-night",
    "partly-cloudy-night",
    "cloudy-night",
    "sunrise",
    "sunset",
  ];

  it("maps every non-fallback semantic state to a valid /weather/ path", () => {
    for (const state of allStates) {
      const url = resolveWeatherArtwork(state);
      expect(url).toBe(`/weather/${state}.png`);
      expect(WEATHER_ARTWORK_PATHS[state]).toBe(url);
    }
  });

  it("returns null for fallback state", () => {
    expect(resolveWeatherArtwork("fallback")).toBeNull();
  });

  it("getExpectedArtworkFilenames lists all 20 required png files", () => {
    const filenames = getExpectedArtworkFilenames();
    expect(filenames).toHaveLength(20);
    expect(filenames).toContain("sunny.png");
    expect(filenames).toContain("very-hot.png");
    expect(filenames).toContain("clear-night.png");
    expect(filenames).toContain("thunderstorm.png");
  });

  it("getWeatherAltText generates accessible descriptions", () => {
    expect(getWeatherAltText("sunny")).toBe("Realistic 3D sunny weather artwork");
    expect(getWeatherAltText("very-hot")).toBe("Realistic 3D intense heat weather artwork");
    expect(getWeatherAltText("thunderstorm")).toBe("Realistic 3D thunderstorm weather artwork");
    expect(getWeatherAltText("fallback")).toBe("Weather condition icon");
  });
});
