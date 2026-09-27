import React from "react";
import { AlertTriangle, Camera, CheckCircle2, ExternalLink, MonitorUp, ShieldCheck, Calendar, Clock, Smartphone } from "lucide-react";
import type { ProbationCheckInState } from "./useProbationCheckIn";
import { useExternalBrowser } from "../../hooks/useExternalBrowser";
import { CECheckInPanel } from "../../components/CECheckInPanel";

const CE_CHECK_IN_URL = "https://cecheckin.com/";

const phaseContent = {
  early: {
    label: "EARLY ACTION",
    title: "Handle your probation check-in early",
    detail: "Your reporting window is open through the 10th. Knock it out now so it never becomes a problem.",
    tone: "border-blue-400/25 bg-blue-500/10 text-blue-100",
  },
  coach: {
    label: "COACH MODE",
    title: "Check in before the lock starts",
    detail: "You still have access to jobs, but this needs to be finished before the 8th.",
    tone: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  },
  urgent: {
    label: "URGENT MODE · JOBS LOCKED",
    title: "Probation check-in required first",
    detail: "Complete CE Check-In and confirm it here to unlock your job actions.",
    tone: "border-red-400/35 bg-red-500/12 text-red-100",
  },
  overdue: {
    label: "OVERDUE · JOBS LOCKED",
    title: "Your monthly probation check-in is not recorded",
    detail: "Open CE Check-In now. If the reporting window has closed, contact your probation officer for instructions.",
    tone: "border-red-400/40 bg-red-500/15 text-red-100",
  },
  complete: {
    label: "CHECK-IN RECORDED",
    title: "Monthly probation check-in complete",
    detail: "Your internal completion log is saved for this month.",
    tone: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  },
} as const;

