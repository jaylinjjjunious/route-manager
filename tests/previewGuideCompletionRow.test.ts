// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PREVIEW_GUIDE_COLLAPSE_MS,
  PREVIEW_GUIDE_CONFIRM_MS,
  PreviewGuideCompletionRow,
} from "../src/components/aio/PreviewGuideCompletionRow";
import type { PreviewGuideReadiness } from "../src/components/aio/roadReadiness";

let container: HTMLDivElement;
let root: Root;

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function render(readiness: PreviewGuideReadiness) {
  act(() => {
    root.render(React.createElement(PreviewGuideCompletionRow, { jobId: "job-1", readiness }));
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  setReducedMotion(false);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
});

describe("Preview Guide completion feedback", () => {
  it("starts only on an incomplete-to-complete transition", () => {
    render("not_reviewed");
    expect(container.querySelector("[data-preview-guide-row='visible']")).not.toBeNull();

    render("not_reviewed");
    expect(container.querySelector("[data-preview-guide-row='confirming']")).toBeNull();

    render("reviewed");
    expect(container.querySelector("[data-preview-guide-row='confirming']")).not.toBeNull();
    expect(container.querySelector("[aria-live='polite']")?.textContent).toBe("Preview Guide reviewed");
  });

  it("does not replay for an already-completed ordinary render", () => {
    render("reviewed");
    expect(container.querySelector("[data-preview-guide-row]")).toBeNull();
    expect(container.querySelector("[aria-live='polite']")?.textContent).toBe("");
  });

  it("removes the row after the confirmation and collapse feedback", () => {
    render("not_reviewed");
    render("reviewed");

    act(() => vi.advanceTimersByTime(PREVIEW_GUIDE_CONFIRM_MS));
    expect(container.querySelector("[data-preview-guide-row='collapsing']")).not.toBeNull();

    act(() => vi.advanceTimersByTime(PREVIEW_GUIDE_COLLAPSE_MS));
    expect(container.querySelector("[data-preview-guide-row]")).toBeNull();
  });

  it("removes the row immediately with reduced motion while preserving the live announcement", () => {
    setReducedMotion(true);
    render("not_reviewed");
    render("reviewed");

    expect(container.querySelector("[data-preview-guide-row]")).toBeNull();
    expect(container.querySelector("[aria-live='polite']")?.textContent).toBe("Preview Guide reviewed");
    expect(vi.getTimerCount()).toBe(0);
  });
});
