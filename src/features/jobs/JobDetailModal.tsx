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

function buildGoogleMapsUrl(address: string, mode: TravelMode): string {
  const encoded = encodeURIComponent(address);
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=${mode}`;
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

  const mapsUrl = buildGoogleMapsUrl(job.address, travelMode);
  const travelTime = estimateTravelTime(legDistance, travelMode);

  const modalContent = (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-3 backdrop-blur-[6px] [-webkit-backdrop-filter:blur(6px)] transition-opacity duration-200 ease-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Job details for ${job.storeName}`}
    >
      <div
        onClick={handlePanelClick}
        className={`flex w-full max-w-[430px] flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-[#111214]/[0.80] shadow-2xl backdrop-blur-[14px] [-webkit-backdrop-filter:blur(14px)] transition-all duration-200 ease-out ${isOpen ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0'}`}
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-400 transition hover:bg-white/15 hover:text-white"
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
              <div className="flex items-center justify-center gap-2 text-emerald-400 px-4">
                <span className="text-lg font-black text-emerald-300">
                  {formatTravelTime(travelTime)}
                </span>
                <span className="text-sm font-semibold text-slate-500">
                  {travelMode === 'driving' ? 'drive' : travelMode === 'bicycling' ? 'bike' : 'walk'}
                </span>
                <span className="text-sm font-semibold text-slate-500">
                  · {legDistance.toFixed(1)} mi
                </span>
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
              <h2 className="text-lg font-medium text-slate-400 leading-tight break-words uppercase tracking-wide">
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
                      ? 'bg-white/15 text-white'
                      : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-300'
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

        {/* Fixed sticky footer - Navigate button */}
        <div className="flex shrink-0 items-center gap-2 border-t border-white/10 px-4 py-4 pb-6">
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
