import React, { lazy, Suspense, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import LoginPage from "../components/LoginPage";
import ForgotPasswordPage from "../components/ForgotPasswordPage";
import ResetPasswordPage from "../components/ResetPasswordPage";
import ErrorBoundary from "../debug/ErrorBoundary";
import { authDebugProtectedAppRendered, authDebugLoginPageRendered } from "./authDebug";

const App = lazy(() => import("../App"));
const JobDetailPage = lazy(() => import("../components/JobDetailPage"));

type AuthView = "login" | "forgot-password" | "reset-password" | "app";

const JOB_PATH_RE = /^\/job\/([A-Za-z0-9_-]+)$/;

function parseJobIdFromPath(pathname: string): string | null {
  const match = pathname.match(JOB_PATH_RE);
  return match ? match[1] : null;
}

function isRetiredRoutePath(pathname: string): boolean {
  const normalized = pathname.toLowerCase().replace(/^\/+/, "").replace(/\/+$/, "");
  return normalized === "route" || normalized === "routes";
}

function redirectRetiredRoutePath() {
  if (isRetiredRoutePath(window.location.pathname)) {
    window.history.replaceState(null, "", "/#dashboard");
  }
}

function getInitialView(pathname: string): AuthView {
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
  const { session, loading } = useAuth();
  const [view, setView] = useState<AuthView>(() => getInitialView(window.location.pathname));
  const [debugCenterOpen, setDebugCenterOpen] = useState(false);
  const [jobDetailId, setJobDetailId] = useState<string | null>(() => parseJobIdFromPath(window.location.pathname));

  const openDebugCenter = useCallback(() => {
    setDebugCenterOpen(true);
  }, []);

  useEffect(() => {
    globalOpenDebugCenter = openDebugCenter;
    return () => { globalOpenDebugCenter = null; };
  }, [openDebugCenter]);

  // Sync view and job detail route with URL changes (back/forward)
  useEffect(() => {
    const handler = () => {
      const jobId = parseJobIdFromPath(window.location.pathname);
      setJobDetailId(jobId);
      const next = getInitialView(window.location.pathname);
      if (next !== view) setView(next);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [view]);

  const navigate = (next: AuthView) => {
    const path = next === "app" ? "/" : `/${next}`;
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setJobDetailId(null);
    setView(next);
  };

  const navigateBackFromJob = useCallback(() => {
    window.history.back();
  }, []);

  // Still checking session
  if (loading) {
    return <AuthLoadingScreen />;
  }

  // Not authenticated — only show login / forgot-password / reset-password
  if (!session) {
    authDebugLoginPageRendered();
    if (view === "forgot-password") {
      return <ForgotPasswordPage onBack={() => navigate("login")} />;
    }
    if (view === "reset-password") {
      return <ResetPasswordPage onDone={() => navigate("login")} />;
    }
    return <LoginPage onForgotPassword={() => navigate("forgot-password")} />;
  }

  authDebugProtectedAppRendered();

  // Authenticated — reset-password can still be reached via recovery link
  if (view === "reset-password") {
    return <ResetPasswordPage onDone={() => navigate("app")} />;
  }

  // Job detail page — full-screen route, rendered instead of the main App
  if (jobDetailId) {
    return (
      <ErrorBoundary onOpenDebugCenter={openDebugCenter}>
        <Suspense fallback={<AuthLoadingScreen />}>
          <JobDetailPage jobId={jobDetailId} onBack={navigateBackFromJob} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Authenticated and viewing app
  return (
      <ErrorBoundary onOpenDebugCenter={openDebugCenter}>
      <Suspense fallback={<AuthLoadingScreen />}>
        <App debugCenterOpen={debugCenterOpen} onCloseDebugCenter={() => setDebugCenterOpen(false)} onOpenDebugCenter={openDebugCenter} />
      </Suspense>
    </ErrorBoundary>
  );
}
