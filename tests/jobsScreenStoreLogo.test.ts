// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import JobsScreen from "../src/features/jobs/JobsScreen";
import { resolveStoreLogo } from "../src/services/storeLogos";
import type { Job } from "../src/types";
import type { ScheduledDaySummary } from "../src/features/jobs/jobSchedule";

let container: HTMLDivElement;
let root: Root;

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    storeName: "Vons",
    address: "5201 White Ln, Bakersfield, CA",
    pay: 25,
    estimatedMinutes: 30,
    jobType: "retail_audit",
    dueTime: "17:00",
    notes: "",
    status: "ready",
    routeId: "A",
    coordinates: { lat: 35.3733, lng: -119.0187 },
    ...overrides,
  };
}

function renderJobsScreen(jobs: {
  todayJobs: Job[];
  routeBJobs?: Job[];
  laterDayJobs?: Job[];
  overdueJobs?: Job[];
  unscheduledJobs?: Job[];
}) {
  const todayDay: ScheduledDaySummary = {
    date: "2026-08-04",
    jobs: [],
    pay: 0,
    workMinutes: 0,
    reviewJobs: [],
  };
  const laterDay: ScheduledDaySummary = {
    date: "2026-08-05",
    jobs: jobs.laterDayJobs ?? [],
    pay: 0,
    workMinutes: 0,
    reviewJobs: [],
  };
  act(() => {
    root.render(
      React.createElement(JobsScreen, {
        today: "2026-08-04",
        todayJobs: jobs.todayJobs,
        weekDays: [todayDay, laterDay],
        routeBJobs: jobs.routeBJobs ?? [],
        overdueJobs: jobs.overdueJobs ?? [],
        unscheduledJobs: jobs.unscheduledJobs ?? [],
        onOpenJob: () => undefined,
        onAddJob: () => undefined,
        onOptimizeRoute: () => undefined,
        onMoveToDay: () => undefined,
      }),
    );
  });
}

function logosRendered(): Array<{ src: string; alt: string }> {
  return Array.from(container.querySelectorAll("img")).map((img) => ({
    src: img.getAttribute("src") ?? "",
    alt: img.getAttribute("alt") ?? "",
  }));
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
});

describe("Jobs page store logos", () => {
  it("renders matched store logos on every job row section", () => {
    renderJobsScreen({
      todayJobs: [makeJob({ id: "t1", storeName: "Vons" })],
      laterDayJobs: [makeJob({ id: "t2", storeName: "Target Store 1384" })],
      routeBJobs: [makeJob({ id: "b1", storeName: "Family Dollar 2151 S Chester Ave", routeId: "B" })],
    });

    const logos = logosRendered();
    expect(logos.map((logo) => logo.alt).sort()).toEqual([
      "Family Dollar logo",
      "Target logo",
      "Vons logo",
    ]);
    for (const logo of logos) {
      expect(logo.src).toMatch(/^\/store-logos\/.*\.svg$/);
    }
  });

  it("renders logo squares at the preserved md size with object-contain", () => {
    renderJobsScreen({ todayJobs: [makeJob({ storeName: "Vons" })] });

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.className).toContain("object-contain");
    const tile = img?.closest("span");
    expect(tile?.className).toContain("h-11");
    expect(tile?.className).toContain("w-11");
    expect(tile?.className).toContain("rounded-[14px]");
  });

  it("falls back to the generic icon for unknown stores without a logo image", () => {
    renderJobsScreen({
      todayJobs: [
        makeJob({ id: "known", storeName: "Vons" }),
        makeJob({ id: "unknown", storeName: "Tractor Supply" }),
      ],
    });

    const logos = logosRendered();
    expect(logos.map((logo) => logo.alt)).toEqual(["Vons logo"]);
    expect(logos.some((logo) => logo.alt.includes("Tractor Supply"))).toBe(false);
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("uses the same shared resolver as the registry", () => {
    const jobs = [
      makeJob({ id: "a", storeName: "Vons", notes: "Revisit" }),
      makeJob({ id: "b", storeName: "Dollar General - White Ln" }),
      makeJob({ id: "c", storeName: "Walgreens Pharmacy #1234" }),
    ];
    renderJobsScreen({ todayJobs: jobs });

    const logos = logosRendered();
    const expected = jobs
      .map((job) => resolveStoreLogo({ companyId: null, texts: [job.storeName, job.notes] })?.logoPath)
      .filter((path): path is string => Boolean(path));

    expect(logos.map((logo) => logo.src).sort()).toEqual(expected.sort());
  });

  it("leaves the existing job data unchanged", () => {
    const todayJobs = [
      makeJob({ id: "a", storeName: "Vons", notes: "Revisit #203" }),
      makeJob({ id: "b", storeName: "Tractor Supply", notes: "No logo" }),
    ];
    const before = JSON.stringify(todayJobs);

    renderJobsScreen({ todayJobs });

    expect(JSON.stringify(todayJobs)).toBe(before);
    expect(container.textContent).toContain("Vons");
    expect(container.textContent).toContain("Tractor Supply");
  });
});
