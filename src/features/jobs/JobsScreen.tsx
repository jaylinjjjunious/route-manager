import React from "react";
import { AlertTriangle, CalendarDays, ChevronRight, Plus, Route as RouteIcon } from "lucide-react";
import type { Job } from "../../types";
import type { ScheduledDaySummary } from "./jobSchedule";
import { AioSectionLabel, AioButton, CompactJobRow } from "../../components/aio/primitives";
import { StoreLogo } from "../../components/aio/StoreLogo";

const jobsGlassPanelClass =
  "relative overflow-hidden rounded-[24px] bg-[#0C0A16] shadow-[0_18px_50px_rgba(88,28,135,0.28)] [--color-aio-line:rgba(255,255,255,0.10)] [--color-aio-surface:rgba(255,255,255,0.06)] [--color-aio-surface-2:rgba(255,255,255,0.10)] [--color-aio-text:#ffffff] [--color-aio-text-2:rgba(255,255,255,0.68)] [--color-aio-text-3:rgba(255,255,255,0.42)]";

function JobsGlassPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`${jobsGlassPanelClass} ${className}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-[var(--color-aio-purple)] opacity-25 blur-3xl"
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

export interface JobsScreenProps {
  today: string;
  todayJobs: Job[];
  weekDays: ScheduledDaySummary[];
  routeBJobs: Job[];
  overdueJobs: Job[];
  unscheduledJobs: Job[];
  jobAccessLocked?: boolean;
  onBlockJobAccess?: () => void;
  onOpenJob: (job: Job) => void;
  onAddJob: () => void;
  onOptimizeRoute: () => void;
  onMoveToDay: (job: Job) => void;
}

function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function JobsScreen(props: JobsScreenProps) {
  const needsAttention = props.overdueJobs.length > 0 || props.unscheduledJobs.length > 0;
  const laterDays = props.weekDays.slice(1).filter(day => day.jobs.length > 0);
  const jobAccessLocked = props.jobAccessLocked ?? false;

  return (
    <div className="space-y-5" id="tab-view-jobs">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="aio-label text-[13px]">Schedule</p>
          <h1 className="mt-0.5 text-[28px] font-black leading-none tracking-[-0.02em] text-[var(--color-aio-text)]">Jobs</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <AioButton variant="secondary" icon={RouteIcon} disabled={jobAccessLocked} onClick={props.onOptimizeRoute} className="min-h-11">
            Optimize
          </AioButton>
          <AioButton icon={Plus} disabled={jobAccessLocked} onClick={props.onAddJob} className="min-h-11">
            Add
          </AioButton>
        </div>
      </div>

      {needsAttention && (
        <JobsGlassPanel className="p-4">
          <div className="flex flex-wrap gap-2">
            {props.overdueJobs.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF9F0A]/12 px-3 py-1.5 text-[12px] font-bold text-[#B25000] dark:text-[#FF9F0A]">
                <AlertTriangle size={13} />
                {props.overdueJobs.length} overdue
              </span>
            )}
            {props.unscheduledJobs.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-aio-surface-2)] px-3 py-1.5 text-[12px] font-bold text-[var(--color-aio-text-2)]">
                {props.unscheduledJobs.length} unscheduled
              </span>
            )}
          </div>
          {(props.overdueJobs.length > 0 || props.unscheduledJobs.length > 0) && (
            <div className="mt-3 divide-y divide-[var(--color-aio-line)]">
              {[...props.overdueJobs, ...props.unscheduledJobs].map(job => (
                <div key={job.id} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-[var(--color-aio-text)]">{job.storeName}</span>
                    <span className="block truncate text-[12px] font-medium text-[var(--color-aio-text-2)]">
                      {job.scheduledDate ? dayLabel(job.scheduledDate) : "No date"} · {job.dueTime || "Flex"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => jobAccessLocked ? props.onBlockJobAccess?.() : props.onMoveToDay(job)}
                    disabled={jobAccessLocked}
                    className="rounded-full bg-[var(--color-aio-blue)] px-3 py-1.5 text-[12px] font-bold text-white"
                  >
                    Move
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onOpenJob(job)}
                    aria-label={`Open ${job.storeName}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-aio-surface-2)] text-[var(--color-aio-text-2)]"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </JobsGlassPanel>
      )}

      <section aria-label="Today's jobs">
        <AioSectionLabel trailing={<span className="aio-caption">{props.todayJobs.length} job{props.todayJobs.length === 1 ? "" : "s"}</span>}>
          Today
        </AioSectionLabel>
        <JobsGlassPanel className="mt-2.5 p-2">
          {props.todayJobs.length === 0 ? (
            <div className="py-4 text-center">
              <p className="aio-caption">No jobs scheduled for today.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-aio-line)]">
              {props.todayJobs.map(job => (
                <CompactJobRow key={job.id} job={job} onOpen={props.onOpenJob} iconSlot={<StoreLogo job={job} />} />
              ))}
            </div>
          )}
        </JobsGlassPanel>
      </section>

      {laterDays.map(day => (
        <section key={day.date} aria-label={dayLabel(day.date)}>
          <AioSectionLabel trailing={<span className="aio-caption">{day.jobs.length} · ${day.pay.toFixed(2)}</span>}>
            {dayLabel(day.date)}
          </AioSectionLabel>
          <JobsGlassPanel className="mt-2.5 p-2">
            <div className="divide-y divide-[var(--color-aio-line)]">
              {day.jobs.map(job => (
                <CompactJobRow key={job.id} job={job} onOpen={props.onOpenJob} iconSlot={<StoreLogo job={job} />} />
              ))}
            </div>
          </JobsGlassPanel>
        </section>
      ))}

      <section aria-label="Route B standby">
        <AioSectionLabel trailing={<span className="aio-caption">{props.routeBJobs.length} standby</span>}>
          Route B Standby
        </AioSectionLabel>
        <JobsGlassPanel className="mt-2.5 p-2">
          {props.routeBJobs.length === 0 ? (
            <div className="py-4 text-center">
              <p className="aio-caption"><CalendarDays size={16} className="mr-1 inline" />No standby jobs.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-aio-line)]">
              {props.routeBJobs.map(job => (
                <CompactJobRow key={job.id} job={job} onOpen={props.onOpenJob} iconSlot={<StoreLogo job={job} />} />
              ))}
            </div>
          )}
        </JobsGlassPanel>
      </section>
    </div>
  );
}
