import React, { useEffect, useState, useCallback } from "react";
import { authFetchJson } from "../../services/apiClient";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Filter, X, Eye, Download } from "lucide-react";
import { format } from "date-fns";

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
  events: Array<{
    type: "opened_ce" | "proof_attached" | "completed";
    at: string;
    device: string;
  }>;
  updated_at: string;
}

interface ProbationResponse {
  records: ProbationRecord[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

interface ProbationFilters {
  ownerId: string;
  monthKey: string;
  completed: string;
  from: string;
  to: string;
}

export function ProbationSection() {
  const [data, setData] = useState<ProbationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProbationFilters>({
    ownerId: "",
    monthKey: "",
    completed: "",
    from: "",
    to: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProbationRecord | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("offset", "0");
      if (filters.ownerId) params.set("ownerId", filters.ownerId);
      if (filters.monthKey) params.set("monthKey", filters.monthKey);
      if (filters.completed) params.set("completed", filters.completed);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const result = await authFetchJson<ProbationResponse>(`/api/admin/probation?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load probation records");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const hasActiveFilters = Object.values(filters).some(v => v !== "");
  const totalPages = data ? Math.ceil(data.pagination.total / data.pagination.limit) : 0;
  const currentPage = data ? Math.floor(data.pagination.offset / data.pagination.limit) + 1 : 1;

  if (loading && !data) {
    return (
      <div className="aio-card p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-aio-primary)] border-t-transparent mx-auto" />
        <p className="mt-3 text-[var(--color-aio-text-2)]">Loading probation records...</p>
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
              onClick={() => setFilters({ ownerId: "", monthKey: "", completed: "", from: "", to: "" })}
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
              placeholder="User ID (partial)"
              value={filters.ownerId}
              onChange={e => setFilters({ ...filters, ownerId: e.target.value })}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Month (YYYY-MM)"
              value={filters.monthKey}
              onChange={e => setFilters({ ...filters, monthKey: e.target.value })}
              className="input-field"
            />
            <select
              value={filters.completed}
              onChange={e => setFilters({ ...filters, completed: e.target.value })}
              className="input-field"
            >
              <option value="">All</option>
              <option value="true">Completed</option>
              <option value="false">Pending</option>
            </select>
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
        {data?.records.length === 0 ? (
          <div className="p-8 text-center text-[var(--color-aio-text-2)]">
            No probation records found.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-aio-line)]">
            {data!.records.map(record => (
              <ProbationRow key={`${record.owner_id}:${record.month_key}`} record={record} onClick={() => setSelectedRecord(record)} />
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
                className="px-3 py-1.5 rounded text-sm font-bold text-[var(--color-aio-text-2)] disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded text-sm font-bold text-[var(--color-aio-text-2)] disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedRecord && (
        <ProbationDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
}

function ProbationRow({ record, onClick }: { record: ProbationRecord; onClick: () => void }) {
  const isCompleted = !!record.completed_at;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full p-4 text-left hover:bg-[var(--color-aio-surface-2)] transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--color-aio-surface)]">
            <span className="text-xl">{isCompleted ? "✅" : "⏳"}</span>
          </div>
          <div>
            <p className="font-bold text-[var(--color-aio-text)]">{record.month_key}</p>
            <p className="text-sm text-[var(--color-aio-text-2)]">
              User: <span className="font-mono">{record.owner_id.slice(0, 8)}...</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            isCompleted ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
          }`}>
            {isCompleted ? "Completed" : "Pending"}
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--color-aio-surface-2)] text-[var(--color-aio-text-2)]">
            {record.device}
          </span>
          {record.verification_level && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-[var(--color-aio-primary)]/10 text-[var(--color-aio-primary)]">
              {record.verification_level}
            </span>
          )}
          <Eye size={16} className="text-[var(--color-aio-text-3)]" />
        </div>
      </div>
    </button>
  );
}

function ProbationDetailModal({ record, onClose }: { record: ProbationRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-[var(--color-aio-surface)] rounded-[20px] w-full max-w-2xl max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-aio-line)] sticky top-0 bg-[var(--color-aio-surface)]">
          <h2 className="text-[18px] font-black text-[var(--color-aio-text)]">Probation Check-In Detail</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-aio-surface-2)]">✕</button>
        </div>
        <div className="p-4 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Month" value={record.month_key} />
            <DetailField label="User ID" value={record.owner_id} />
            <DetailField label="Device" value={record.device} />
            <DetailField label="Status" value={record.completed_at ? "Completed" : "Pending"} />
            <DetailField label="Verification Level" value={record.verification_level || "—" } />
            <DetailField label="Started At" value={record.started_at ? format(new Date(record.started_at), "MMM d, yyyy HH:mm") : "—" } />
            <DetailField label="Completed At" value={record.completed_at ? format(new Date(record.completed_at), "MMM d, yyyy HH:mm") : "—" } />
            <DetailField label="Last Updated" value={format(new Date(record.updated_at), "MMM d, yyyy HH:mm") } />
          </div>

          {record.proof_name && (
            <div className="space-y-2">
              <h3 className="text-[14px] font-bold text-[var(--color-aio-text)]">Proof</h3>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-aio-surface-2)]">
                <Download size={20} className="text-[var(--color-aio-text-2)]" />
                <span className="text-sm text-[var(--color-aio-text)]">{record.proof_name}</span>
                {record.proof_data_url && (
                  <a
                    href={record.proof_data_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--color-aio-primary)] hover:underline"
                  >
                    View
                  </a>
                )}
              </div>
            </div>
          )}

          {record.provider_receipt_id && (
            <DetailField label="Provider Receipt ID" value={record.provider_receipt_id} />
          )}
          {record.confirmation_url && (
            <DetailField label="Confirmation URL" value={record.confirmation_url} />
          )}

          {record.events && record.events.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[14px] font-bold text-[var(--color-aio-text)]">Event Log</h3>
              <div className="max-h-48 overflow-auto space-y-1">
                {record.events.map((event, idx) => (
                  <div key={idx} className="text-sm p-2 rounded bg-[var(--color-aio-surface-2)]">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--color-aio-primary)]/10 text-[var(--color-aio-primary)]">
                        {event.type}
                      </span>
                      <span className="font-mono text-[var(--color-aio-text-3)] text-xs">
                        {format(new Date(event.at), "MMM d, HH:mm:ss")}
                      </span>
                      <span className="text-[var(--color-aio-text-2)]">on</span>
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--color-aio-surface)] text-[var(--color-aio-text-2)]">
                        {event.device}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--color-aio-surface-2)]">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-aio-text-2)]">{label}</p>
      <p className="text-sm font-medium text-[var(--color-aio-text)] break-all">{value}</p>
    </div>
  );
}