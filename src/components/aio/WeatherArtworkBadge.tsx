import React, { useState, useEffect } from "react";
import { Sun, Moon, CloudOff } from "lucide-react";
import type { CurrentWeather } from "../../services/weather/currentWeather";
import type { LiveWeatherStatus } from "../../services/weather/useLiveWeather";
import { getWeatherAltText } from "../../services/weather/weatherSelector";

interface WeatherArtworkBadgeProps {
  status: LiveWeatherStatus;
  weather: CurrentWeather | null;
  className?: string;
}

export function WeatherArtworkBadge({
  status,
  weather,
  className = "",
}: WeatherArtworkBadgeProps) {
  const [imageError, setImageError] = useState(false);

  // Reset image error state whenever artwork URL changes
  useEffect(() => {
    setImageError(false);
  }, [weather?.artworkUrl]);

  const isDay = weather ? weather.isDay : true;
  const FallbackGlyph = weather
    ? (weather.isDay ? Sun : Moon)
    : status === "loading"
      ? Sun
      : CloudOff;

  const weatherTileClass = weather
    ? isDay
      ? "bg-amber-300/20 text-amber-300"
      : "bg-indigo-300/20 text-indigo-300"
    : "bg-white/10 text-white/45";

  const altText = weather?.semanticState
    ? getWeatherAltText(weather.semanticState)
    : weather?.condition
      ? `${weather.condition} weather`
      : "Weather condition";

  const hasArtwork = Boolean(weather?.artworkUrl && !imageError);

  return (
    <span
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${weatherTileClass} ${className}`}
      aria-label={altText}
    >
      {hasArtwork ? (
        <img
          src={weather!.artworkUrl!}
          alt={altText}
          className="h-full w-full object-contain p-1 select-none pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
          onError={() => setImageError(true)}
          loading="eager"
        />
      ) : (
        <FallbackGlyph size={24} strokeWidth={2.2} aria-hidden="true" />
      )}
    </span>
  );
}
