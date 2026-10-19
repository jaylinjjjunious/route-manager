import React, { useEffect, useState } from "react";
import { authFetchJson } from "../../services/apiClient";
import { format } from "date-fns";

interface AdminOverviewStats {
  totalActivity: number;
  totalProbation: number;
  completedProbation: number;
  pendingProbation: number;
}

interface ActivityLogEntry {
  id: string;
  owner_id: string;
  feature: string;
  action: string;
  related_record_type: string | null;
  related_record_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ProbationRecord {
  owner_id: string;
  month_key: string;
  started_at: string | null;
  completed_at: string | null;
  device: string;
  verification_level: string | null;
  proof_name: string | null;
  proof_data_url: string | null;
  provider_receipt_id: string | null;
  confirmation_url: string | null;
  confirmation_message_id: string | null;
  events: unknown[];
  updated_at: string;
}

export function OverviewSection() {
  const [stats, setStats] = useState<AdminOverviewStats>({
    totalActivity: 0,
    totalProbation: 0,
    completedProbation: 0,
    pendingProbation: 0,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([]);
  const [recentProbation, setRecentProbation] = useState<ProbationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await authFetchJson<{
          stats: AdminOverviewStats;
          recentActivity: ActivityLogEntry[];
          recentProbation: ProbationRecord[];
        }>("/api/admin/overview");

        if (mounted) {
          setStats(data.stats);
          setRecentActivity(data.recentActivity);
          setRecentProbation(data.recentProbation);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load overview");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="aio-card p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-aio-primary)] border-t-transparent mx-auto" />
        <p className="mt-3 text-[var(--color-aio-text-2)]">Loading admin overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aio-card p-6 text-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Activity" value={stats.totalActivity} icon="📋" />
        <StatCard label="Probation Records" value={stats.totalProbation} icon="📅" />
        <StatCard label="Completed" value={stats.completedProbation} icon="✅" />
        <StatCard label="Pending" value={stats.pendingProbation} icon="⏳" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <RecentActivityCard activities={recentActivity} />
        <RecentProbationCard records={recentProbation} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="aio-card p-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <p className="text-[13px] font-medium text-[var(--color-aio-text-2)]">{label}</p>
          <p className="text-[28px] font-black text-[var(--color-aio-text)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function RecentActivityCard({ activities }: { activities: ActivityLogEntry[] }) {
  return (
    <div className="aio-card p-4">
      <h3 className="text-[16px] font-black text-[var(--color-aio-text)]">Recent Activity</h3>
      {activities.length === 0 ? (
        <p className="mt-3 text-[var(--color-aio-text-2)]">No recent activity</p>
      ) : (
        <ul className="mt-3 space-y-2 max-h-64 overflow-auto">
          {activities.slice(0, 10).map(a => (
            <li key={a.id} className="text-sm text-[var(--color-aio-text-2)]">
              <span className="font-mono text-[var(--color-aio-text-3)]">{format(new Date(a.created_at), "MMM d, HH:mm")}</span>{" "}
              <span className="font-medium text-[var(--color-aio-primary)]">{a.feature}</span>
              <span className="text-[var(--color-aio-text-3)]">/</span>{" "}
              <span>{a.action}</span>
              <span className="text-[var(--color-aio-text-3)]">:</span>{" "}
              <span>{a.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecentProbationCard({ records }: { records: ProbationRecord[] }) {
  return (
    <div className="aio-card p-4">
      <h3 className="text-[16px] font-black text-[var(--color-aio-text)]">Recent Probation Check-Ins</h3>
      {records.length === 0 ? (
        <p className="mt-3 text-[var(--color-aio-text-2)]">No probation records</p>
      ) : (
        <ul className="mt-3 space-y-2 max-h-64 overflow-auto">
          {records.slice(0, 10).map(r => (
            <li key={`${r.owner_id}:${r.month_key}`} className="text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.month_key}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  r.completed_at ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
                }`}>
                  {r.completed_at ? "Completed" : "Pending"}
                </span>
              </div>
              <div className="text-[var(--color-aio-text-2)]">
                {r.verification_level && `Level: ${r.verification_level}`}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}