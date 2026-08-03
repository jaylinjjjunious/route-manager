import { describe, expect, it } from "vitest";
import {
  evaluateRoadReadiness,
  getPreviewGuideReadiness,
} from "../src/components/aio/roadReadiness";
import type { JobPreviewGuide } from "../src/features/previewGuide/types";

function guide(overrides: Partial<JobPreviewGuide> = {}): JobPreviewGuide {
  return {
    id: "guide-1",
    jobId: "job-1",
    status: "ready",
    stage: "preparation",
    sourceType: "screen_recording",
    pageIds: ["page-1"],
    pages: [],
    summary: {
      beforeYouGo: [],
      whatYouWillDo: [],
      proofRequirements: [],
      warnings: [],
      referenceTopics: [],
      uncertainItems: [],
      sourcePageIds: ["page-1"],
      generatedAt: "2026-08-03T00:00:00.000Z",
      reviewedByUser: true,
    },
    preparation: [],
    extractionVersion: 1,
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
    ...overrides,
  };
}

describe("Preview Guide readiness", () => {
  it("requires explicit user review", () => {
    expect(getPreviewGuideReadiness(null)).toBe("not_reviewed");
    expect(getPreviewGuideReadiness(guide({ summary: undefined }))).toBe("not_reviewed");
    expect(getPreviewGuideReadiness(guide())).toBe("reviewed");
  });

  it("treats a failed Preview Guide as unavailable", () => {
    expect(getPreviewGuideReadiness(guide({ status: "failed" }))).toBe("unavailable");
  });
});

describe("Road Readiness rules", () => {
  it.each(["none", "calm", "tailwind"])("is READY for reviewed previews with %s wind", (weatherWind) => {
    expect(evaluateRoadReadiness({ hasActionableJob: true, previewGuide: "reviewed", weatherWind })).toMatchObject({
      status: "ready",
      primaryAction: "start_ride_mode",
      rideModeAllowed: true,
      requiresWeatherConfirmation: false,
    });
  });

  it("requires Preview Guide review before Ride Mode", () => {
    expect(evaluateRoadReadiness({ hasActionableJob: true, previewGuide: "not_reviewed", weatherWind: "calm" })).toMatchObject({
      status: "needs_attention",
      primaryAction: "review_preview_guide",
      rideModeAllowed: false,
    });
  });

  it("blocks when the Preview Guide is unavailable", () => {
    expect(evaluateRoadReadiness({ hasActionableJob: true, previewGuide: "unavailable", weatherWind: "calm" })).toMatchObject({
      status: "blocked",
      primaryAction: "none",
      rideModeAllowed: false,
    });
  });

  it("requires one confirmation for a light headwind", () => {
    expect(evaluateRoadReadiness({ hasActionableJob: true, previewGuide: "reviewed", weatherWind: "headwind_light" })).toMatchObject({
      status: "needs_attention",
      primaryAction: "start_ride_mode",
      rideModeAllowed: true,
      requiresWeatherConfirmation: true,
    });
  });

  it("blocks Ride Mode for a strong headwind", () => {
    expect(evaluateRoadReadiness({ hasActionableJob: true, previewGuide: "reviewed", weatherWind: "headwind_strong" })).toMatchObject({
      status: "blocked",
      primaryAction: "start_ride_mode",
      rideModeAllowed: false,
    });
  });

  it("applies BLOCKED before NEEDS ATTENTION", () => {
    expect(evaluateRoadReadiness({ hasActionableJob: true, previewGuide: "not_reviewed", weatherWind: "headwind_strong" })).toMatchObject({
      status: "blocked",
      primaryAction: "review_preview_guide",
      rideModeAllowed: false,
    });
  });

  it("does not offer Ride Mode when no actionable job remains", () => {
    expect(evaluateRoadReadiness({ hasActionableJob: false, previewGuide: "not_reviewed", weatherWind: "calm" })).toMatchObject({
      status: "done",
      primaryAction: "none",
      rideModeAllowed: false,
    });
  });
});
