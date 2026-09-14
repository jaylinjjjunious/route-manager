// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WeatherArtworkBadge } from "../src/components/aio/WeatherArtworkBadge";
import type { CurrentWeather } from "../src/services/weather/currentWeather";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function renderBadge(status: "loading" | "ready" | "unavailable", weather: CurrentWeather | null) {
  act(() => {
    root.render(React.createElement(WeatherArtworkBadge, { status, weather }));
  });
}

describe("WeatherArtworkBadge UI component", () => {
  it("renders safe fallback icon when weather is loading", () => {
    renderBadge("loading", null);
    const badge = container.querySelector("span");
    expect(badge).toBeTruthy();
    expect(badge?.getAttribute("aria-label")).toBe("Weather condition");
    // No img rendered when no artworkUrl
    expect(container.querySelector("img")).toBeNull();
    // SVG icon rendered
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders safe fallback icon when live weather is unavailable", () => {
    renderBadge("unavailable", null);
    const badge = container.querySelector("span");
    expect(badge).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders artwork image when artworkUrl is provided", () => {
    const mockWeather: CurrentWeather = {
      temperatureC: 22,
      feelsLikeC: 22,
      weatherCode: 0,
      isDay: true,
      condition: "Clear",
      icon: "sun",
      semanticState: "sunny",
      artworkUrl: "/weather/sunny.png",
    };

    renderBadge("ready", mockWeather);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toBe("/weather/sunny.png");
    expect(img?.getAttribute("alt")).toBe("Realistic 3D sunny weather artwork");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("falls back to SVG glyph when artwork image fails to load (onError)", () => {
    const mockWeather: CurrentWeather = {
      temperatureC: 22,
      feelsLikeC: 22,
      weatherCode: 0,
      isDay: true,
      condition: "Clear",
      icon: "sun",
      semanticState: "sunny",
      artworkUrl: "/weather/sunny.png",
    };

    renderBadge("ready", mockWeather);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();

    // Trigger image error
    act(() => {
      img?.dispatchEvent(new Event("error"));
    });

    // Image is replaced with fallback glyph without crashing
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
