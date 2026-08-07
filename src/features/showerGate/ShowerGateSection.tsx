/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, CheckCircle2, Zap } from 'lucide-react';
import type { ShowerProof, BarcodePermissionStatus, ShowerProofSyncStatus } from './types';

export interface ShowerGateSectionProps {
  showerGateRequired: boolean;
  showerGateUnlocked: boolean;
  barcodeVerifiedForCycle: boolean;
  showerProofRequiredSatisfied: boolean;
  barcodeScanMessage: string;
  showerCycleLabel: string;
  showerHabitLoggedForCycle: boolean;
  showerProofForCycle?: ShowerProof;
  showerProofAttachmentForCycle: { name: string; dataUrl: string } | null;
  showerProofInputKey: number;
  showerProofSyncMessage: string;
  showerProofSyncStatus: ShowerProofSyncStatus;
  showerProofBackendFolder: string;
  barcodeScannerActive: boolean;
  barcodePermissionStatus: BarcodePermissionStatus;
  barcodeTorchOn: boolean;
  barcodeTorchAvailable: boolean;
  barcodeVideoRef: React.RefObject<HTMLVideoElement | null>;
  handleShowerProofFile: (files: FileList | null) => void;
  handleConfirmDailyShower: () => void;
  stopBarcodeScanner: () => void;
  startBarcodeScanner: () => void;
  toggleBarcodeTorch: () => void;
}

export default function ShowerGateSection({
  showerGateRequired,
  showerGateUnlocked,
  barcodeVerifiedForCycle,
  showerProofRequiredSatisfied,
  barcodeScanMessage,
  showerCycleLabel,
  showerHabitLoggedForCycle,
  showerProofForCycle,
  showerProofAttachmentForCycle,
  showerProofInputKey,
  showerProofSyncMessage,
  showerProofSyncStatus,
  showerProofBackendFolder,
  barcodeScannerActive,
  barcodePermissionStatus,
  barcodeTorchOn,
  barcodeTorchAvailable,
  barcodeVideoRef,
  handleShowerProofFile,
  handleConfirmDailyShower,
  stopBarcodeScanner,
  startBarcodeScanner,
  toggleBarcodeTorch,
}: ShowerGateSectionProps) {
  if (!showerGateRequired || showerGateUnlocked) return null;

  return (
    <section
      id="mandatory-shower-habit"
      className={`rounded-[8px] border-2 p-5 ${
        barcodeVerifiedForCycle && showerProofRequiredSatisfied
          ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'
          : barcodeScanMessage === 'Incorrect product barcode.'
            ? 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100'
            : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-widest">Mandatory Habit</p>
          <h3 className="mt-1 text-4xl font-black leading-none">Shower before jobs</h3>
          <p className="mt-2 text-sm font-bold opacity-80">
            This locks job navigation, ride mode, review, and completion until proof is attached and confirmed. It resets at 6:00 AM every day.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-black uppercase">
            <span className="rounded-[8px] bg-white/70 px-3 py-2 text-slate-800 dark:bg-black/20 dark:text-white">
              Cycle {showerCycleLabel}
            </span>
            <span className="rounded-[8px] bg-white/70 px-3 py-2 text-slate-800 dark:bg-black/20 dark:text-white">
              {showerHabitLoggedForCycle ? 'Habit logged' : 'Habit open'}
            </span>
            {showerProofForCycle && (
              <span className="rounded-[8px] bg-white/70 px-3 py-2 text-slate-800 dark:bg-black/20 dark:text-white">
                Proof: {showerProofAttachmentForCycle?.name || showerProofForCycle.proofName}
              </span>
            )}
            <span className="rounded-[8px] bg-white/70 px-3 py-2 text-slate-800 dark:bg-black/20 dark:text-white">
              Product barcode {barcodeVerifiedForCycle ? 'verified' : 'required'}
            </span>
            <span className="rounded-[8px] bg-white/70 px-3 py-2 text-slate-800 dark:bg-black/20 dark:text-white">
              {showerProofRequiredSatisfied ? 'Ready to confirm' : 'Proof missing'}
            </span>
          </div>
        </div>

        <div className="grid w-full gap-2 lg:max-w-md">
          <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-[8px] border-2 border-current/20 bg-white/70 px-4 text-sm font-black uppercase text-slate-800 shadow-sm dark:bg-black/20 dark:text-white">
            <Camera size={20} />
            <span>{showerProofAttachmentForCycle?.name || 'Attach Shower Proof'}</span>
            <input
              key={`shower-proof-habits-${showerProofInputKey}`}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => handleShowerProofFile(event.target.files)}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={handleConfirmDailyShower}
            disabled={!barcodeVerifiedForCycle || !showerProofRequiredSatisfied}
            className="flex min-h-14 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-4 text-lg font-black uppercase text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:bg-white dark:text-slate-950 dark:disabled:bg-white/10 dark:disabled:text-slate-500"
          >
            <CheckCircle2 size={22} />
            <span>Confirm Shower</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={barcodeScannerActive ? stopBarcodeScanner : startBarcodeScanner}
              disabled={barcodePermissionStatus === 'requesting'}
              className={`flex items-center justify-center gap-2 rounded-[8px] bg-blue-700 px-4 text-sm font-black uppercase text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 ${barcodeVerifiedForCycle ? 'min-h-10 opacity-80' : 'min-h-12'}`}
            >
              <Camera size={18} />
              <span>{barcodeScannerActive ? 'Stop Scan' : barcodePermissionStatus === 'requesting' ? 'Requesting' : barcodeVerifiedForCycle ? 'Scan Again' : 'Scan Barcode'}</span>
            </button>
            <button
              type="button"
              onClick={toggleBarcodeTorch}
              disabled={!barcodeScannerActive || !barcodeTorchAvailable}
              className="flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-4 text-sm font-black uppercase text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:bg-white dark:text-slate-950 dark:disabled:bg-white/10 dark:disabled:text-slate-500"
            >
              <Zap size={18} />
              <span>{barcodeTorchOn ? 'Flash Off' : 'Flash'}</span>
            </button>
          </div>
          <video
            ref={barcodeVideoRef}
            className={`aspect-video w-full rounded-[8px] border border-current/20 bg-slate-950 object-cover ${barcodeScannerActive ? 'block' : 'hidden'}`}
            playsInline
            muted
          />
          <p className={`text-sm font-black ${barcodeVerifiedForCycle ? 'text-emerald-700 dark:text-emerald-200' : barcodeScanMessage === 'Incorrect product barcode.' ? 'text-rose-700 dark:text-rose-200' : ''}`}>
            {barcodeVerifiedForCycle ? '✓ Product verified. Barcode ending in 3233.' : barcodeScanMessage}
          </p>
          {(barcodePermissionStatus === 'denied' || barcodePermissionStatus === 'unsupported' || barcodePermissionStatus === 'error') && (
            <p className="text-xs font-bold opacity-80">
              Camera status: {barcodePermissionStatus}. You can retry scanning after camera access is available.
            </p>
          )}
          {showerProofSyncMessage && (
            <p className={`text-xs font-black ${
              showerProofSyncStatus === 'error'
                ? 'text-rose-700 dark:text-rose-200'
                : showerProofSyncStatus === 'saved'
                  ? 'text-emerald-700 dark:text-emerald-200'
                  : 'text-slate-700 dark:text-slate-200'
            }`}>
              {showerProofSyncMessage}
            </p>
          )}
          {(showerProofBackendFolder || showerProofForCycle?.backendFolderPath) && (
            <p className="text-xs font-bold opacity-75">
              Backend folder: {showerProofBackendFolder || showerProofForCycle?.backendFolderPath}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
