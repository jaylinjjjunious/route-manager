import React, { lazy, Suspense, useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import AuthLoadingScreen from "../components/AuthLoadingScreen";
import LoginPage from "../components/LoginPage";
import ForgotPasswordPage from "../components/ForgotPasswordPage";
import ResetPasswordPage from "../components/ResetPasswordPage";
import AuthDebugPanel from "../components/AuthDebugPanel";
import { authDebugProtectedAppRendered, authDebugLoginPageRendered } from "./authDebug";

const App = lazy(() => import("../App"));

type AuthView = "login" | "forgot-password" | "reset-password" | "app";

function getInitialView(pathname: string): AuthView {
  if (pathname === "/reset-password") return "reset-password";
  if (pathname === "/login") return "login";
  if (pathname === "/forgot-password") return "forgot-password";
  return "app";
}

export default function ProtectedApp() {
  const { session, loading } = useAuth();
  const [view, setView] = useState<AuthView>(() => getInitialView(window.location.pathname));

  // Sync view with URL changes (back/forward)
  useEffect(() => {
    const handler = () => {
      const next = getInitialView(window.location.pathname);
      // Only update if URL matches a known auth view and differs from current
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
    setView(next);
  };

  // Still checking session
  if (loading) {
    return (
      <>
        <AuthLoadingScreen />
        <AuthDebugPanel />
      </>
    );
  }

  // Not authenticated — only show login / forgot-password / reset-password
  if (!session) {
    authDebugLoginPageRendered();
    if (view === "forgot-password") {
      return (
        <>
          <ForgotPasswordPage onBack={() => navigate("login")} />
          <AuthDebugPanel />
        </>
      );
    }
    if (view === "reset-password") {
      return (
        <>
          <ResetPasswordPage onDone={() => navigate("login")} />
          <AuthDebugPanel />
        </>
      );
    }
    return (
      <>
        <LoginPage onForgotPassword={() => navigate("forgot-password")} />
        <AuthDebugPanel />
      </>
    );
  }

  authDebugProtectedAppRendered();

  // Authenticated — reset-password can still be reached via recovery link
  if (view === "reset-password") {
    return (
      <>
        <ResetPasswordPage onDone={() => navigate("app")} />
        <AuthDebugPanel />
      </>
    );
  }

  // Authenticated and viewing app
  return (
    <>
      <Suspense fallback={<AuthLoadingScreen />}>
        <App />
      </Suspense>
      <AuthDebugPanel />
    </>
  );
}
