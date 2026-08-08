/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WeeklyStrip
 *
 * Seven-day scheduling strip (today..+6). All days fit on wide screens; on
 * mobile the strip scrolls horizontally with snap. Each cell shows weekday,
 * date, job count, total pay, a weather placeholder (Phase 2), the today
 * pill, and a Needs Review marker. Selecting a day opens the expanded day
 * panel beneath the strip.
 */

import React, { useMemo } from 'react';
import { AlertTriangle, CalendarClock, ChevronRight } from 'lucide-react';
import type { ScheduledDaySummary } from './jobSchedule';

interface WeeklyStripProps {
  days: ScheduledDaySummary[];
  today: string;
  selectedDate: string | null;
  onSelect: (date: string) => void;
  overdueCount: number;
  unscheduledCount: number;
  onReviewOverdue: () => void;
  onReviewUnscheduled: () => void;
}

function weekdayShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(year, month - 1, day, 12, 0, 0));
}

function dateNumber(dateStr: string): string {
  return dateStr.slice(8);
}

export function WeeklyStrip({
  days,
  today,
  selectedDate,
  onSelect,
  overdueCount,
  unscheduledCount,
  onReviewOverdue,
  onReviewUnscheduled,
}: WeeklyStripProps) {
  const todayIndex = useMemo(() => days.findIndex((day) => day.date === today), [days, today]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>, index: number) => {
    if (event.key === 'ArrowRight' && index < days.length - 1) {
      event.preventDefault();
      onSelect(days[index + 1].date);
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      onSelect(days[index - 1].date);
    } else if (event.key === 'Home' && todayIndex >= 0) {
      event.preventDefault();
      onSelect(days[todayIndex].date);
    } else if (event.key === 'End') {
      event.preventDefault();
      onSelect(days[days.length - 1].date);
    }
  };

  return (
    <section
      className="col-span-2 lg:col-span-4 road-card p-4 sm:p-5 transition-all"
      aria-label="Weekly schedule"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-blue-600 dark:text-blue-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            This Week
          </span>
        </div>
        <button
          type="button"
          onClick={() => todayIndex >= 0 && onSelect(days[todayIndex].date)}
          disabled={todayIndex < 0}
          className="road-action rounded-[8px] bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 hover:bg-slate-200 disabled:opacity-40 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
        >
          Today
        </button>
      </div>

      {(overdueCount > 0 || unscheduledCount > 0) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {overdueCount > 0 && (
            <button
              type="button"
              onClick={onReviewOverdue}
              className="flex items-center gap-1.5 rounded-[8px] bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800 transition hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
            >
              <AlertTriangle size={12} />
              {overdueCount} overdue
            </button>
          )}
          {unscheduledCount > 0 && (
            <button
              type="button"
              onClick={onReviewUnscheduled}
              className="flex items-center gap-1.5 rounded-[8px] bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
            >
              {unscheduledCount} unscheduled
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((day, index) => {
          const isToday = day.date === today;
          const isSelected = day.date === selectedDate;
          const hasReview = day.reviewJobs.length > 0;
          return (
            <button
              key={day.date}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-label={`${weekdayShort(day.date)} ${day.date} — ${day.jobs.length} jobs`}
              onClick={() => onSelect(day.date)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`flex w-[92px] shrink-0 snap-start scroll-ml-1 flex-col rounded-[8px] border-2 p-2.5 text-left transition-all motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0A0A0A] ${
                isSelected
                  ? 'border-amber-400 bg-amber-50 shadow-sm dark:border-amber-500/60 dark:bg-amber-500/10'
                  : isToday
                    ? 'border-blue-700 bg-blue-700 text-white dark:border-blue-500 dark:bg-blue-600'
                    : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]'
              }`}
            >
              <div className={`flex items-center justify-between ${isToday ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {isToday ? 'Today' : weekdayShort(day.date)}
                </span>
                <span className="text-[10px] opacity-60" aria-hidden="true">◌</span>
              </div>
              <span className={`mt-0.5 text-2xl font-black leading-none ${isToday ? 'text-white' : 'text-slate-950 dark:text-white'}`}>
                {dateNumber(day.date)}
              </span>
              <span className={`mt-1.5 text-xs font-black ${isToday ? 'text-blue-100' : day.jobs.length === 0 ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-200'}`}>
                {day.jobs.length === 0 ? '—' : `${day.jobs.length} job${day.jobs.length === 1 ? '' : 's'}`}
              </span>
              <span className={`text-[11px] font-bold ${isToday ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {day.jobs.length === 0 ? '' : `$${day.pay.toFixed(2)}`}
              </span>
              {hasReview && (
                <span
                  className={`mt-1 inline-flex w-fit items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-black ${
                    isToday ? 'bg-white/20 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  <AlertTriangle size={10} />
                  {day.reviewJobs.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">
        ◌ Weather analysis comes in Phase 2
      </p>
    </section>
  );
}
