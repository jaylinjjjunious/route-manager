// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AioHeader from "../src/components/aio/AioHeader";
import MoreScreen from "../src/components/aio/MoreScreen";

const AVATAR_PATH = "/profile/avatar.webp";
const AVATAR_FILE = resolve(process.cwd(), "public/profile/avatar.webp");

let container: HTMLDivElement;
let root: Root;

function renderHeader(userName?: string, onOpenProfile = () => undefined) {
  act(() => {
    root.render(React.createElement(AioHeader, { userName, onOpenProfile }));
  });
}

function renderMoreScreen(theme: "dark" | "light" = "dark") {
  act(() => {
    root.render(
      React.createElement(MoreScreen, {
        theme,
        onToggleTheme: () => undefined,
        userEmail: "driver@ai0.app",
        onNavigate: () => undefined,
        onOpenProofHistory: () => undefined,
        onOpenDebugCenter: () => undefined,
        onAddProcessServe: () => undefined,
        onImportScreenshots: () => undefined,
        onSignOut: () => undefined,
      }),
    );
  });
}

function images(): Array<{ src: string; alt: string; className: string }> {
  return Array.from(container.querySelectorAll("img")).map((img) => ({
    src: img.getAttribute("src") ?? "",
    alt: img.getAttribute("alt") ?? "",
    className: img.className ?? "",
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

describe("AIØ top header profile button", () => {
  it("shows the profile image in the header", () => {
    renderHeader("driver@ai0.app");

    expect(images()).toEqual([
      { src: AVATAR_PATH, alt: "Your profile picture", className: expect.stringContaining("object-cover") as string },
    ]);
  });

  it("keeps the AIØ logo and greeting in the header", () => {
    renderHeader("driver@ai0.app");

    expect(container.textContent).toContain("AI");
    expect(container.textContent).toContain("Ø");
  });

  it("removes the old three-dots button from the header", () => {
    renderHeader();

    expect(container.querySelector("button[aria-label='Open more menu']")).toBeNull();
    expect(container.querySelector("button[title='More']")).toBeNull();
    expect(container.querySelector("svg.lucide-ellipsis")).toBeNull();
  });

  it("removes the old header dark/light mode button", () => {
    renderHeader();

    expect(container.querySelector("button[aria-label*='Switch to']")).toBeNull();
    expect(container.querySelector("svg.lucide-sun")).toBeNull();
    expect(container.querySelector("svg.lucide-moon")).toBeNull();
  });

  it("renders the profile picture circular with object-cover cropping", () => {
    renderHeader();

    const button = container.querySelector("button[aria-label='Open profile and More menu']");
    expect(button?.className).toContain("rounded-full");
    expect(button?.className).toContain("h-11");
    expect(button?.className).toContain("w-11");
    expect(button?.className).toContain("overflow-hidden");
    expect(container.querySelector("img")?.className).toContain("object-cover");
  });

  it("opens the More/profile destination when the profile picture is tapped", () => {
    const onOpenProfile = vi.fn();
    renderHeader("driver@ai0.app", onOpenProfile);

    const button = container.querySelector<HTMLButtonElement>("button[aria-label='Open profile and More menu']");
    expect(button).not.toBeNull();
    act(() => button?.click());

    expect(onOpenProfile).toHaveBeenCalledTimes(1);
  });
});

describe("More page profile row", () => {
  it("uses the same profile image beside the user name", () => {
    renderMoreScreen();

    expect(container.querySelector("img")?.getAttribute("src")).toBe(AVATAR_PATH);
    expect(container.textContent).toContain("driver@ai0.app");
    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toContain("profile picture");
    expect(img?.className).toContain("object-cover");
    expect(img?.closest("span")?.className).toContain("rounded-full");
    expect(img?.closest("span")?.className).toContain("h-12");
    expect(img?.closest("span")?.className).toContain("w-12");
  });

  it("keeps the theme toggle available on the More page", () => {
    renderMoreScreen("dark");

    const toggle = container.querySelector<HTMLButtonElement>("button[aria-label='Switch to light mode']");
    expect(toggle).not.toBeNull();
    expect(toggle?.querySelector("svg.lucide-sun")).not.toBeNull();
  });

  it("keeps the user name and authenticated label unchanged", () => {
    renderMoreScreen();

    expect(container.textContent).toContain("driver@ai0.app");
    expect(container.textContent).toContain("Authenticated");
  });
});

describe("avatar asset is local and bundled", () => {
  it("references the same local public asset path in both locations", () => {
    renderHeader();
    const headerSrc = container.querySelector("img")?.getAttribute("src");

    renderMoreScreen();
    const moreSrc = container.querySelector("img")?.getAttribute("src");

    expect(headerSrc).toBe(AVATAR_PATH);
    expect(moreSrc).toBe(AVATAR_PATH);
    expect(headerSrc).toBe(moreSrc);
  });

  it("ships the bundled asset file in the repository", () => {
    expect(existsSync(AVATAR_FILE)).toBe(true);
  });
});
