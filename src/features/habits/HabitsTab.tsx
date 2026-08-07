/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HabitsTab
 *
 * Presentational Habits tab UI.
 * All state, effects, handlers, and backend sync live in `useHabits.ts`.
 * Receives data and callbacks via props from `App.tsx`.
 */

import React from 'react';
import { Camera, CheckCircle2, Plus, Zap } from 'lucide-react';
import type { HabitTask, HabitLog } from './types';
import type { ShowerProof, BarcodePermissionStatus, ShowerProofSyncStatus } from '../showerGate/types';
import ShowerGateSection from '../showerGate/ShowerGateSection';

type HabitSyncStatus = 'loading' | 'synced' | 'offline' | 'saving';

export interface HabitsTabProps {
  /* ── Core habit data ── */
  habitGoalComplete: boolean;
  todayHabitMinutes: number;
  habitTargetMinutes: number;
  habitSyncStatus: HabitSyncStatus;

  habitTasks: HabitTask[];
  habitLogs: HabitLog[];
  activeHabitTask: HabitTask;

  todayKey: string;
  habitTasksHitToday: number;
  allHabitMinutesToday: number;

  /* ── Quick-add inputs ── */
  todayHabitTaskName: string;
  todayHabitTaskMinutes: number;
  todayHabitTaskNote: string;

  /* ── Active task inputs ── */
  habitTaskName: string;
  habitLogMinutes: number;
  habitLogNote: string;

  /* ── Derived stats ── */
  habitStreakDays: number;
  habitConsistencyPct: number;
  habitDaysComplete: number;
  habitTotalMinutes: number;
  habitTotalSessions: number;
  habitLast7Days: { key: string; label: string; minutes: number; complete: boolean }[];
  habitRecentLogs: HabitLog[];

  /* ── Shower gate data ── */
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

  /* ── Barcode scanner state ── */
  barcodeScannerActive: boolean;
  barcodePermissionStatus: BarcodePermissionStatus;
  barcodeTorchOn: boolean;
  barcodeTorchAvailable: boolean;
  barcodeVideoRef: React.RefObject<HTMLVideoElement | null>;

  /* ── Callbacks ── */
  setActiveHabitTaskId: (id: string) => void;
  updateActiveHabitTask: (updates: Partial<Pick<HabitTask, 'name' | 'targetMinutes' | 'lastMinutes'>>) => void;
  setHabitLogNote: (note: string) => void;
  setTodayHabitTaskName: (name: string) => void;
  setTodayHabitTaskMinutes: (minutes: number) => void;
  setTodayHabitTaskNote: (note: string) => void;
  handleAddHabitTask: () => void;
  handleAddTodayHabitTask: () => void;
  handleLogHabitSession: () => void;
  handleDeleteHabitLog: (id: string) => void;
  handleShowerProofFile: (files: FileList | null) => void;
  handleConfirmDailyShower: () => void;
  stopBarcodeScanner: () => void;
  startBarcodeScanner: () => void;
  toggleBarcodeTorch: () => void;
}

