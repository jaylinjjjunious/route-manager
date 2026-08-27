import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isLocalAuthBypassAllowed } from "../src/auth/localAuthBypass";

const authMock = vi.hoisted(() => ({
  workspaceBypassAvailable: true,
  enableWorkspaceBypass: vi.fn(),
  signIn: vi.fn(async () => ({})),
}));

vi.mock("../src/auth/AuthProvider", () => ({
  useAuth: () => authMock,
}));

import LoginPage from "../src/components/LoginPage";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("isLocalAuthBypassAllowed", () => {
  it.each(["localhost", "127.0.0.1", "::1", "[::1]"])(
    "allows an explicitly enabled development bypass on %s",
    hostname => {
      expect(isLocalAuthBypassAllowed({ isDevelopment: true, enabled: true, hostname })).toBe(true);
    },
  );

  it("rejects production builds", () => {
    expect(isLocalAuthBypassAllowed({ isDevelopment: false, enabled: true, hostname: "localhost" })).toBe(false);
  });

  it("rejects a missing feature flag", () => {
    expect(isLocalAuthBypassAllowed({ isDevelopment: true, enabled: false, hostname: "localhost" })).toBe(false);
  });

  it("rejects non-loopback hosts", () => {
    expect(isLocalAuthBypassAllowed({ isDevelopment: true, enabled: true, hostname: "app.example.com" })).toBe(false);
  });
});

describe("LoginPage workspace bypass control", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    authMock.workspaceBypassAvailable = true;
    authMock.enableWorkspaceBypass.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it("uses the existing shield as the workspace bypass control", () => {
    act(() => root.render(React.createElement(LoginPage, { onForgotPassword: vi.fn() })));

    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Enter workspace without signing in"]',
    );
    expect(button).not.toBeNull();

    act(() => button?.click());
    expect(authMock.enableWorkspaceBypass).toHaveBeenCalledOnce();

    act(() => root.unmount());
    container.remove();
  });

  it("renders no bypass control when the guard is unavailable", () => {
    authMock.workspaceBypassAvailable = false;
    act(() => root.render(React.createElement(LoginPage, { onForgotPassword: vi.fn() })));

    expect(container.querySelector('[aria-label="Enter workspace without signing in"]')).toBeNull();

    act(() => root.unmount());
    container.remove();
  });
});
