import React, { useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";

const MIN_PASSWORD_LENGTH = 8;

function validatePassword(password: string, confirmPassword: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}

export default function ChangePasswordPanel() {
  const { user, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setSuccess("");

    const validationError = validatePassword(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    resetForm();
    setSuccess("Password updated. Use the new password the next time you sign in.");
  };

  return (
    <div className="aio-card p-4" aria-labelledby="change-password-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#0A84FF]/10 text-[#0A84FF]">
          <KeyRound size={19} />
        </span>
        <div className="min-w-0">
          <h2 id="change-password-title" className="text-[16px] font-black leading-tight text-[var(--color-aio-text)]">
            Change Password
          </h2>
          <p className="mt-1 text-[13px] font-medium leading-relaxed text-[var(--color-aio-text-2)]">
            Update the password for your Supabase account. Your app data stays unchanged.
          </p>
        </div>
      </div>

      {!user ? (
        <div className="mt-3 rounded-[14px] border border-[#FF9F0A]/25 bg-[#FF9F0A]/10 px-3 py-2 text-[13px] font-bold text-[#B25000] dark:text-[#FFCC00]">
          Sign in with your real account to change your password. Local development bypass mode cannot update Supabase credentials.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="account-new-password" className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-[var(--color-aio-text-2)]">
              New Password
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-aio-text-3)]" />
              <input
                id="account-new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                disabled={submitting}
                className="min-h-12 w-full rounded-[14px] border border-[var(--color-aio-line)] bg-[var(--color-aio-surface)] py-3 pl-10 pr-12 text-[16px] font-semibold text-[var(--color-aio-text)] outline-none focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/20 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(value => !value)}
                disabled={submitting}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[10px] text-[var(--color-aio-text-2)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="account-confirm-password" className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-[var(--color-aio-text-2)]">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-aio-text-3)]" />
              <input
                id="account-confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                placeholder="Re-enter new password"
                disabled={submitting}
                className="min-h-12 w-full rounded-[14px] border border-[var(--color-aio-line)] bg-[var(--color-aio-surface)] py-3 pl-10 pr-3 text-[16px] font-semibold text-[var(--color-aio-text)] outline-none focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/20 disabled:opacity-50"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-[14px] border border-[#FF453A]/25 bg-[#FF453A]/10 px-3 py-2 text-[13px] font-bold text-[#D70015] dark:text-[#FF6961]" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 rounded-[14px] border border-[#30D158]/25 bg-[#30D158]/10 px-3 py-2 text-[13px] font-bold text-[#248A3D] dark:text-[#30D158]" role="status">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-12 w-full items-center justify-center rounded-[14px] bg-[#0A84FF] px-4 py-3 text-[14px] font-black text-white transition active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? "Updating..." : "Update Password"}
          </button>
        </form>
      )}
    </div>
  );
}

export { MIN_PASSWORD_LENGTH, validatePassword };