export default function HabitsTab({
  habitGoalComplete,
  todayHabitMinutes,
  habitTargetMinutes,
  habitSyncStatus,
  habitTasks,
  habitLogs,
  activeHabitTask,
  todayKey,
  habitTasksHitToday,
  allHabitMinutesToday,
  todayHabitTaskName,
  todayHabitTaskMinutes,
  todayHabitTaskNote,
  habitTaskName,
  habitLogMinutes,
  habitLogNote,
  habitStreakDays,
  habitConsistencyPct,
  habitDaysComplete,
  habitTotalMinutes,
  habitTotalSessions,
  habitLast7Days,
  habitRecentLogs,
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
  setActiveHabitTaskId,
  updateActiveHabitTask,
  setHabitLogNote,
  setTodayHabitTaskName,
  setTodayHabitTaskMinutes,
  setTodayHabitTaskNote,
  handleAddHabitTask,
  handleAddTodayHabitTask,
  handleLogHabitSession,
  handleDeleteHabitLog,
  handleShowerProofFile,
  handleConfirmDailyShower,
  stopBarcodeScanner,
  startBarcodeScanner,
  toggleBarcodeTorch,
}: HabitsTabProps) {
  return (
    <div className="space-y-6 animate-fade-in" id="tab-view-habits">
      <div className="rounded-[8px] border-4 border-slate-950 bg-white p-5 shadow-lg dark:border-white dark:bg-[#17181b]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Consistency Tracker</p>
            <h2 className="mt-1 text-4xl font-black leading-none text-slate-950 dark:text-white sm:text-5xl">
              Task time goals
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-bold text-slate-500 dark:text-slate-300">
              Add multiple repeat tasks, log street work or focus time, and track each task separately.
            </p>
          </div>
          <div className={`rounded-[8px] px-4 py-3 text-right ${habitGoalComplete ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-slate-950'}`}>
            <p className="text-xs font-black uppercase">Today</p>
            <p className="text-3xl font-black">{todayHabitMinutes} / {habitTargetMinutes} min</p>
            <p className="mt-1 text-xs font-black uppercase">
              {habitSyncStatus === 'synced' && 'Backend saved'}
              {habitSyncStatus === 'saving' && 'Saving'}
              {habitSyncStatus === 'loading' && 'Loading'}
              {habitSyncStatus === 'offline' && 'Local fallback'}
            </p>
          </div>
        </div>
      </div>

      <ShowerGateSection
        showerGateRequired={showerGateRequired}
        showerGateUnlocked={showerGateUnlocked}
        barcodeVerifiedForCycle={barcodeVerifiedForCycle}
        showerProofRequiredSatisfied={showerProofRequiredSatisfied}
        barcodeScanMessage={barcodeScanMessage}
        showerCycleLabel={showerCycleLabel}
        showerHabitLoggedForCycle={showerHabitLoggedForCycle}
        showerProofForCycle={showerProofForCycle}
        showerProofAttachmentForCycle={showerProofAttachmentForCycle}
        showerProofInputKey={showerProofInputKey}
        showerProofSyncMessage={showerProofSyncMessage}
        showerProofSyncStatus={showerProofSyncStatus}
        showerProofBackendFolder={showerProofBackendFolder}
        barcodeScannerActive={barcodeScannerActive}
        barcodePermissionStatus={barcodePermissionStatus}
        barcodeTorchOn={barcodeTorchOn}
        barcodeTorchAvailable={barcodeTorchAvailable}
        barcodeVideoRef={barcodeVideoRef}
        handleShowerProofFile={handleShowerProofFile}
        handleConfirmDailyShower={handleConfirmDailyShower}
        stopBarcodeScanner={stopBarcodeScanner}
        startBarcodeScanner={startBarcodeScanner}
        toggleBarcodeTorch={toggleBarcodeTorch}
      />

      <section className="rounded-[8px] border-2 border-slate-300 bg-white p-4 dark:border-white/20 dark:bg-[#17181b]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Task Board</p>
            <h3 className="text-3xl font-black text-slate-950 dark:text-white">Tracked Tasks</h3>
          </div>
          <button
            type="button"
            onClick={handleAddHabitTask}
            className="flex min-h-14 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-5 text-lg font-black uppercase text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <Plus size={22} />
            <span>Add Task</span>
          </button>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {habitTasks.map(task => {
            const taskLogs = habitLogs.filter(log => log.taskId === task.id || (!log.taskId && log.taskName === task.name));
            const taskTodayMinutes = taskLogs
              .filter(log => log.date === todayKey)
              .reduce((sum, log) => sum + log.minutes, 0);
            const taskComplete = taskTodayMinutes >= task.targetMinutes;
            const isActive = activeHabitTask.id === task.id;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setActiveHabitTaskId(task.id)}
                className={`min-w-[220px] rounded-[8px] border-2 p-4 text-left transition ${isActive ? 'border-blue-700 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 bg-slate-50 hover:border-blue-300 dark:border-white/10 dark:bg-white/[0.04]'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xl font-black text-slate-950 dark:text-white">{task.name}</p>
                  <span className={`shrink-0 rounded-[8px] px-2 py-1 text-xs font-black uppercase ${taskComplete ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-slate-950'}`}>
                    {taskComplete ? 'Done' : 'Open'}
                  </span>
                </div>
                <p className="mt-3 text-4xl font-black leading-none text-slate-950 dark:text-white">{taskTodayMinutes}</p>
                <p className="text-base font-black uppercase text-slate-500 dark:text-slate-300">of {task.targetMinutes} min today</p>
                <p className="mt-2 text-sm font-black uppercase text-blue-700 dark:text-blue-300">{taskLogs.length} sessions</p>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[8px] bg-slate-950 p-4 text-white">
            <p className="text-sm font-black uppercase">Tasks Tracked</p>
            <p className="mt-2 text-4xl font-black leading-none">{habitTasks.length}</p>
          </div>
          <div className="rounded-[8px] bg-emerald-600 p-4 text-white">
            <p className="text-sm font-black uppercase">Hit Today</p>
            <p className="mt-2 text-4xl font-black leading-none">{habitTasksHitToday}</p>
          </div>
          <div className="rounded-[8px] bg-blue-700 p-4 text-white">
            <p className="text-sm font-black uppercase">Time Today</p>
            <p className="mt-2 text-4xl font-black leading-none">{allHabitMinutesToday}m</p>
          </div>
        </div>
      </section>

      <details
        data-testid="add-today-task-panel"
        className="group rounded-[8px] border-2 border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#17181b]"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 marker:hidden">
          <span className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            <Plus size={18} className="text-blue-700 dark:text-blue-300" />
            Add To Today
          </span>
          <span className="rounded-[8px] bg-slate-100 px-2 py-1 text-xs font-black uppercase text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {new Date(`${todayKey}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        </summary>

        <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_110px_1fr_auto] lg:items-end">
          <div>
            <label htmlFor="today-habit-task-name" className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Task
            </label>
            <input
              id="today-habit-task-name"
              value={todayHabitTaskName}
              onChange={(event) => setTodayHabitTaskName(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-[8px] border-2 border-slate-300 bg-white px-3 text-sm font-black text-slate-950 outline-none focus:border-blue-700 dark:border-white/10 dark:bg-black/20 dark:text-white"
              placeholder="Task name"
            />
          </div>
          <div>
            <label htmlFor="today-habit-task-minutes" className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Minutes
            </label>
            <input
              id="today-habit-task-minutes"
              type="number"
              min="1"
              value={todayHabitTaskMinutes}
              onChange={(event) => setTodayHabitTaskMinutes(Math.max(1, Number(event.target.value) || 1))}
              className="mt-1 min-h-11 w-full rounded-[8px] border-2 border-slate-300 bg-white px-3 text-sm font-black text-slate-950 outline-none focus:border-blue-700 dark:border-white/10 dark:bg-black/20 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="today-habit-task-note" className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Note
            </label>
            <input
              id="today-habit-task-note"
              value={todayHabitTaskNote}
              onChange={(event) => setTodayHabitTaskNote(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-[8px] border-2 border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-700 dark:border-white/10 dark:bg-black/20 dark:text-white"
              placeholder="Optional"
            />
          </div>

          <button
            type="button"
            onClick={handleAddTodayHabitTask}
            className="flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-4 text-sm font-black uppercase text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <Plus size={18} />
            <span>Add</span>
          </button>
        </div>
      </details>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[8px] border-2 border-slate-300 bg-white p-5 dark:border-white/20 dark:bg-[#17181b]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="habit-task-name" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Task
              </label>
              <input
                id="habit-task-name"
                value={habitTaskName}
                onChange={(event) => updateActiveHabitTask({ name: event.target.value })}
                className="mt-2 min-h-14 w-full rounded-[8px] border-2 border-slate-300 bg-white px-4 text-lg font-black text-slate-950 outline-none focus:border-blue-700 dark:border-white/10 dark:bg-black/20 dark:text-white"
                placeholder="Example: Street outreach, paperwork, study"
              />
            </div>
            <div>
              <label htmlFor="habit-target-minutes" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Daily Target Minutes
              </label>
              <input
                id="habit-target-minutes"
                type="number"
                min="1"
                value={habitTargetMinutes}
                onChange={(event) => updateActiveHabitTask({ targetMinutes: Math.max(1, Number(event.target.value) || 1) })}
                className="mt-2 min-h-14 w-full rounded-[8px] border-2 border-slate-300 bg-white px-4 text-lg font-black text-slate-950 outline-none focus:border-blue-700 dark:border-white/10 dark:bg-black/20 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-5 rounded-[8px] bg-slate-100 p-4 dark:bg-black/20">
            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <div>
                <label htmlFor="habit-log-minutes" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Minutes Done
                </label>
                <input
                  id="habit-log-minutes"
                  type="number"
                  min="1"
                  value={habitLogMinutes}
                  onChange={(event) => updateActiveHabitTask({ lastMinutes: Math.max(1, Number(event.target.value) || 1) })}
                  className="mt-2 min-h-16 w-full rounded-[8px] border-2 border-slate-300 bg-white px-4 text-3xl font-black text-slate-950 outline-none focus:border-blue-700 dark:border-white/10 dark:bg-[#17181b] dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="habit-log-note" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Note
                </label>
                <input
                  id="habit-log-note"
                  value={habitLogNote}
                  onChange={(event) => setHabitLogNote(event.target.value)}
                  className="mt-2 min-h-16 w-full rounded-[8px] border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-950 outline-none focus:border-blue-700 dark:border-white/10 dark:bg-[#17181b] dark:text-white"
                  placeholder="Optional note"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogHabitSession}
              className="mt-4 flex min-h-20 w-full items-center justify-center gap-3 rounded-[8px] bg-blue-700 px-5 text-3xl font-black uppercase text-white shadow-lg transition hover:bg-blue-600"
            >
              <CheckCircle2 size={32} />
              <span>Log Time</span>
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[8px] bg-slate-950 p-4 text-white">
            <p className="text-sm font-black uppercase">Streak</p>
            <p className="mt-3 text-5xl font-black leading-none">{habitStreakDays}</p>
            <p className="mt-1 text-base font-black">days</p>
          </div>
          <div className="rounded-[8px] bg-emerald-600 p-4 text-white">
            <p className="text-sm font-black uppercase">7-Day Hit Rate</p>
            <p className="mt-3 text-5xl font-black leading-none">{habitConsistencyPct}%</p>
            <p className="mt-1 text-base font-black">{habitDaysComplete} of 7 days</p>
          </div>
          <div className="rounded-[8px] bg-blue-700 p-4 text-white">
            <p className="text-sm font-black uppercase">Total Time</p>
            <p className="mt-3 text-5xl font-black leading-none">{Math.floor(habitTotalMinutes / 60)}h</p>
            <p className="mt-1 text-base font-black">{habitTotalMinutes % 60} min</p>
          </div>
          <div className="rounded-[8px] bg-amber-400 p-4 text-slate-950">
            <p className="text-sm font-black uppercase">Sessions</p>
            <p className="mt-3 text-5xl font-black leading-none">{habitTotalSessions}</p>
            <p className="mt-1 text-base font-black">logged</p>
          </div>
        </section>
      </div>

      <section className="rounded-[8px] border-2 border-slate-300 bg-white p-5 dark:border-white/20 dark:bg-[#17181b]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Last 7 Days</p>
            <h3 className="text-3xl font-black text-slate-950 dark:text-white">Consistency View</h3>
          </div>
          <span className="rounded-[8px] bg-slate-950 px-3 py-2 text-sm font-black uppercase text-white dark:bg-white dark:text-slate-950">
            Target {habitTargetMinutes} min
          </span>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-2">
          {habitLast7Days.map(day => {
            const pct = Math.min(100, Math.round((day.minutes / habitTargetMinutes) * 100));
            return (
              <div key={day.key} className="rounded-[8px] bg-slate-100 p-2 text-center dark:bg-black/20">
                <div className="flex h-32 items-end justify-center rounded-[8px] bg-white p-1 dark:bg-white/10">
                  <div
                    className={`w-full rounded-[6px] ${day.complete ? 'bg-emerald-600' : 'bg-blue-700'}`}
                    style={{ height: `${Math.max(6, pct)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-black uppercase text-slate-500 dark:text-slate-300">{day.label}</p>
                <p className="text-sm font-black text-slate-950 dark:text-white">{day.minutes}m</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[8px] border-2 border-slate-300 bg-white p-5 dark:border-white/20 dark:bg-[#17181b]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Log History</p>
            <h3 className="text-3xl font-black text-slate-950 dark:text-white">All Logged Sessions</h3>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
              Every habit entry is listed here, no matter which task is selected above.
            </p>
          </div>
          <span className="rounded-[8px] bg-slate-950 px-3 py-2 text-sm font-black uppercase text-white dark:bg-white dark:text-slate-950">
            {habitLogs.length} total
          </span>
        </div>

        {habitRecentLogs.length === 0 ? (
          <div className="mt-4 rounded-[8px] border-2 border-dashed border-slate-300 p-6 text-center text-lg font-black text-slate-500 dark:border-white/10 dark:text-slate-300">
            No habit sessions saved yet. Log any task and it will show up here.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {habitRecentLogs.map(log => (
              <article key={log.id} className="rounded-[8px] border-2 border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-black text-slate-950 dark:text-white">{log.minutes} minutes</p>
                    <p className="text-sm font-black uppercase text-blue-700 dark:text-blue-300">{log.taskName || 'Daily Focus Task'}</p>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      {new Date(`${log.date}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}
                      {' '}
                      {log.createdAt ? `- ${new Date(log.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteHabitLog(log.id)}
                    className="rounded-[8px] bg-slate-200 px-2 py-1 text-xs font-black uppercase text-slate-600 hover:bg-rose-600 hover:text-white dark:bg-white/10 dark:text-slate-300"
                  >
                    Delete
                  </button>
                </div>
                {log.note && (
                  <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">{log.note}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
