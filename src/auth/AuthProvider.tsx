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

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
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
  const mountedRef = useRef(true);
  const initIdRef = useRef(0);
  const userSignedOutRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    authDebugMount();
    authDebugLoading(true);
    const id = ++initIdRef.current;

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

  const signOut = useCallback(async () => {
    userSignedOutRef.current = true;
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
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
