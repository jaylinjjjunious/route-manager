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
      <div role="status" className="rounded-xl border border-white/15 p-4 text-sm space-y-2">
        <p>{state.syncStatus.lastError ? `Account sync failed: ${state.syncStatus.lastError}` : state.syncStatus.pendingSync || (state.record && !state.record.serverSynced) ? 'Saved on this device. Account sync pending.' : state.record?.serverSynced ? 'Saved to your account.' : 'Account check-in history loads when you sign in.'}</p>
        <button type="button" onClick={() => void state.syncToServer()} className="underline">Retry account sync</button>
        {state.hasLegacyRecords && <div><p>This browser has older check-ins that are not assigned to an account. Import only if they belong to you.</p><button type="button" onClick={state.importLegacyRecords} className="underline">Import my older check-ins</button></div>}
      </div>
      <MonthlyCheckInSettings state={state} />
    </div>
  );
}
