/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JobDetailModal
 *
 * A focused mini page / bottom-sheet modal optimized for phone screens.
 * Shows job title, photo/logo, address, and navigation button.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Image, Car, Bike, Footprints } from 'lucide-react';
import type { Job } from '../../types';
import { resolveStoreLogo } from '../../services/storeLogos';

interface JobDetailModalProps {
  job: Job;
  routeIndex: number | null;
  legDistance: number;
  rideMinutes: number;
  navLink: string;
  isOutlier: boolean;
  jobAccessLocked: boolean;
  onToggleComplete: (id: string) => void;
  onEdit: (job: Job) => void;
  onDelete: (id: string) => void;
  onDuplicate: (job: Job) => void;
  onToggleRoute: (id: string) => void;
  onUpdateStatus?: (id: string, updates: Partial<Job>) => void;
  onOpenScan?: (jobId: string) => void;
  onOpenPreviewGuide?: (jobId: string) => void;
  onOpenInventory?: (jobId: string) => void;
  transitOrigin?: { latitude: number; longitude: number };
  onMoveToDay?: (job: Job) => void;
  onCheckInJob?: (id: string) => any;
  onMarkJobReadyToStart?: (id: string) => any;
  onBlockJobBeforeStart?: (id: string, note: string) => any;
  onStartJob?: (id: string) => any;
  onPauseJobWork?: (id: string, note?: string) => any;
  onResumeJobWork?: (id: string) => any;
  onAwaitJobSupport?: (id: string, note: string) => any;
  onMarkJobBlockedOnsite?: (id: string, note: string) => any;
  onEndJobVisit?: (id: string, reason: any, note?: string) => any;
  onMarkJobWorkComplete?: (id: string) => any;
  onCompleteJobCloseout?: (id: string) => any;
  onReopenCompletedJob?: (id: string, reason: string) => any;
  procedureCatalog?: any;
  proofRecords?: any[];
  onAssignProcedure?: any;
  onCaptureProcedureProof?: any;
  onRecordInventoryForRequirement?: any;
  onSatisfyCloseoutRequirements?: (id: string) => void;
  onClose: () => void;
}

