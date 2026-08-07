// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JobDetailModal from "../src/components/JobDetailModal";
import type { Job } from "../src/types";

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      refreshSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
  },
}));

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

async function renderModal(job: Job) {
  act(() => {
    root.render(
      React.createElement(JobDetailModal, {
        job,
        routeIndex: null,
        legDistance: 0,
        rideMinutes: 0,
        navLink: "https://www.google.com/maps",
        isOutlier: false,
        jobAccessLocked: false,
        onToggleComplete: () => undefined,
        onEdit: () => undefined,
        onDelete: () => undefined,
        onDuplicate: () => undefined,
        onToggleRoute: () => undefined,
        onClose: () => undefined,
      }),
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
}

function images(): Array<{ src: string; alt: string }> {
  return Array.from(document.querySelectorAll("img")).map((img) => ({
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

describe("Job Details Mini Page store logo", () => {
  it("renders the shared store logo in the former hourglass square beside the store name", async () => {
    await renderModal(makeJob({ storeName: "Vons" }));

    const logos = images();
    expect(logos).toEqual([{ src: "/store-logos/vons.svg", alt: "Vons logo" }]);
    expect(document.body.textContent).toContain("Vons");
  });

  it("shows the Target logo for Target jobs in the status square", async () => {
    await renderModal(makeJob({ storeName: "Target Store 1384" }));

    expect(images()).toEqual([{ src: "/store-logos/target.svg", alt: "Target logo" }]);
  });

  it("renders the logo inside the status square at the preserved h-9 w-9 size with object-contain", async () => {
    const job = makeJob({ storeName: "Family Dollar 2151 S Chester Ave", notes: "Revisit #203" });
    const before = JSON.stringify(job);
    await renderModal(job);

    const img = document.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.className).toContain("object-contain");
    const button = img?.closest("button");
    expect(button?.className).toContain("h-9");
    expect(button?.className).toContain("w-9");
    expect(button?.className).toContain("rounded-lg");

    expect(JSON.stringify(job)).toBe(before);
  });

  it("falls back to the original hourglass icon for unknown stores", async () => {
    await renderModal(makeJob({ storeName: "Tractor Supply", notes: "No logo" }));

    expect(images()).toEqual([]);
    const pendingButton = document.querySelector<HTMLButtonElement>("button[title='Mark under review']");
    expect(pendingButton).not.toBeNull();
    expect(pendingButton?.querySelector("svg.lucide-hourglass")).not.toBeNull();
    expect(document.body.textContent).toContain("Tractor Supply");
  });

  it("replaces the pending hourglass with the store logo and keeps the status-toggle action", async () => {
    await renderModal(makeJob({ storeName: "Vons", status: "ready" }));

    const pendingButton = document.querySelector<HTMLButtonElement>("button[title='Mark under review']");
    expect(pendingButton).not.toBeNull();
    expect(pendingButton?.querySelector("svg.lucide-hourglass")).toBeNull();
    expect(pendingButton?.querySelector("img")).not.toBeNull();
  });

  it("keeps CheckSquare states for completed and under_review status buttons", async () => {
    await renderModal(makeJob({ storeName: "Vons", status: "completed", isCompleted: true }));

    const completedButton = document.querySelector<HTMLButtonElement>("button[title='Reactivate']");
    expect(completedButton).not.toBeNull();
    expect(completedButton?.querySelector("svg[class*='text-blue-500']")).not.toBeNull();
    expect(completedButton?.querySelector("img")).toBeNull();

    act(() => root.unmount());
    root = createRoot(container);

    await renderModal(makeJob({ storeName: "Vons", status: "under_review", isCompleted: false }));

    const reviewButton = document.querySelector<HTMLButtonElement>("button[title='Complete after review']");
    expect(reviewButton).not.toBeNull();
    expect(reviewButton?.querySelector("svg[class*='text-indigo-500']")).not.toBeNull();
    expect(reviewButton?.querySelector("img")).toBeNull();
  });
});
