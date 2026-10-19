/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MoveToDaySheet
 *
 * Bottom sheet (mobile) / modal (desktop) for rescheduling a job to another
 * day. Dates are validated YYYY-MM-DD in America/Los_Angeles; past dates are
 * disallowed. Moving to a future day places the job on standby (Route B);
 * moving to today reactivates it (Route A).
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarX2, Check, X } from 'lucide-react';
import type { Job } from '../../types';
import { addDays, formatScheduledDate, isValidScheduledDate, SCHEDULE_MAX_DAYS_AHEAD } from './jobSchedule';

interface MoveToDaySheetProps {
  job: Job | null;
  today: string;
  onMove: (id: string, date: string | null) => void;
  onClose: () => void;
}

type SaveState = 'idle' | 'saving' | 'error';

export function MoveToDaySheet({ job, today, onMove, onClose }: MoveToDaySheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [chosenDate, setChosenDate] = useState<string>('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (job) {
      setChosenDate(job.scheduledDate && isValidScheduledDate(job.scheduledDate) ? job.scheduledDate : '');
      setSaveState('idle');
      setErrorMessage('');
    }
  }, [job]);

  useEffect(() => {
    if (!job) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener('keydown', handler);
  }, [job, onClose]);

  if (!job) return null;

  const tomorrow = addDays(today, 1);
  const maxDate = addDays(today, SCHEDULE_MAX_DAYS_AHEAD);
  const validChosen = chosenDate && isValidScheduledDate(chosenDate) && chosenDate >= today && chosenDate <= maxDate;
  const targetLabel = validChosen ? formatScheduledDate(chosenDate) : '';

  const commit = (date: string | null) => {
    setSaveState('saving');
    setErrorMessage('');
    window.setTimeout(() => {
      try {
        onMove(job.id, date);
      } catch {
        setSaveState('error');
        setErrorMessage("Couldn't save the change. Check storage space and try again.");
      }
    }, 250);
  };

  const sheet = (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Move ${job.storeName} to another day`}
        className="w-full max-w-md rounded-t-[16px] border-4 border-slate-950 bg-white p-5 shadow-2xl dark:border-white dark:bg-[#17181b] sm:rounded-[16px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">
              Move to a day
            </p>
            <h3 className="mt-0.5 truncate text-2xl font-black text-slate-950 dark:text-white">
              {job.storeName}
            </h3>
            <p className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              {job.scheduledDate && isValidScheduledDate(job.scheduledDate)
                ? `Scheduled now: ${formatScheduledDate(job.scheduledDate)}`
                : 'Not scheduled to a day yet.'}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[8px] bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={saveState === 'saving'}
            onClick={() => commit(today)}
            className="rounded-[8px] bg-emerald-600 px-3 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            Move to Today
            <span className="block text-[10px] font-bold opacity-80">{formatScheduledDate(today)}</span>
          </button>
          <button
            type="button"
            disabled={saveState === 'saving'}
            onClick={() => commit(tomorrow)}
            className="rounded-[8px] bg-blue-700 px-3 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            Move to Tomorrow
            <span className="block text-[10px] font-bold opacity-80">{formatScheduledDate(tomorrow)}</span>
          </button>
        </div>

        <div className="mt-3">
          <label htmlFor="move-to-day-date" className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
            Choose a date
          </label>
          <input
            id="move-to-day-date"
            type="date"
            min={today}
            max={maxDate}
            value={chosenDate}
            onChange={(event) => setChosenDate(event.target.value)}
            className="road-input mt-1 w-full rounded-[8px] border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        <button
          type="button"
          disabled={!validChosen || saveState === 'saving'}
          onClick={() => validChosen && commit(chosenDate)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-4 py-3 text-base font-black uppercase text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:bg-white dark:text-slate-950 dark:disabled:bg-white/10 dark:disabled:text-slate-500"
        >
          {saveState === 'saving' ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Check size={18} />
          )}
          {validChosen ? `Move to ${targetLabel}` : 'Choose a date'}
        </button>

        {saveState === 'error' && (
          <p className="mt-2 rounded-[8px] bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
            {errorMessage}
          </p>
        )}

        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-white/10">
          <button
            type="button"
            disabled={saveState === 'saving'}
            onClick={() => commit(null)}
            className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <CalendarX2 size={13} />
            Remove scheduled date
          </button>
        </div>

        <p className="mt-3 text-[10px] font-bold text-slate-400 dark:text-slate-500">
          Proof, notes, and job history stay with the job. It moves — it is not duplicated.
        </p>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