function JobLogo({ job }: { job: Job }) {
  const match = resolveStoreLogo({ companyId: null, texts: [job.storeName, job.notes] });
  const [failed, setFailed] = useState(false);

  if (!match || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white/5 rounded-xl">
        <Image size={32} className="text-slate-500" />
      </div>
    );
  }

  return (
    <img
      src={match.logoPath}
      alt={`${match.displayName} logo`}
      className="h-full w-full object-contain p-2"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

function buildGoogleMapsUrl(job: Job, mode: TravelMode, navLink: string, origin?: { latitude: number; longitude: number }): string {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  // Keep the same route endpoints used by the dashboard and distance estimate.
  try {
    const planned = new URL(navLink);
    if (planned.protocol === 'https:' && planned.hostname === 'www.google.com' && planned.pathname === '/maps/dir/') {
      for (const key of ['origin', 'destination']) {
        const value = planned.searchParams.get(key);
        if (value) url.searchParams.set(key, value);
      }
    }
  } catch { /* Older callers can omit the planned link. */ }
  if (!url.searchParams.has('origin') && origin) {
    url.searchParams.set('origin', `${origin.latitude},${origin.longitude}`);
  }
  if (!url.searchParams.has('destination')) {
    url.searchParams.set('destination', `${job.coordinates.lat},${job.coordinates.lng}`);
  }
  url.searchParams.set('travelmode', mode);
  return url.toString();
}

type TravelMode = 'driving' | 'bicycling' | 'walking';

function estimateTravelTime(distanceMiles: number, mode: TravelMode): number {
  if (distanceMiles <= 0) return 0;
  const speeds = { driving: 25, bicycling: 10, walking: 3 };
  const hours = distanceMiles / speeds[mode];
  return Math.round(hours * 60);
}

function formatTravelTime(minutes: number): string {
  if (minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

const TRAVEL_MODES: Array<{ value: TravelMode; label: string; icon: React.ReactNode }> = [
  { value: 'driving', label: 'Drive', icon: <Car size={16} /> },
  { value: 'bicycling', label: 'Bike', icon: <Bike size={16} /> },
  { value: 'walking', label: 'Walk', icon: <Footprints size={16} /> },
];

export default function JobDetailModal({
  job,
  routeIndex,
  legDistance,
  rideMinutes,
  navLink,
  isOutlier,
  jobAccessLocked,
  onToggleComplete,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleRoute,
  onUpdateStatus,
  onOpenScan,
  onOpenPreviewGuide,
  onOpenInventory,
  transitOrigin,
  onMoveToDay,
  onCheckInJob,
  onMarkJobReadyToStart,
  onBlockJobBeforeStart,
  onStartJob,
  onPauseJobWork,
  onResumeJobWork,
  onAwaitJobSupport,
  onMarkJobBlockedOnsite,
  onEndJobVisit,
  onMarkJobWorkComplete,
  onCompleteJobCloseout,
  onReopenCompletedJob,
  procedureCatalog,
  proofRecords,
  onAssignProcedure,
  onCaptureProcedureProof,
  onRecordInventoryForRequirement,
  onSatisfyCloseoutRequirements,
  onClose,
}: JobDetailModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    requestAnimationFrame(() => setIsOpen(true));
    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
      setIsOpen(false);
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  const handlePanelClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const mapsUrl = buildGoogleMapsUrl(job, travelMode, navLink, transitOrigin);
  const travelTime = estimateTravelTime(legDistance, travelMode);

  const modalContent = (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-[#080512]/25 p-3 backdrop-blur-[3px] [-webkit-backdrop-filter:blur(3px)] transition-opacity duration-200 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Job details for ${job.storeName}`}
    >
      <div
        onClick={handlePanelClick}
        className={`job-detail-glass flex w-full max-w-[430px] flex-col overflow-hidden rounded-[24px] border border-white/20 text-white transition-all duration-200 ease-out ${isOpen ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0'}`}
        style={{ maxHeight: 'min(90dvh, 720px)' }}
      >
        {/* Compact sticky header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
          {routeIndex !== null && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-black text-white">
              {routeIndex + 1}
            </span>
          )}
          <div className="min-w-0 flex-1" />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/15 hover:text-white"
            aria-label="Close job details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content - REARRANGED: Address first, then logo, then title, then travel */}
        <div
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-6"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="space-y-4">

            {/* ADDRESS - MOVED TO TOP, LARGER */}
            <div className="flex items-center justify-center gap-2 text-slate-400 px-2">
              <MapPin size={22} className="shrink-0 text-emerald-400" />
              <p className="text-xl font-black text-white text-center break-words leading-snug">
                {job.address}
              </p>
            </div>

            {/* Travel time/distance - right under address */}
            {legDistance > 0 && (
              <div className="space-y-1 text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-400 px-4">
                <span className="text-lg font-black text-emerald-300">
                  ~{formatTravelTime(travelTime)}
                </span>
                <span className="text-sm font-semibold text-white/60">
                  {travelMode === 'driving' ? 'drive' : travelMode === 'bicycling' ? 'bike' : 'walk'}
                </span>
                <span className="text-sm font-semibold text-white/60">
                  · {legDistance.toFixed(1)} mi
                </span>
              </div>
              <p className="text-xs leading-relaxed text-white/60">Straight-line estimate. Maps calculates the actual route.</p>
              </div>
            )}

            {/* Job Logo/Photo - smaller, below address */}
            <div className="flex items-center justify-center">
              <div className="relative h-28 w-28 rounded-xl bg-white/5 overflow-hidden border border-white/10">
                <JobLogo job={job} />
              </div>
            </div>

            {/* Job Title - smaller, below logo */}
            <div className="text-center">
              <h2 className="text-lg font-medium text-white/70 leading-tight break-words uppercase tracking-wide">
                {job.storeName}
              </h2>
            </div>

            {/* Travel mode selector */}
            <div className="flex items-center justify-center gap-1 px-4 pt-2">
              {TRAVEL_MODES.map(mode => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setTravelMode(mode.value)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black uppercase transition ${
                    travelMode === mode.value
                      ? 'bg-violet-400/25 text-white ring-1 ring-violet-300/30'
                      : 'text-white/60 hover:bg-white/[0.06] hover:text-white/90'
                  }`}
                  aria-pressed={travelMode === mode.value}
                >
                  {mode.icon}
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Keep job tools and navigation visible on short screens. */}
        <div className="shrink-0 space-y-3 border-t border-white/10 px-4 py-3 pb-4">
            {(onOpenPreviewGuide || onOpenScan || onOpenInventory) && (
              <div className="grid grid-cols-3 gap-2 pt-2" aria-label="Job tools">
                {[
                  { label: 'Preview Guide', action: onOpenPreviewGuide },
                  { label: 'Scan', action: onOpenScan },
                  { label: 'Inventory', action: onOpenInventory },
                ].filter(tool => tool.action).map(tool => (
                  <button key={tool.label} type="button" disabled={jobAccessLocked}
                    onClick={() => tool.action?.(job.id)}
                    className="min-h-12 rounded-xl border border-violet-200/15 bg-violet-300/10 px-2 text-xs font-bold text-white transition hover:bg-violet-300/20 disabled:opacity-40">
                    {tool.label}
                  </button>
                ))}
              </div>
            )}
          <a
            href={jobAccessLocked ? undefined : mapsUrl}
            aria-disabled={jobAccessLocked}
            onClick={(event) => { if (jobAccessLocked) event.preventDefault(); }}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-black uppercase text-white transition hover:bg-emerald-500 active:scale-[0.98]"
            aria-label={`Navigate to ${job.storeName} at ${job.address} by ${travelMode}`}
          >
            <MapPin size={20} />
            <span>{jobAccessLocked ? 'Check-in required' : 'Navigate'}</span>
          </a>
        </div>
      </div>
    </div>
  );

  return createPortal(<>{modalContent}</>, document.body);
}
