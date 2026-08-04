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
  it("renders the shared store logo as the identity square beside the store name", async () => {
    await renderModal(makeJob({ storeName: "Vons" }));

    const logos = images();
    expect(logos).toEqual([{ src: "/store-logos/vons.svg", alt: "Vons logo" }]);
    expect(document.body.textContent).toContain("Vons");
  });

  it("renders the identity square at the md size with object-contain and no stored-job mutation", async () => {
    const job = makeJob({ storeName: "Family Dollar 2151 S Chester Ave", notes: "Revisit #203" });
    const before = JSON.stringify(job);
    await renderModal(job);

    const img = document.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.className).toContain("object-contain");
    const tile = img?.closest("span");
    expect(tile?.className).toContain("h-11");
    expect(tile?.className).toContain("w-11");
    expect(tile?.className).toContain("rounded-[14px]");

    expect(JSON.stringify(job)).toBe(before);
  });

  it("falls back to the existing generic icon for unknown stores", async () => {
    await renderModal(makeJob({ storeName: "Tractor Supply", notes: "No logo" }));

    expect(images()).toEqual([]);
    expect(document.querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(document.body.textContent).toContain("Tractor Supply");
  });

  it("keeps the status-toggle button icons and never places the store logo inside the button", async () => {
    await renderModal(makeJob({ storeName: "Vons", status: "ready" }));

    const pendingButton = document.querySelector<HTMLButtonElement>("button[title='Mark under review']");
    expect(pendingButton).not.toBeNull();
    expect(pendingButton?.querySelector("svg.lucide-hourglass")).not.toBeNull();
    expect(pendingButton?.querySelector("img")).toBeNull();
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
