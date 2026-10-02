import React from "react";
import MonthlyCheckInSettings from "./MonthlyCheckInSettings";
import type { ProbationCheckInState } from "./useProbationCheckIn";
import { ToolPageHeader } from "../../components/aio/ToolPageHeader";

interface MonthlyCheckInPageProps {
  state: ProbationCheckInState;
  onBack: () => void;
}

export default function MonthlyCheckInPage({ state, onBack }: MonthlyCheckInPageProps) {
  return (
    <div className="animate-fade-in space-y-6" id="tab-view-checkin">
      <ToolPageHeader
        onBack={onBack}
        title="Monthly Check-In"
        subtitle="Probation"
      />
      <MonthlyCheckInSettings state={state} />
    </div>
  );
}