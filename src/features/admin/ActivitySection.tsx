import React, { useEffect, useState, useCallback } from "react";
import { authFetchJson } from "../../services/apiClient";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Filter, X } from "lucide-react";
import { format } from "date-fns";

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

interface ActivityResponse {
  activities: ActivityLogEntry[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

interface ActivityFilters {
  feature: string;
  action: string;
  ownerId: string;
  from: string;
  to: string;
}

export function ActivitySection() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ActivityFilters>({
    feature: "",
    action: "",
    ownerId: "",
    from: "",
    to: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("offset", "0");
      if (filters.feature) params.set("feature", filters.feature);
      if (filters.action) params.set("action", filters.action);
      if (filters.ownerId) params.set("ownerId", filters.ownerId);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const result = await authFetchJson<ActivityResponse>(`/api/admin/activity?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const hasActiveFilters = Object.values(filters).some(v => v !== "");
  const totalPages = data ? Math.ceil(data.pagination.total / data.pagination.limit) : 0;
  const currentPage = data ? Math.floor(data.pagination.offset / data.pagination.limit) + 1 : 1;

  if (loading && !data) {
    return (
      <div className="aio-card p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-aio-primary)] border-t-transparent mx-auto" />
        <p className="mt-3 text-[var(--color-aio-text-2)]">Loading activity log...</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-[var(--color-aio-text-2)]" />
          <span className="text-[14px] font-bold text-[var(--color-aio-text)]">Filters</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters({ feature: "", action: "", ownerId: "", from: "", to: "" })}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--color-aio-text-2)] hover:bg-[var(--color-aio-surface-2)]"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-[14px] border text-sm font-bold transition-colors ${
            showFilters
              ? "bg-[var(--color-aio-primary)] border-[var(--color-aio-primary)] text-white"
              : "bg-[var(--color-aio-surface)] border-[var(--color-aio-line)] text-[var(--color-aio-text)]"
          }`}
        >
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {showFilters && (
        <div className="aio-card p-4 space-y-3 animate-slide-down">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              placeholder="Feature (probation, shower, etc.)"
              value={filters.feature}
              onChange={e => setFilters({ ...filters, feature: e.target.value })}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Action (check_in_completed, etc.)"
              value={filters.action}
              onChange={e => setFilters({ ...filters, action: e.target.value })}
              className="input-field"
            />
            <input
              type="text"
              placeholder="User ID (partial)"
              value={filters.ownerId}
              onChange={e => setFilters({ ...filters, ownerId: e.target.value })}
              className="input-field"
            />
            <input
              type="datetime-local"
              value={filters.from}
              onChange={e => setFilters({ ...filters, from: e.target.value })}
              className="input-field"
            />
            <input
              type="datetime-local"
              value={filters.to}
              onChange={e => setFilters({ ...filters, to: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
      )}

      <div className="aio-card">
        {data?.activities.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-aio-text-2)]">
            No activity records found.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-aio-line)]">
            {data!.activities.map(activity => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
          </div>
        )}

        {data && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--color-aio-line)]">
            <span className="text-sm text-[var(--color-aio-text-2)]">
              Page {currentPage} of {totalPages} ({data.pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => { /* pagination not implemented for simplicity */ }}
                className="px-3 py-1.5 rounded text-sm font-bold text-[var(--color-aio-text-2)] disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => { /* pagination not implemented for simplicity */ }}
                className="px-3 py-1.5 rounded text-sm font-bold text-[var(--color-aio-text-2)] disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: ActivityLogEntry }) {
  return (
    <div className="p-4 hover:bg-[var(--color-aio-surface-2)] transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[var(--color-aio-text-3)] text-xs">
              {format(new Date(activity.created_at), "MMM d, yyyy HH:mm:ss")}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-aio-primary)]/10 text-[var(--color-aio-primary)]">
              {activity.feature}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-aio-surface-2)] text-[var(--color-aio-text-2)]">
              {activity.action}
            </span>
            {activity.owner_id && (
              <span className="font-mono text-[var(--color-aio-text-3)] text-xs">
                {activity.owner_id.slice(0, 8)}...
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--color-aio-text)]">{activity.summary}</p>
          {activity.related_record_type && (
            <p className="mt-1 text-xs text-[var(--color-aio-text-2)]">
              Related: {activity.related_record_type} {activity.related_record_id}
            </p>
          )}
        </div>
        {Object.keys(activity.metadata).length > 0 && (
          <details className="flex-shrink-0">
            <summary className="text-xs text-[var(--color-aio-text-2)] cursor-pointer">Metadata</summary>
            <pre className="mt-2 p-2 text-xs bg-[var(--color-aio-surface)] rounded overflow-auto max-h-32">
              {JSON.stringify(activity.metadata, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}