import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  authDebugMount,
  authDebugUnmount,
  authDebugLoading,
  authDebugSession,
  authDebugEvent,
  authDebugSignOut,
  authDebugRaw,
} from "./authDebug";
import { isLocalAuthBypassAllowed } from "./localAuthBypass";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  verificationMode: boolean;
  workspaceBypassAvailable: boolean;
  enableWorkspaceBypass: () => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationMode, setVerificationMode] = useState(false);
  const mountedRef = useRef(true);
  const initIdRef = useRef(0);
  const userSignedOutRef = useRef(false);
  const localAuthBypassAvailable = isLocalAuthBypassAllowed({
    isDevelopment: import.meta.env.DEV,
    enabled: import.meta.env.VITE_LOCAL_AUTH_BYPASS === "true",
    hostname: window.location.hostname,
  });
  const workspaceBypassAvailable =
    localAuthBypassAvailable || import.meta.env.VITE_PUBLIC_WORKSPACE_BYPASS === "true";

  useEffect(() => {
    mountedRef.current = true;
    authDebugMount();
    authDebugLoading(true);
    const id = ++initIdRef.current;

    const enableLocalVerification = import.meta.env.DEV && import.meta.env.VITE_INVENTORY_VERIFICATION_MODE === "true";
    if (enableLocalVerification) {
      fetch("/api/verification/inventory-session", { headers: { Accept: "application/json" } })
        .then(response => response.ok ? response.json() : null)
        .then(result => {
          if (mountedRef.current && result?.enabled === true) {
            setVerificationMode(true);
            setLoading(false);
            authDebugRaw("Local inventory verification mode enabled");
          }
        })
        .catch(() => undefined);
    }

    const enableTodayScreenshotMode = import.meta.env.DEV && import.meta.env.VITE_TODAY_SCREENSHOT_MODE === "true";
    if (enableTodayScreenshotMode) {
      setVerificationMode(true);
      setLoading(false);
      authDebugRaw("Today screenshot mode enabled (dev only)");
    }

    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (error) authDebugRaw(`getSession error: ${error.message}`);
      if (mountedRef.current && initIdRef.current === id) {
        authDebugSession(!!s, !!(s?.user));
        authDebugEvent("INITIAL_SESSION (getSession)");
        setSession(s);
        setLoading(false);
        authDebugLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mountedRef.current) return;

      authDebugEvent(event);
      authDebugSession(!!s, !!(s?.user));

      if (s) {
        setSession(s);
        setLoading(false);
        authDebugLoading(false);
      } else if (event === "INITIAL_SESSION") {
        setSession(null);
        setLoading(false);
        authDebugLoading(false);
      } else if (event === "SIGNED_OUT" && userSignedOutRef.current) {
        setSession(null);
        setLoading(false);
        authDebugLoading(false);
      } else {
        authDebugRaw(`Ignored event "${event}" with null session — preserving current session`);
      }
    });

    return () => {
      mountedRef.current = false;
      authDebugUnmount();
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    authDebugRaw("signInWithPassword called");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      authDebugRaw(`signIn error: ${error.message}`);
      if (error.message.includes("Invalid login")) {
        return { error: "Incorrect email or password. Please try again." };
      }
      if (error.message.includes("Email not confirmed")) {
        return { error: "This email has not been confirmed. Check your inbox." };
      }
      return { error: error.message || "Sign in failed. Please try again." };
    }
    authDebugRaw(`signIn success: session=${!!data.session} user=${!!data.user}`);
    return {};
  }, []);

  const enableWorkspaceBypass = useCallback(() => {
    if (!workspaceBypassAvailable) return;
    setVerificationMode(true);
    setLoading(false);
    authDebugRaw("Local-only workspace bypass enabled");
  }, [workspaceBypassAvailable]);

  const signOut = useCallback(async () => {
    userSignedOutRef.current = true;
    setVerificationMode(false);
    authDebugSignOut("AuthProvider.signOut (user-initiated)");
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      return { error: error.message || "Password reset failed." };
    }
    return {};
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { error: error.message || "Password update failed." };
    }
    return {};
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    verificationMode,
    workspaceBypassAvailable,
    enableWorkspaceBypass,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
