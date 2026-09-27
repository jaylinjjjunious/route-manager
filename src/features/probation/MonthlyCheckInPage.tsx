import React from "react";
import MonthlyCheckInSettings from "./MonthlyCheckInSettings";
import type { ProbationCheckInState } from "./useProbationCheckIn";

interface MonthlyCheckInPageProps {
  state: ProbationCheckInState;
}

export default function MonthlyCheckInPage({ state }: MonthlyCheckInPageProps) {
  return (
    <div className="animate-fade-in space-y-6" id="tab-view-checkin">
      <div>
        <p className="aio-label text-[13px]">Probation</p>
        <h1 className="mt-0.5 text-[28px] font-black leading-none tracking-[-0.02em] text-[var(--color-aio-text)]">Monthly Check-In</h1>
      </div>

      <MonthlyCheckInSettings state={state} />
    </div>
  );
}