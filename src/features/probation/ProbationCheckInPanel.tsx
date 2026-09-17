import React from "react";
import { AlertTriangle, Camera, CheckCircle2, ExternalLink, MonitorUp, ShieldCheck } from "lucide-react";
import type { ProbationCheckInState } from "./useProbationCheckIn";

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

export default function ProbationCheckInPanel({ state }: { state: ProbationCheckInState }) {
  const content = phaseContent[state.phase];
  const proofAttached = Boolean(state.record?.proofDataUrl);
  const completedAt = state.record?.completedAt
    ? new Date(state.record.completedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  if (state.completed) {
    return (
      <section
        aria-label="Monthly probation check-in"
        className="flex min-h-16 items-center gap-3 rounded-[18px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-emerald-100 shadow-[0_12px_36px_rgba(0,0,0,0.18)]"
      >
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
      </section>
    );
  }

  return (
    <section aria-label="Monthly probation check-in" className={`relative overflow-hidden rounded-[24px] border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.24)] sm:p-5 ${content.tone}`}>
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

        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-white/70">
          <span className="rounded-full bg-black/25 px-3 py-1.5">Window: 1st–10th</span>
          <span className="rounded-full bg-black/25 px-3 py-1.5">Device: {state.device}</span>
          <span className="rounded-full bg-black/25 px-3 py-1.5">
            {state.record?.verificationLevel === "provider_verified"
              ? "Provider verified"
              : proofAttached
                ? "Screenshot documented"
                : "Not completed"}
          </span>
          {completedAt && <span className="rounded-full bg-black/25 px-3 py-1.5">Logged {completedAt}</span>}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button type="button" onClick={state.openCeCheckIn} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-white px-4 py-3 text-[14px] font-black text-slate-950">
              <ExternalLink size={17} /> Check In Now
            </button>
            {state.device === "computer" && (
              <button type="button" onClick={() => void state.captureComputerProof()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-white/15 bg-black/25 px-4 py-3 text-[14px] font-bold text-white">
                <MonitorUp size={17} /> Capture Screen
              </button>
            )}
            <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[16px] border border-white/15 bg-black/25 px-4 py-3 text-[14px] font-bold text-white">
              <Camera size={17} /> {proofAttached ? "Screenshot Added" : "Add Screenshot"}
              <input type="file" accept="image/*" className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void state.attachProof(file);
                event.currentTarget.value = "";
              }} />
            </label>
            <button type="button" onClick={state.confirmCompleted} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-emerald-500 px-4 py-3 text-[14px] font-black text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)]">
              <CheckCircle2 size={17} /> I Completed It
            </button>
        </div>

        {state.error && <p role="alert" className="mt-3 text-[12px] font-bold text-red-200">{state.error}</p>}

        {state.record?.events.length ? (
          <details className="mt-3 text-[12px] text-white/60">
            <summary className="cursor-pointer font-bold text-white/70">View activity log</summary>
            <div className="mt-2 space-y-1">
              {state.record.events.slice().reverse().map((event, index) => (
                <p key={`${event.at}-${index}`}>{new Date(event.at).toLocaleString()} · {event.type.replaceAll("_", " ")} · {event.device}</p>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
