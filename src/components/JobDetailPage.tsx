/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JobDetailPage
 *
 * A full-screen job details page that reuses the shared JobCard component.
 * Rendered at /job/:jobId via ProtectedApp routing.
 * Reads jobs and shower gate status from localStorage for direct URL access.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Navigation, MapPin, Lock, ExternalLink } from 'lucide-react';
import JobCard from './JobCard';
import { Job } from '../types';
import { normalizeJobsForStorage } from '../utils/jobState';
import { getCurrentCycleId } from '../utils/showerCycle';

const STORAGE_KEY_JOBS = 'route_optimizer_jobs';
const STORAGE_KEY_SHOWER = 'daily_shower_gate_proofs';
const REQUIRED_BARCODE = '075371003233';

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function loadJobs(): Job[] {
  const raw = safeGetItem(STORAGE_KEY_JOBS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return normalizeJobsForStorage(parsed);
  } catch {
    return [];
  }
}

function loadShowerGateUnlocked(): boolean {
  const raw = safeGetItem(STORAGE_KEY_SHOWER);
  if (!raw) return false;
  try {
    const proofs = JSON.parse(raw);
    const cycleKey = getCurrentCycleId(new Date());
    const proof = proofs.find((p: any) => p.cycleKey === cycleKey);
    if (!proof) return false;
    return Boolean(
      proof.showerConfirmed &&
      proof.showerConfirmedAt &&
      proof.scannedBarcode === REQUIRED_BARCODE &&
      (!proof.uploadStatus || proof.uploadStatus === 'saved') &&
      (!proof.verificationStatus || proof.verificationStatus === 'verified')
    );
  } catch {
    return false;
  }
}

function getJobTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    retail_audit: 'Retail Audit',
    merchandising: 'Merchandising',
    mystery_shop: 'Mystery Shop',
    field_task: 'Field Task',
    process_serve: 'Process Serve',
  };
  return labels[type] || type;
}

