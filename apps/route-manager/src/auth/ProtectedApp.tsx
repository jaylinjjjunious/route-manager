import React, { lazy, Suspense, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import LoginPage from "../components/LoginPage";
import ForgotPasswordPage from "../components/ForgotPasswordPage";
import ResetPasswordPage from "../components/ResetPasswordPage";
import ErrorBoundary from "../debug/ErrorBoundary";
import { authDebugProtectedAppRendered, authDebugLoginPageRendered } from "./authDebug";

import { setStorageOwner } from "../utils/ownerStorage";
import { hallwayUrl, roomBase, roomPathname } from '../utils/roomLocation';

const App = lazy(() => import("../App"));

type AuthView = "login" | "forgot-password" | "reset-password" | "app";

function AuthRoom({ children }: { children: React.ReactNode }) {
  return <><a href={hallwayUrl()} className="fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-50 rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-violet-300">← Main menu</a>{children}</>;
}

function isRetiredRoutePath(pathname: string): boolean {
  const normalized = roomPathname(pathname).toLowerCase().replace(/^\/+/, "").replace(/\/+$/, "");
  return normalized === "route" || normalized === "routes" || normalized === "jobs";
}

function redirectRetiredRoutePath() {
  if (isRetiredRoutePath(window.location.pathname)) {
    window.history.replaceState(null, "", `${roomBase()}#dashboard`);
  }
}

function getInitialView(pathname: string): AuthView {
  pathname = roomPathname(pathname);
  if (isRetiredRoutePath(pathname)) return "app";
  if (pathname === "/reset-password") return "reset-password";
  if (pathname === "/login") return "login";
  if (pathname === "/forgot-password") return "forgot-password";
  return "app";
}

let globalOpenDebugCenter: (() => void) | null = null;

export function triggerOpenDebugCenter() {
  globalOpenDebugCenter?.();
}

export default function ProtectedApp() {
  redirectRetiredRoutePath();
  const { session, user, loading, verificationMode } = useAuth();
  const owner = user?.id ?? (verificationMode ? "local-verification" : null);
  setStorageOwner(owner);
  const [view, setView] = useState<AuthView>(() => getInitialView(window.location.pathname));
  const [debugCenterOpen, setDebugCenterOpen] = useState(false);

  const openDebugCenter = useCallback(() => {
    setDebugCenterOpen(true);
  }, []);

  useEffect(() => {
    globalOpenDebugCenter = openDebugCenter;
    return () => { globalOpenDebugCenter = null; };
  }, [openDebugCenter]);

  // Sync view with URL changes (back/forward)
  useEffect(() => {
    const handler = () => {
      const next = getInitialView(window.location.pathname);
      if (next !== view) setView(next);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [view]);

  const navigate = (next: AuthView) => {
    const path = next === "app" ? roomBase() : `${roomBase()}${next}`;
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setView(next);
  };

  // Still checking session
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Not authenticated — only show login / forgot-password / reset-password
  if (!session && !verificationMode) {
    authDebugLoginPageRendered();
    if (view === "forgot-password") {
      return <AuthRoom><ForgotPasswordPage onBack={() => navigate("login")} /></AuthRoom>;
    }
    if (view === "reset-password") {
      return <AuthRoom><ResetPasswordPage onDone={() => navigate("login")} /></AuthRoom>;
    }
    return <AuthRoom><LoginPage onForgotPassword={() => navigate("forgot-password")} /></AuthRoom>;
  }

  authDebugProtectedAppRendered();

  // Authenticated or explicitly server-approved local verification mode.
  if (view === "reset-password") {
    return <AuthRoom><ResetPasswordPage onDone={() => navigate("app")} /></AuthRoom>;
  }

  // Authenticated and viewing app
  return (
      <ErrorBoundary onOpenDebugCenter={openDebugCenter}>
      <Suspense fallback={<AuthLoadingScreen />}>
        <App key={owner} debugCenterOpen={debugCenterOpen} onCloseDebugCenter={() => setDebugCenterOpen(false)} onOpenDebugCenter={openDebugCenter} />
      </Suspense>
    </ErrorBoundary>
  );
}
