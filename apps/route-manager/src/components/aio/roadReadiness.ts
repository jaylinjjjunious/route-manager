import type { JobPreviewGuide } from "../../features/previewGuide/types";

export type PreviewGuideReadiness = "reviewed" | "not_reviewed" | "unavailable";
export type RoadReadinessStatus = "ready" | "needs_attention" | "blocked" | "done";
export type RoadReadinessAction = "review_preview_guide" | "start_ride_mode" | "none";

export interface RoadReadinessResult {
  status: RoadReadinessStatus;
  primaryAction: RoadReadinessAction;
  rideModeAllowed: boolean;
  requiresWeatherConfirmation: boolean;
  message: string;
}

export function getPreviewGuideReadiness(guide: JobPreviewGuide | null): PreviewGuideReadiness {
  if (guide?.status === "failed") return "unavailable";
  if (guide?.summary?.reviewedByUser === true) return "reviewed";
  return "not_reviewed";
}

export function evaluateRoadReadiness({
  hasActionableJob,
  previewGuide,
  weatherWind,
}: {
  hasActionableJob: boolean;
  previewGuide: PreviewGuideReadiness;
  weatherWind: string;
}): RoadReadinessResult {
  if (!hasActionableJob) {
    return {
      status: "done",
      primaryAction: "none",
      rideModeAllowed: false,
      requiresWeatherConfirmation: false,
      message: "No actionable jobs remain today.",
    };
  }

  const strongHeadwind = weatherWind === "headwind_strong";
  const lightHeadwind = weatherWind === "headwind_light";
  const previewUnavailable = previewGuide === "unavailable";
  const previewReviewed = previewGuide === "reviewed";

  const primaryAction: RoadReadinessAction = previewUnavailable
    ? "none"
    : previewReviewed
      ? "start_ride_mode"
      : "review_preview_guide";

  if (previewUnavailable || strongHeadwind) {
    const message = previewUnavailable && strongHeadwind
      ? "Preview Guide is unavailable and strong headwind blocks Ride Mode."
      : previewUnavailable
        ? "Preview Guide is unavailable. Ride Mode cannot start."
        : "Strong headwind blocks Ride Mode.";
    return {
      status: "blocked",
      primaryAction,
      rideModeAllowed: false,
      requiresWeatherConfirmation: false,
      message,
    };
  }

  if (!previewReviewed || lightHeadwind) {
    const message = !previewReviewed && lightHeadwind
      ? "Review the Preview Guide. Light headwind also requires confirmation."
      : !previewReviewed
        ? "Review the Preview Guide before starting Ride Mode."
        : "Light headwind requires confirmation before Ride Mode.";
    return {
      status: "needs_attention",
      primaryAction,
      rideModeAllowed: previewReviewed,
      requiresWeatherConfirmation: previewReviewed && lightHeadwind,
      message,
    };
  }

  return {
    status: "ready",
    primaryAction: "start_ride_mode",
    rideModeAllowed: true,
    requiresWeatherConfirmation: false,
    message: "Preview Guide reviewed. Conditions are clear.",
  };
}