function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MonthlyCheckInSettings({ state }: { state: ProbationCheckInState }) {
  const { open } = useExternalBrowser();
  const content = phaseContent[state.phase];
  const proofAttached = Boolean(state.record?.proofDataUrl);
  const completedAt = state.record?.completedAt
    ? formatDateTime(state.record.completedAt)
    : null;
  const startedAt = state.record?.startedAt
    ? formatDateTime(state.record.startedAt)
    : null;

  if (state.completed) {
    return (
      <section aria-label="Monthly probation check-in" className="space-y-4">
        <div className="flex items-center gap-3 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-emerald-100 shadow-[0_12px_36px_rgba(0,0,0,0.18)]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/15">
            <ShieldCheck size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black tracking-wide text-emerald-200/75">CHECK-IN RECORDED</p>
            <p className="truncate text-[14px] font-bold text-white">
              {completedAt ? `Monthly check-in logged ${completedAt}` : "Monthly probation check-in complete"}
            </p>
          </div>
          <span className="hidden rounded-full bg-black/20 px-3 py-1.5 text-[11px] font-bold text-white/65 sm:block">
            {proofAttached ? "Screenshot documented" : "Self-confirmed"}
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4 space-y-3">
          <h3 className="text-xs font-black uppercase text-emerald-400 tracking-widest">Details</h3>
          <div className="grid gap-2 sm:grid-cols-2 text-[13px]">
            <div>
              <p className="font-bold text-emerald-100">Status</p>
              <p className="text-emerald-100/70">Completed</p>
            </div>
            <div>
              <p className="font-bold text-emerald-100">Month</p>
              <p className="text-emerald-100/70">{formatMonthKey(state.monthKey)}</p>
            </div>
            {startedAt && (
              <div>
                <p className="font-bold text-emerald-100">Started</p>
                <p className="text-emerald-100/70">{startedAt}</p>
              </div>
            )}
            <div>
              <p className="font-bold text-emerald-100">Completed</p>
              <p className="text-emerald-100/70">{completedAt}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-bold text-emerald-100">Verification</p>
              <p className="text-emerald-100/70">
                {state.record?.verificationLevel === "provider_verified"
                  ? "Provider verified"
                  : proofAttached
                  ? "Screenshot documented"
                  : "Self-confirmed"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-bold text-emerald-100">Device</p>
              <p className="text-emerald-100/70 capitalize">{state.device}</p>
</div>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
          <h3 className="text-xs font-black uppercase text-emerald-400 tracking-widest mb-3">CE Check-In</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await open({ url: CE_CHECK_IN_URL });
              }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[14px] bg-emerald-500/20 px-4 py-2 text-[13px] font-bold text-emerald-100 hover:bg-emerald-500/30 transition-colors"
            >
              <ExternalLink size={15} /> Open CE Check-In
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-xs font-black uppercase text-emerald-400 tracking-widest mb-3">Embedded CE Check-In Panel</h3>
          <CECheckInPanel />
        </div>

        {state.record?.events.length && (
            <details className="mt-2 text-[12px] text-emerald-100/60">
              <summary className="cursor-pointer font-bold text-emerald-100/70 flex items-center gap-2">
                <Clock size={14} />
                View activity log
              </summary>
              <div className="mt-2 space-y-1 pl-6 border-l border-emerald-400/20">
                {state.record.events.slice().reverse().map((event, index) => (
                  <p key={`${event.at}-${index}`} className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-emerald-100/50">{formatDateTime(event.at)}</span>
                    <span className="text-emerald-100/70">{event.type.replaceAll("_", " ")}</span>
                    <span className="text-emerald-100/50">·</span>
                    <span className="text-emerald-100/50 capitalize">{event.device}</span>
                  </p>
                ))}
              </div>
            </details>
          )}

          {state.record?.proofDataUrl && (
            <div className="mt-3">
              <p className="font-bold text-emerald-100 mb-2">Attached Screenshot</p>
              <img
                src={state.record.proofDataUrl}
                alt="CE Check-In confirmation screenshot"
                className="rounded-lg max-h-64 w-auto border border-emerald-400/30 shadow-lg"
              />
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Monthly probation check-in" className={`relative overflow-hidden rounded-[24px] border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.24)] sm:p-5 ${content.tone} space-y-4`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-purple-500/25 blur-3xl" />

      <div className="relative">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-black/25">
            <AlertTriangle size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black tracking-wide opacity-75">{content.label}</p>
            <h2 className="mt-1 text-[19px] font-black leading-tight text-white">{content.title}</h2>
            <p className="mt-1 text-[13px] font-semibold leading-snug text-white/70">{content.detail}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4 space-y-3">
          <h3 className="text-xs font-black uppercase text-white/50 tracking-widest">Current Status</h3>
          <div className="grid gap-2 sm:grid-cols-2 text-[13px]">
            <div>
              <p className="font-bold text-white">Month</p>
              <p className="text-white/70">{formatMonthKey(state.monthKey)}</p>
            </div>
            <div>
              <p className="font-bold text-white">Reporting Window</p>
              <p className="text-white/70">1st–10th of each month</p>
            </div>
            <div>
              <p className="font-bold text-white">Device</p>
              <p className="text-white/70 capitalize">{state.device}</p>
            </div>
            <div>
              <p className="font-bold text-white">Status</p>
              <p className="text-white/70">
                {state.record?.verificationLevel === "provider_verified"
                  ? "Provider verified"
                  : proofAttached
                  ? "Screenshot documented"
                  : "Not completed"}
              </p>
            </div>
            {startedAt && (
              <div className="sm:col-span-2">
                <p className="font-bold text-white">First Opened CE Check-In</p>
                <p className="text-white/70">{startedAt}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={state.openCeCheckIn}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-white px-4 py-3 text-[14px] font-black text-slate-950 shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] transition-shadow"
          >
            <ExternalLink size={17} /> Check In Now
          </button>
          {state.device === "computer" && (
            <button
              type="button"
              onClick={() => void state.captureComputerProof()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-white/15 bg-black/25 px-4 py-3 text-[14px] font-bold text-white hover:bg-black/35 transition-colors"
            >
              <MonitorUp size={17} /> Capture Screen
            </button>
          )}
          <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[16px] border border-white/15 bg-black/25 px-4 py-3 text-[14px] font-bold text-white hover:bg-black/35 transition-colors">
            <Camera size={17} /> {proofAttached ? "Screenshot Added" : "Add Screenshot"}
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void state.attachProof(file);
              event.currentTarget.value = "";
            }} />
          </label>
          <button
            type="button"
            onClick={state.confirmCompleted}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-emerald-500 px-4 py-3 text-[14px] font-black text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)] hover:shadow-[0_10px_28px_rgba(16,185,129,0.35)] transition-shadow"
          >
            <CheckCircle2 size={17} /> I Completed It
          </button>
        </div>

        {state.error && <p role="alert" className="mt-3 text-[12px] font-bold text-red-200">{state.error}</p>}

        {state.record?.events.length && (
          <details className="mt-3 text-[12px] text-white/60">
            <summary className="cursor-pointer font-bold text-white/70 flex items-center gap-2">
              <Clock size={14} />
              View activity log
            </summary>
            <div className="mt-2 space-y-1">
              {state.record.events.slice().reverse().map((event, index) => (
                <p key={`${event.at}-${index}`} className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-white/40">{formatDateTime(event.at)}</span>
                  <span className="text-white/70">{event.type.replaceAll("_", " ")}</span>
                  <span className="text-white/40">·</span>
                  <span className="text-white/40 capitalize">{event.device}</span>
                </p>
              ))}
            </div>
          </details>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <h3 className="text-xs font-black uppercase text-white/50 tracking-widest mb-3">About CE Check-In</h3>
        <div className="space-y-2 text-[13px] text-white/70">
          <p>The CE Check-In website (<code className="font-mono text-white/90 bg-black/20 px-1.5 rounded">checkin.ce-connect.com</code>) is the official probation check-in portal.</p>
          <p>Due to security restrictions on their website, it cannot be embedded directly in this app.</p>
          <p><strong>"Check In Now"</strong> opens the site: on iOS app it opens in a native in-app browser; on web/PWA it opens in a new tab.</p>
          <p>After completing the check-in on their site, return here and use <strong>"I Completed It"</strong> to record your completion with optional screenshot proof.</p>
        </div>
      </div>
    </section>
  );
}
