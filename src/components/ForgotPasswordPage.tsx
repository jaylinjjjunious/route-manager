import React, { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { ArrowLeft, Mail, ShieldCheck, CheckCircle2 } from "lucide-react";

interface ForgotPasswordPageProps {
  onBack: () => void;
}

export default function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    setSubmitting(true);
    const result = await resetPassword(trimmedEmail);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      setSent(true);
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white" style={{ minHeight: "100dvh" }}>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-12">
        <div className="flex flex-1 flex-col justify-center">
          {/* Back */}
          <button
            type="button"
            onClick={onBack}
            className="mb-8 flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </button>

          {/* Brand */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Reset your password
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-400">
              Enter your email and we&apos;ll send a reset link.
            </p>
          </div>

          {sent ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400" />
              <p className="text-base font-black text-emerald-300">Check your email</p>
              <p className="mt-2 text-sm font-bold text-slate-400">
                If an account exists for that email, you&apos;ll receive a password reset link shortly.
              </p>
              <button
                type="button"
                onClick={onBack}
                className="mt-6 rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/15"
              >
                Return to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="reset-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="reset-email"
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

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-4 text-base font-black uppercase tracking-wide text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                style={{ minHeight: "48px" }}
              >
                {submitting ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sending link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
