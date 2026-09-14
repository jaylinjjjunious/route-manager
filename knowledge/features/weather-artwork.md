# Dynamic Weather Artwork

**Last Updated:** 2026-09-14
**Related Source Files:** `src/services/weather/*`, `src/components/aio/WeatherArtworkBadge.tsx`, `src/components/aio/TodayScreen.tsx`

---

## 1. Purpose & Overview

The first card in the AIØ Today screen (Readiness + Weather card) displays dimensional, realistic 3D weather artwork matching the user's real live current weather conditions. The feature is completely driven by live meteorological data from Open-Meteo and safely resolves to polished visual icon fallbacks if artwork assets are missing, loading, or unresolvable.

---

## 2. Architecture & Pipeline

The system uses a clean separation of concerns:

```
Real weather data (Open-Meteo)
         ↓
Weather normalization (`weatherSelector.ts`)
         ↓
Semantic artwork state (21 states)
         ↓
Asset registry resolution (`weatherArtwork.ts`)
         ↓
UI component (`WeatherArtworkBadge.tsx` on TodayScreen first card)
```

### 2.1 Supported Semantic Weather States

| Semantic State | Condition / Trigger | Expected Asset |
|---|---|---|
| `sunny` | Clear daytime (WMO code 0, isDay=true, temp < 35°C) | `/weather/sunny.png` |
| `mostly-sunny` | Mainly clear (WMO code 1, isDay=true) | `/weather/mostly-sunny.png` |
| `partly-cloudy` | Scattered clouds (WMO code 2, isDay=true) | `/weather/partly-cloudy.png` |
| `hazy-sun` | Haze / atmospheric dust during day (WMO codes 4, 5, or haze condition) | `/weather/hazy-sun.png` |
| `very-hot` | Sunny/partly cloudy daytime with temp/feels-like >= 35°C (95°F) | `/weather/very-hot.png` |
| `cloudy` | Cloudy (condition or cloud cover 60-85%) | `/weather/cloudy.png` |
| `overcast` | Heavy overcast (WMO code 3 or cloud cover > 85%) | `/weather/overcast.png` |
| `light-rain` | Drizzle, light rain, slight showers (WMO codes 51-55, 61, 80) | `/weather/light-rain.png` |
| `heavy-rain` | Heavy rain, violent showers, or precipitation >= 5.0mm (WMO codes 65, 82) | `/weather/heavy-rain.png` |
| `thunderstorm` | Thunderstorm with or without hail (WMO codes 95, 96, 99) | `/weather/thunderstorm.png` |
| `snow` | Light snow, snow grains, slight snow showers (WMO codes 71, 77, 85) | `/weather/snow.png` |
| `heavy-snow` | Moderate to heavy snow, heavy showers (WMO codes 73, 75, 86) | `/weather/heavy-snow.png` |
| `sleet` | Freezing drizzle, freezing rain (WMO codes 56, 57, 66, 67) | `/weather/sleet.png` |
| `fog` | Fog / depositing rime fog (WMO codes 45, 48) | `/weather/fog.png` |
| `windy` | Sustained wind >= 38 km/h (Beaufort 6) with fair/cloudy sky | `/weather/windy.png` |
| `clear-night` | Clear sky at night (WMO codes 0, 1, isDay=false) | `/weather/clear-night.png` |
| `partly-cloudy-night` | Partly cloudy at night (WMO code 2, isDay=false) | `/weather/partly-cloudy-night.png` |
| `cloudy-night` | Overcast / cloudy at night (WMO code 3, isDay=false) | `/weather/cloudy-night.png` |
| `sunrise` | Within 35 minutes of sunrise under fair sky | `/weather/sunrise.png` |
| `sunset` | Within 35 minutes of sunset under fair sky | `/weather/sunset.png` |
| `fallback` | Missing or unrecognized weather data | `null` (renders Lucide glyph fallback) |

---

## 3. Failure Handling & Fallback Behavior

- **No crashes or broken layouts**: If geolocation fails, network fails, or the weather code is unrecognized, the badge defaults safely to a semantic `fallback`.
- **Image error recovery**: If the designated `.png` file is not present in `public/weather/` or fails to download, the `WeatherArtworkBadge` triggers `onError` and immediately renders a polished Lucide glyph (`Sun`, `Moon`, or `CloudOff`) inside the exact same container dimensions.
- **Aspect ratio protection**: The artwork uses `object-contain` to preserve realistic 3D proportions without stretching.

---

## 4. Caching and Refresh

- **5-minute memory cache** in `src/services/weather/currentWeather.ts` keyed by latitude and longitude prevents duplicate network fetches when navigating between tabs.
- **15-minute periodic refresh timer** in `src/services/weather/useLiveWeather.ts` ensures up-to-date conditions during long work sessions without spamming the API.