function getStatusBadge(status: string, isCompleted?: boolean) {
  if (isCompleted || status === 'completed') {
    return { label: 'DONE', className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' };
  }
  if (status === 'under_review') {
    return { label: 'UNDER REVIEW', className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400' };
  }
  if (status === 'revisit') {
    return { label: 'REVISION', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400' };
  }
  if (status === 'postponed') {
    return { label: 'TOMORROW', className: 'bg-slate-100 text-slate-800 dark:bg-slate-950/40 dark:text-slate-400' };
  }
  return { label: 'READY', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' };
}

interface JobDetailPageProps {
  jobId: string;
  onBack: () => void;
}

export default function JobDetailPage({ jobId, onBack }: JobDetailPageProps) {
  const [jobs, setJobs] = useState<Job[]>(() => loadJobs());
  const [showerGateUnlocked, setShowerGateUnlocked] = useState(() => loadShowerGateUnlocked());
  const [editModalJob, setEditModalJob] = useState<Job | null>(null);

  const job = useMemo(() => jobs.find(j => j.id === jobId) || null, [jobs, jobId]);

  const routePosition = useMemo(() => {
    if (!job) return null;
    const routeAJobs = jobs.filter(j => j.routeId === 'A');
    const idx = routeAJobs.findIndex(j => j.id === job.id);
    return idx >= 0 ? idx + 1 : null;
  }, [job, jobs]);

  const navLink = useMemo(() => {
    if (!job?.coordinates) return null;
    const encoded = encodeURIComponent(job.address || `${job.coordinates.lat},${job.coordinates.lng}`);
    return {
      apple: `https://maps.apple.com/?daddr=${encoded}`,
      google: `https://www.google.com/maps/dir/?api=1&destination=${job.coordinates.lat},${job.coordinates.lng}&travelmode=bicycling`,
    };
  }, [job]);

  const hasValidCoords = Boolean(
    job?.coordinates &&
    typeof job.coordinates.lat === 'number' &&
    typeof job.coordinates.lng === 'number' &&
    (job.coordinates.lat !== 0 || job.coordinates.lng !== 0)
  );

  useEffect(() => {
    const handler = () => {
      setShowerGateUnlocked(loadShowerGateUnlocked());
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const handleSaveJob = (updatedJob: Job) => {
    setJobs(prev => {
      const next = prev.map(j => j.id === updatedJob.id ? updatedJob : j);
      const normalized = normalizeJobsForStorage(next);
      try {
        localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(normalized));
      } catch { /* storage unavailable */ }
      return normalized;
    });
    setEditModalJob(null);
  };

  const handleDeleteJob = (id: string) => {
    setJobs(prev => {
      const next = prev.filter(j => j.id !== id);
      const normalized = normalizeJobsForStorage(next);
      try {
        localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(normalized));
      } catch { /* storage unavailable */ }
      return normalized;
    });
    onBack();
  };

  const handleToggleComplete = (id: string) => {
    setJobs(prev => {
      const next = prev.map(j => {
        if (j.id !== id) return j;
        const isDone = j.status === 'completed' || j.isCompleted === true;
        return {
          ...j,
          status: (isDone ? 'ready' : 'completed') as Job['status'],
          isCompleted: !isDone,
          isRevisionRequired: false,
          revisionStatus: isDone ? undefined : 'Approved',
        };
      });
      const normalized = normalizeJobsForStorage(next);
      try {
        localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(normalized));
      } catch { /* storage unavailable */ }
      return normalized;
    });
  };

  const handleDuplicateJob = (original: Job) => {
    const duplicate: Job = {
      ...original,
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      storeName: `${original.storeName} (Copy)`,
      status: 'ready',
      isCompleted: false,
      isRevisionRequired: false,
    };
    setJobs(prev => {
      const next = [...prev, duplicate];
      const normalized = normalizeJobsForStorage(next);
      try {
        localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(normalized));
      } catch { /* storage unavailable */ }
      return normalized;
    });
  };

  const handleToggleRoute = (id: string) => {
    setJobs(prev => {
      const next = prev.map(j =>
        j.id === id ? { ...j, routeId: (j.routeId === 'A' ? 'B' : 'A') as 'A' | 'B' } : j
      );
      const normalized = normalizeJobsForStorage(next);
      try {
        localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(normalized));
      } catch { /* storage unavailable */ }
      return normalized;
    });
  };

  const handleUpdateStatus = (id: string, updates: Partial<Job>) => {
    setJobs(prev => {
      const next = prev.map(j => j.id === id ? { ...j, ...updates } : j);
      const normalized = normalizeJobsForStorage(next);
      try {
        localStorage.setItem(STORAGE_KEY_JOBS, JSON.stringify(normalized));
      } catch { /* storage unavailable */ }
      return normalized;
    });
  };

  if (!job) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0A0A0A] px-6 text-center">
        <div className="max-w-sm space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <MapPin size={28} className="text-slate-500" />
          </div>
          <h1 className="text-2xl font-black text-white">Job Not Found</h1>
          <p className="text-sm font-bold text-slate-400">
            This job does not exist or may have been removed.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-black uppercase text-white transition hover:bg-indigo-500"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(job.status, job.isCompleted);

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A0A0A]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-3 safe-area-top">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15"
            aria-label="Go back to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black text-white">
              {job.storeName}
            </h1>
            <div className="flex items-center gap-2">
              {routePosition !== null && (
                <span className="text-[10px] font-black uppercase text-indigo-400">
                  Stop {routePosition}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 safe-area-bottom">
        <div className="mx-auto max-w-lg space-y-4">
          {/* Quick info bar */}
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-300">
                <MapPin size={13} className="shrink-0 text-indigo-400" />
                <span className="truncate">{job.address}</span>
              </div>
              {job.dueTime && (
                <p className="text-xs font-bold text-slate-500">Due by {job.dueTime}</p>
              )}
              {job.deadline && (
                <p className="text-xs font-bold text-slate-500">Deadline: {job.deadline}</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-400">
                ${job.pay.toFixed(2)}
              </span>
              <p className="text-[10px] font-black uppercase text-slate-500">Pay</p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] font-black uppercase text-slate-500">Type</p>
              <p className="mt-1 text-sm font-black text-white">{getJobTypeLabel(job.jobType)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] font-black uppercase text-slate-500">Est. Time</p>
              <p className="mt-1 text-sm font-black text-white">{job.estimatedMinutes} mins</p>
            </div>
            {job.priority && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] font-black uppercase text-slate-500">Priority</p>
                <p className="mt-1 text-sm font-black text-white capitalize">{job.priority}</p>
              </div>
            )}
            {job.revisionStatus && job.revisionStatus !== 'None' && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] font-black uppercase text-slate-500">Revision</p>
                <p className="mt-1 text-sm font-black text-white">{job.revisionStatus}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {job.notes && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-black uppercase text-slate-500">Notes</p>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-300">
                &ldquo;{job.notes}&rdquo;
              </p>
            </div>
          )}

          {/* Smart merge explanation */}
          {job.smartMergeExplanation && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
              <p className="text-xs font-bold text-blue-300">{job.smartMergeExplanation}</p>
            </div>
          )}

          {/* Process serve details */}
          {job.jobType === 'process_serve' && job.processServe && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-[10px] font-black uppercase text-red-400">Process Serve</p>
              <div className="mt-2 space-y-1 text-sm font-bold text-red-200">
                {job.processServe.company && <p>{job.processServe.company}</p>}
                {job.processServe.caseNumber && <p>Case: {job.processServe.caseNumber}</p>}
                {job.processServe.partyName && <p>Party: {job.processServe.partyName}</p>}
                {job.processServe.attemptStatus && (
                  <p className="text-xs uppercase text-red-300">
                    {job.processServe.attemptStatus.replaceAll('_', ' ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Navigation</p>
            {hasValidCoords ? (
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={navLink?.apple || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-black uppercase text-white transition hover:bg-white/15"
                >
                  <ExternalLink size={14} />
                  Apple Maps
                </a>
                <a
                  href={navLink?.google || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-black uppercase text-white transition hover:bg-emerald-500"
                >
                  <Navigation size={14} />
                  Google Maps
                </a>
              </div>
            ) : (
              <div className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white/5 text-sm font-bold text-slate-500">
                <Lock size={14} />
                Location unavailable
              </div>
            )}
          </div>

          {/* JobCard */}
          <div className="mt-6">
            <p className="mb-3 text-[10px] font-black uppercase text-slate-500">Full Job Card</p>
            <JobCard
              job={job}
              isOutlier={job.status === 'outlier'}
              onToggleComplete={handleToggleComplete}
              onEdit={setEditModalJob}
              onDelete={handleDeleteJob}
              onDuplicate={handleDuplicateJob}
              onToggleRoute={handleToggleRoute}
              onUpdateStatus={handleUpdateStatus}
              jobAccessLocked={!showerGateUnlocked}
            />
          </div>

          {showerGateUnlocked ? null : (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <Lock size={16} className="shrink-0 text-amber-400" />
              <p className="text-xs font-bold text-amber-300">
                Shower verification required to complete actions. Details are view-only.
              </p>
            </div>
          )}

          {/* Spacer for safe area */}
          <div className="h-8" />
        </div>
      </main>

      {/* Inline edit modal (lightweight) */}
      {editModalJob && (
        <JobEditOverlay
          job={editModalJob}
          onSave={handleSaveJob}
          onClose={() => setEditModalJob(null)}
        />
      )}
    </div>
  );
}

function JobEditOverlay({
  job,
  onSave,
  onClose,
}: {
  job: Job;
  onSave: (job: Job) => void;
  onClose: () => void;
}) {
  const [storeName, setStoreName] = useState(job.storeName);
  const [address, setAddress] = useState(job.address);
  const [pay, setPay] = useState(String(job.pay));
  const [estimatedMinutes, setEstimatedMinutes] = useState(String(job.estimatedMinutes));
  const [dueTime, setDueTime] = useState(job.dueTime);
  const [notes, setNotes] = useState(job.notes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...job,
      storeName: storeName.trim() || job.storeName,
      address: address.trim() || job.address,
      pay: parseFloat(pay) || job.pay,
      estimatedMinutes: parseInt(estimatedMinutes, 10) || job.estimatedMinutes,
      dueTime,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#111214] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-black uppercase text-white">Edit Job</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <label className="block">
            <span className="text-[10px] font-black uppercase text-slate-500">Store Name</span>
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase text-slate-500">Address</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-black uppercase text-slate-500">Pay ($)</span>
              <input
                type="number"
                step="0.01"
                value={pay}
                onChange={(e) => setPay(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase text-slate-500">Est. Mins</span>
              <input
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] font-black uppercase text-slate-500">Due Time</span>
            <input
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase text-slate-500">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-indigo-500"
            />
          </label>
        </div>
        <div className="flex gap-2 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-black uppercase text-slate-400 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black uppercase text-white hover:bg-indigo-500"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
