import React, { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";

interface LoginPageProps {
  onForgotPassword: () => void;
}

export default function LoginPage({ onForgotPassword }: LoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    const result = await signIn(trimmedEmail, password);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    }
    // On success, session state changes and app renders
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white" style={{ minHeight: "100dvh" }}>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-12">
        <div className="flex flex-1 flex-col justify-center">
          {/* Brand */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Route Manager
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-400">
              Sign in to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="auth-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={submitting}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-base font-semibold text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
                  style={{ fontSize: "16px" }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={submitting}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-12 text-base font-semibold text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
                  style={{ fontSize: "16px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={submitting}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition-colors hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-4 text-base font-black uppercase tracking-wide text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
              style={{ minHeight: "48px" }}
            >
              {submitting ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Forgot Password */}
            <div className="text-center">
              <button
                type="button"
                onClick={onForgotPassword}
                disabled={submitting}
                className="text-sm font-bold text-blue-400 transition-colors hover:text-blue-300"
              >
                Forgot password?
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="pb-safe pb-4 text-center">
          <p className="text-xs font-bold text-slate-600">
            Private workspace. Authorized users only.
          </p>
        </div>
      </div>
    </main>
  );
}
