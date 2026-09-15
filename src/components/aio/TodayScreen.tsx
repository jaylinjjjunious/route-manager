import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CloudOff,
  Hourglass,
  Moon,
  Navigation,
  Plus,
  RefreshCw,
  Sun,
  Calendar,
} from "lucide-react";
import type { Job, Coordinates } from "../../types";
import type { ScheduledDaySummary } from "../../features/jobs/jobSchedule";
import { getStreetName, getJobTypeLabel } from "./jobMeta";
import {
  AioCard,
  AioSectionLabel,
  StatusIndicator,
  MetricItem,
  AioButton,
  CompactJobRow,
  WeekDayIndicator,
} from "./primitives";
import { ExpandedDayPanel } from "../../features/jobs/ExpandedDayPanel";
import { useLiveWeather } from "../../services/weather/useLiveWeather";
import { formatTempF } from "../../services/weather/currentWeather";
import { getWeatherAltText } from "../../services/weather/weatherSelector";
import { StoreLogo } from "./StoreLogo";

export interface TodayScreenProps {
  theme: "dark" | "light";
  userName?: string;
  onToggleTheme: () => void;
  onOpenMore: () => void;

  jobsTodayCount: number;

  currentJob: Job | null;
  hasCurrentJob: boolean;
  nextJob: Job | null;
  remainingJobs: Job[];
  completedJobsCount: number;
  routeTotalJobs: number;
  completingJobIds: string[];
  nextStopDistance: number;
  nextStopRideMinutes: number;
  nextStopNavLink: string;
  jobAccessLocked: boolean;
  onBlockJobAccess: () => void;
  onToggleJobProgress: (job: Job) => void;
  onOpenJob: (job: Job) => void;

  onAddJob: () => void;

  weeklyDays: ScheduledDaySummary[];
  today: string;
  selectedStripDate: string | null;
  onSelectStripDate: (date: string | null) => void;
  overdueCount: number;
  unscheduledCount: number;
  onReviewOverdue: () => void;
  onReviewUnscheduled: () => void;
  startCoord: Coordinates;
  avgSpeedMph: number;
  onMoveToDay: (job: Job) => void;
  onPlanThisDay: () => void;
  onMoveExisting: () => void;

  earningsAmount: number;
  earningsTitle: string;
  earningsFooter: string;

  routeProgressPct: number;
  revisionAlerts: Job[];
}

function dueLabel(job: Job | null): string {
  if (!job) return "—";
  if (job.dueTime) return job.dueTime;
  return "Flex";
}

