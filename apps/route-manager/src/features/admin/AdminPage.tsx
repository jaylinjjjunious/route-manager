import React, { useState, useEffect, useCallback } from "react";
import { authFetchJson } from "../../services/apiClient";
import { ToolPageHeader } from "../../components/aio/ToolPageHeader";
import { ActivitySection } from "./ActivitySection";
import { ProbationSection } from "./ProbationSection";
import { OverviewSection } from "./OverviewSection";
import { ChevronRight, LayoutDashboard, ListChecks, ClipboardList } from "lucide-react";

type AdminTab = "overview" | "activity" | "probation";

interface AdminPageProps {
  onBack: () => void;
}

const TABS: { id: AdminTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "activity", label: "Activity", icon: ListChecks },
  { id: "probation", label: "Probation", icon: ClipboardList },
];

export default function AdminPage({ onBack }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  return (
    <div className="animate-fade-in space-y-6" id="tab-view-admin">
      <ToolPageHeader
        onBack={onBack}
        title="Admin Portal"
        subtitle="Remote administration"
      />

      <nav className="aio-card p-2" aria-label="Admin sections">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-w-[110px] items-center justify-center gap-2 rounded-[14px] px-3 py-2.5 text-sm font-bold transition-colors ${
                activeTab === tab.id
                  ? "bg-[var(--color-aio-primary)] text-white"
                  : "text-[var(--color-aio-text-2)] hover:bg-[var(--color-aio-surface-2)]"
              }`}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === "overview" && <OverviewSection />}
      {activeTab === "activity" && <ActivitySection />}
      {activeTab === "probation" && <ProbationSection />}
    </div>
  );
}