export default function TodayScreen(props: TodayScreenProps) {
  const {
    nextJob,
    currentJob,
    hasCurrentJob,
    remainingJobs,
    weeklyDays,
    today,
    selectedStripDate,
  } = props;

  const primaryJob = currentJob || nextJob;
  const otherJobs = useMemo(() => {
    if (!primaryJob) return remainingJobs;
    return remainingJobs.filter(job => job.id !== primaryJob.id);
  }, [remainingJobs, primaryJob]);

  const liveWeatherState = useLiveWeather({
    latitude: props.startCoord.lat,
    longitude: props.startCoord.lng,
  });
  const liveWeather = liveWeatherState.status === "ready" ? liveWeatherState.weather : null;
  const [weatherImageError, setWeatherImageError] = useState(false);
  const weatherArtworkUrl = liveWeather?.artworkUrl ?? null;
  const weatherHasArtwork = Boolean(weatherArtworkUrl && !weatherImageError);
  const WeatherGlyph = liveWeather ? (liveWeather.isDay ? Sun : Moon) : liveWeatherState.status === "loading" ? Sun : CloudOff;
  const weatherTileClass = liveWeather
    ? liveWeather.isDay
      ? "bg-amber-300/20 text-amber-300"
      : "bg-indigo-300/20 text-indigo-300"
    : "bg-white/10 text-white/45";
  const weatherTemp = liveWeather ? formatTempF(liveWeather.temperatureC) : liveWeatherState.status === "loading" ? "…" : "—";
  const weatherCondition = liveWeather
    ? liveWeather.condition
    : liveWeatherState.status === "loading"
      ? "Loading weather"
      : "Live weather unavailable";
  const weatherFeels = liveWeather ? `Feels like ${formatTempF(liveWeather.feelsLikeC)}` : null;
  const weatherArtworkAlt = liveWeather?.semanticState
    ? getWeatherAltText(liveWeather.semanticState)
    : "Weather condition icon";

  useEffect(() => {
    setWeatherImageError(false);
  }, [weatherArtworkUrl]);

  return (
    <div className="space-y-5" id="tab-view-today">
      {/* 1. Weather + This Week */}
      <section aria-label="Weather and this week">
        <div className="relative overflow-hidden rounded-[24px] bg-[#0C0A16] p-4 shadow-[0_18px_50px_rgba(88,28,135,0.28)] sm:p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-[var(--color-aio-purple)] opacity-25 blur-3xl"
          />

          <div className="relative flex flex-col items-stretch justify-between gap-2 min-[381px]:flex-row min-[381px]:flex-wrap min-[381px]:items-start">
            <div className="flex shrink-0 items-center">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center transition-colors ${weatherHasArtwork ? "bg-transparent" : `rounded-full ${weatherTileClass}`}`}
                aria-hidden={weatherHasArtwork ? undefined : "true"}
              >
                {weatherHasArtwork ? (
                  <img
                    src={weatherArtworkUrl!}
                    alt={weatherArtworkAlt}
                    className="h-full w-full object-contain select-none pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
                    onError={() => setWeatherImageError(true)}
                    loading="eager"
                  />
                ) : (
                  <WeatherGlyph size={24} strokeWidth={2.2} />
                )}
              </span>
              <p className="ml-1 whitespace-nowrap text-[26px] font-black leading-none tracking-[-0.02em] text-white">
                {weatherTemp}
              </p>
              <span aria-hidden="true" className="ml-1 h-8 w-px shrink-0 self-center bg-white/15" />
              <div className="min-w-0 pl-1">
                {weatherFeels && (
                  <p className="whitespace-nowrap text-[12px] font-semibold leading-tight text-white/65">
                    {weatherFeels}
                  </p>
                )}
                <p className="mt-0.5 text-[13px] font-bold leading-snug text-white/80">
                  {weatherCondition}
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[13px] font-bold text-white/80 flex items-center gap-2">
                <Calendar size={14} aria-hidden="true" />
                This Week
              </h4>
              <button
                type="button"
                onClick={() => props.onSelectStripDate(today)}
                className="aio-label text-[13px] text-[var(--color-aio-blue)]"
              >
                Today
              </button>
            </div>
            <div className="flex items-stretch gap-1.5 overflow-x-auto pb-2">
              {weeklyDays.slice(0, 7).map(day => {
                const isToday = day.date === today;
                const isSelected = day.date === selectedStripDate;
                return (
                  <WeekDayIndicator
                    key={day.date}
                    dayLabel={isToday ? "Today" : new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" })}
                    dateLabel={day.date.slice(8)}
                    count={day.jobs.length}
                    active={isSelected}
                    today={isToday}
                    onClick={() => props.onSelectStripDate(day.date)}
                  />
                );
              })}
            </div>

            {(props.overdueCount > 0 || props.unscheduledCount > 0) && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                {props.overdueCount > 0 && (
                  <button
                    type="button"
                    onClick={props.onReviewOverdue}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#FF9F0A]/12 px-3 py-1.5 text-[12px] font-bold text-[#B25000] dark:text-[#FF9F0A]"
                  >
                    <AlertTriangle size={13} />
                    {props.overdueCount} overdue
                  </button>
                )}
                {props.unscheduledCount > 0 && (
                  <button
                    type="button"
                    onClick={props.onReviewUnscheduled}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-aio-surface-2)] px-3 py-1.5 text-[12px] font-bold text-[var(--color-aio-text-2)]"
                  >
                    {props.unscheduledCount} unscheduled
                    <ChevronRight size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          {selectedStripDate && (() => {
            const selectedDay = weeklyDays.find(day => day.date === selectedStripDate) || null;
            if (!selectedDay) return null;
            return (
              <div className="mt-4 border-t border-white/10 pt-4">
                <ExpandedDayPanel
                  day={selectedDay}
                  today={today}
                  todayJobsCount={weeklyDays[0]?.jobs.length ?? 0}
                  todayPay={weeklyDays[0]?.pay ?? 0}
                  todayWorkMinutes={weeklyDays[0]?.workMinutes ?? 0}
                  startCoord={props.startCoord}
                  avgSpeedMph={props.avgSpeedMph}
                  onMoveToDay={props.onMoveToDay}
                  onOpenJob={(id) => props.onOpenJob(weeklyDays.flatMap(d => d.jobs).find(j => j.id === id) as Job)}
                  onPlanThisDay={() => props.onPlanThisDay()}
                  onAddJob={props.onAddJob}
                  onMoveExisting={props.onMoveExisting}
                  onCollapse={() => props.onSelectStripDate(null)}
                />
              </div>
            );
          })()}
        </div>
      </section>

      {/* 2. Next Best Job / Current Job */}
      <section aria-label="Next job">
        <AioSectionLabel trailing={props.completedJobsCount > 0 || props.routeTotalJobs > 0
          ? <span className="aio-caption">{props.completedJobsCount} of {props.routeTotalJobs} paid</span>
          : undefined}>
          {hasCurrentJob ? "Current Job" : "Next Best Jobs"}
        </AioSectionLabel>
        <AioCard className="mt-2.5 p-5" gradient={hasCurrentJob}>
          {primaryJob ? (
              <div>
                <div className="flex items-start gap-4">
                  <StoreLogo job={primaryJob} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusIndicator
                        tone={hasCurrentJob ? "blue" : "green"}
                        label={hasCurrentJob ? "Under review" : "Ready now"}
                      />
                    </div>
                    <h3 className="mt-1 truncate text-[22px] font-black leading-tight tracking-[-0.02em] text-[var(--color-aio-text)]">
                      {primaryJob.storeName}
                    </h3>
                    <p className="mt-0.5 truncate text-[14px] font-medium text-[var(--color-aio-text-2)]">
                      {getStreetName(primaryJob.address)} · {getJobTypeLabel(primaryJob)}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-[18px] bg-[var(--color-aio-surface-2)] px-4 py-3 text-right">
                    <p className="aio-caption text-[11px]">Pay</p>
                    <p className="text-[22px] font-black leading-tight tracking-[-0.02em] text-[var(--color-aio-text)]">
                      ${primaryJob.pay.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  <MetricItem
                    label="Distance"
                    value={`${props.nextStopDistance.toFixed(1)} mi`}
                    labelClassName="text-slate-600 dark:text-slate-300"
                    className="rounded-[16px] border border-black/10 bg-[#ECECF2] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-white/15 dark:bg-[#222329] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                  />
                  <MetricItem
                    label="Ride"
                    value={`${props.nextStopRideMinutes} min`}
                    labelClassName="text-slate-600 dark:text-slate-300"
                    className="rounded-[16px] border border-black/10 bg-[#ECECF2] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-white/15 dark:bg-[#222329] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                  />
                  <MetricItem
                    label="Due"
                    value={dueLabel(primaryJob)}
                    labelClassName="text-amber-700 dark:text-[#F5C97B]"
                    className="rounded-[16px] border border-black/10 bg-[#ECECF2] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-white/15 dark:bg-[#222329] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {props.jobAccessLocked ? (
                    <AioButton variant="secondary" icon={AlertTriangle} onClick={props.onBlockJobAccess}>
                      Locked
                    </AioButton>
                  ) : (
                    <a
                      href={props.nextStopNavLink}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#34C759] px-4 py-3 text-[15px] font-bold tracking-[-0.01em] text-white shadow-[0_8px_24px_rgba(52,199,89,0.35)] transition-transform active:scale-[0.98]"
                    >
                      <Navigation size={18} strokeWidth={2.2} />
                      Navigate
                    </a>
                  )}
                  <AioButton
                    variant={hasCurrentJob ? "primary" : "secondary"}
                    icon={hasCurrentJob ? CheckCircle2 : Hourglass}
                    disabled={props.completingJobIds.includes(primaryJob.id)}
                    onClick={() => props.onToggleJobProgress(primaryJob)}
                  >
                    {props.completingJobIds.includes(primaryJob.id)
                      ? "Done"
                      : hasCurrentJob
                        ? "Complete Job"
                        : "Under Review"}
                  </AioButton>
                </div>

                <button
                  type="button"
                  onClick={() => props.onOpenJob(primaryJob)}
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-[var(--color-aio-blue)]"
                >
                  Job details <ChevronRight size={14} />
                </button>
              </div>
          ) : (
            <div className="py-4 text-center">
              <p className="aio-heading text-[17px] font-black">Route clear</p>
              <p className="aio-caption mt-1">No actionable jobs for today.</p>
              <AioButton variant="secondary" icon={Plus} onClick={props.onAddJob} className="mt-4">
                Add a job
              </AioButton>
            </div>
          )}
        </AioCard>

        {props.routeProgressPct < 100 && (
          <div className="mt-2.5 px-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-aio-surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--color-aio-blue)] transition-all duration-500"
                style={{ width: `${props.routeProgressPct}%` }}
              />
            </div>
            <p className="aio-caption mt-1.5 text-[12px]">
              Route progress {props.routeProgressPct}% · {props.earningsTitle}: ${props.earningsAmount.toFixed(2)} · {props.earningsFooter}
            </p>
          </div>
        )}
      </section>

      {/* 3. Today's Other Jobs */}
      <section aria-label="Today's other jobs">
        <AioSectionLabel trailing={<span className="aio-caption">{otherJobs.length} job{otherJobs.length === 1 ? "" : "s"}</span>}>
          Today&apos;s Other Jobs
        </AioSectionLabel>
        {props.revisionAlerts.length > 0 && (
          <div className="mt-2.5 flex items-center gap-2 rounded-[16px] bg-[#FF9F0A]/12 px-3 py-2.5 text-[#B25000] dark:text-[#FF9F0A]">
            <RefreshCw size={15} />
            <span className="text-[13px] font-bold">
              {props.revisionAlerts.length} revision{props.revisionAlerts.length === 1 ? "" : "s"} need attention
            </span>
          </div>
        )}
        <AioCard className="mt-2.5 p-2">
          {otherJobs.length === 0 ? (
            <div className="py-4 text-center">
              <p className="aio-caption">Nothing else scheduled for today.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-aio-line)]">
              {otherJobs.map(job => (
                <CompactJobRow key={job.id} job={job} onOpen={props.onOpenJob} iconSlot={<StoreLogo job={job} />} />
              ))}
            </div>
          )}
        </AioCard>
      </section>

    </div>
  );
}
