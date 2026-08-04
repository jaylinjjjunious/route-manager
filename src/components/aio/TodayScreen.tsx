import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bike,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CloudOff,
  CloudSun,
  Hourglass,
  MapPin,
  Moon,
  Navigation,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Sun,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from "lucide-react";
import type { Job, Coordinates } from "../../types";
import type { ScheduledDaySummary } from "../../utils/jobSchedule";
import type { UseTransitTripResult } from "../../hooks/useTransitTrip";
import { getStreetName, getJobTypeLabel, getJobIconMeta } from "./jobMeta";
import {
  AioCard,
  AioSectionLabel,
  GradientIconTile,
  StatusIndicator,
  MetricItem,
  AioButton,
  CompactJobRow,
  WeekDayIndicator,
} from "./primitives";
import { formatLeaveByTime, deadlineComparison } from "../../services/transit/leaveBy";
import { getTransitMapsUrls } from "../../services/transit/mapsLinks";
import { ExpandedDayPanel } from "../ExpandedDayPanel";
import {
  evaluateRoadReadiness,
  type PreviewGuideReadiness,
} from "./roadReadiness";
import { useLiveWeather } from "../../services/weather/useLiveWeather";
import { formatTempF } from "../../services/weather/currentWeather";
import { PreviewGuideCompletionRow } from "./PreviewGuideCompletionRow";

const WEATHER_WIND_LABELS: Record<string, string> = {
  none: "Wind data off",
  calm: "Calm",
  headwind_light: "Light headwind",
  headwind_strong: "Strong headwind",
  tailwind: "Tailwind",
};

export interface TodayScreenProps {
  theme: "dark" | "light";
  userName?: string;
  onToggleTheme: () => void;
  onOpenMore: () => void;

  jobsTodayCount: number;

  weatherWind: string;

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
  onStartRideMode: () => void;
  actionableJob: Job | null;
  onOpenPreviewGuide: (job: Job) => void;

  transit: UseTransitTripResult;
  transitOrigin: { latitude: number; longitude: number };
  onSpeakRoute: (job: Job | null) => void;
  isSpeaking: boolean;

  onOptimizeRoute: () => void;
  onAddJob: () => void;

  previewGuideReadiness: PreviewGuideReadiness;

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

  batteryPct: number;
  batteryMilesLeft: number;
  batteryRisk: "Low" | "Watch" | "High";

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
    transit,
    onSpeakRoute,
    isSpeaking,
    batteryPct,
    batteryMilesLeft,
    batteryRisk,
    weeklyDays,
    today,
    selectedStripDate,
  } = props;

  const primaryJob = currentJob || nextJob;
  const otherJobs = useMemo(() => {
    if (!primaryJob) return remainingJobs;
    return remainingJobs.filter(job => job.id !== primaryJob.id);
  }, [remainingJobs, primaryJob]);

  const windLabel = WEATHER_WIND_LABELS[props.weatherWind] || "Wind data off";
  const transitReady = transit.trip !== null && transit.status === "active";
  const deadline = primaryJob && transit.trip ? deadlineComparison(transit.trip, primaryJob) : null;
  const leaveBy = transit.trip ? formatLeaveByTime(transit.trip) : null;
  const mapsUrl = transit.trip
    ? getTransitMapsUrls(transit.trip).full
    : props.nextStopNavLink;
  const readiness = evaluateRoadReadiness({
    hasActionableJob: props.actionableJob !== null,
    previewGuide: props.previewGuideReadiness,
    weatherWind: props.weatherWind,
  });
  const [confirmLightHeadwind, setConfirmLightHeadwind] = useState(false);

  const liveWeatherState = useLiveWeather({
    latitude: props.startCoord.lat,
    longitude: props.startCoord.lng,
  });
  const liveWeather = liveWeatherState.status === "ready" ? liveWeatherState.weather : null;
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

  useEffect(() => {
    setConfirmLightHeadwind(false);
  }, [props.actionableJob?.id, props.weatherWind, props.previewGuideReadiness]);

  const statusLabel = readiness.status === "needs_attention"
    ? "Needs Attention"
    : readiness.status === "blocked"
      ? "Blocked"
      : readiness.status === "done"
        ? "Done"
        : "Ready";
  const StatusIcon = readiness.status === "ready" || readiness.status === "done" ? CheckCircle2 : AlertTriangle;
  const handleReadinessAction = () => {
    if (readiness.primaryAction === "review_preview_guide" && props.actionableJob) {
      props.onOpenPreviewGuide(props.actionableJob);
      return;
    }
    if (readiness.primaryAction !== "start_ride_mode" || !readiness.rideModeAllowed) return;
    if (readiness.requiresWeatherConfirmation) {
      setConfirmLightHeadwind(true);
      return;
    }
    props.onStartRideMode();
  };

  return (
    <div className="space-y-5" id="tab-view-today">
      {/* 1. Readiness + weather header */}
      <section aria-label="Readiness and weather">
        <div className="relative overflow-hidden rounded-[24px] bg-[#0C0A16] p-4 shadow-[0_18px_50px_rgba(88,28,135,0.28)] sm:p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-[var(--color-aio-purple)] opacity-25 blur-3xl"
          />

          <div className="relative flex flex-col items-stretch justify-between gap-3 min-[390px]:flex-row min-[390px]:items-start">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${weatherTileClass}`}
                aria-hidden="true"
              >
                <WeatherGlyph size={24} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="text-[26px] font-black leading-none tracking-[-0.02em] text-white">
                  {weatherTemp}
                </p>
                <p className="mt-1 break-words text-[13px] font-bold leading-snug text-white/80">
                  {weatherCondition}
                </p>
                {weatherFeels && (
                  <p className="mt-0.5 break-words text-[12px] font-semibold text-white/65">
                    {weatherFeels}
                  </p>
                )}
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col items-stretch gap-2 min-[390px]:w-auto min-[390px]:items-end">
              <span className={`inline-flex self-start items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-black uppercase tracking-wide backdrop-blur-sm min-[390px]:self-auto ${
                readiness.status === "blocked" ? "bg-rose-500/25 text-rose-100" : readiness.status === "needs_attention" ? "bg-amber-400/25 text-amber-100" : "bg-white/15 text-white"
              }`}>
                <StatusIcon size={13} />
                {statusLabel}
              </span>
              <button
                type="button"
                onClick={handleReadinessAction}
                disabled={readiness.primaryAction === "none" || (readiness.primaryAction === "start_ride_mode" && !readiness.rideModeAllowed)}
                className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-center text-[13px] font-black leading-tight text-[#4C1D95] transition-transform active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-40 min-[390px]:w-auto"
              >
                {readiness.primaryAction === "review_preview_guide"
                  ? <BookOpen size={16} strokeWidth={2.4} aria-hidden="true" />
                  : <Bike size={16} strokeWidth={2.4} aria-hidden="true" />}
                {readiness.primaryAction === "review_preview_guide"
                  ? "Review Preview Guide"
                  : readiness.primaryAction === "none"
                    ? "Preview Guide Unavailable"
                    : "Start Ride Mode"}
              </button>
            </div>
          </div>

          <p className="relative mt-3 pr-1 text-[16px] font-black leading-snug tracking-[-0.01em] text-white">
            {readiness.message}
          </p>

          <div className="relative mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-bold text-white/85">
              <Wind size={14} aria-hidden="true" />
              {windLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-bold text-white/85">
              <Zap size={14} aria-hidden="true" />
              {batteryPct}% · {batteryMilesLeft} mi left
            </span>
          </div>

          {confirmLightHeadwind && (
            <div className="relative mt-3 rounded-[16px] border border-amber-200/30 bg-white/10 p-3" role="alert">
              <p className="text-[13px] font-bold text-amber-100">Light headwind is active. Confirm once to start Ride Mode.</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setConfirmLightHeadwind(false)} className="min-h-11 flex-1 rounded-xl border border-white/25 px-3 text-sm font-bold text-white">
                  Cancel
                </button>
                <button type="button" onClick={props.onStartRideMode} className="min-h-11 flex-1 rounded-xl bg-white px-3 text-sm font-black text-[#4C1D95]">
                  Confirm &amp; Start
                </button>
              </div>
            </div>
          )}

          <div className="relative mt-3 border-t border-white/10 pt-3">
            <PreviewGuideCompletionRow
              jobId={props.actionableJob?.id ?? null}
              readiness={props.previewGuideReadiness}
            />
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  batteryPct >= 15
                    ? "border-white bg-white text-[#4C1D95]"
                    : "border-white/40 text-transparent"
                }`}
                aria-hidden="true"
              >
                <Check size={12} strokeWidth={3} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`break-words text-[13px] font-bold ${batteryPct >= 15 ? "text-white/70" : "text-white/90"}`}>
                  Battery above 15%
                </p>
                <p className="mt-0.5 break-words text-[12px] font-medium leading-snug text-white/65">
                  {batteryRisk === "High" ? "Charge before the next leg" : batteryPct >= 15 ? "Enough range for the route" : "Charge before riding"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Next Best Job / Current Job */}
      <section aria-label="Next job">
        <AioSectionLabel trailing={props.completedJobsCount > 0 || props.routeTotalJobs > 0
          ? <span className="aio-caption">{props.completedJobsCount} of {props.routeTotalJobs} paid</span>
          : undefined}>
          {hasCurrentJob ? "Current Job" : "Next Best Job"}
        </AioSectionLabel>
        <AioCard className="mt-2.5 p-5" gradient={hasCurrentJob}>
          {primaryJob ? (() => {
            const meta = getJobIconMeta(primaryJob);
            const Icon = meta.icon;
            return (
              <div>
                <div className="flex items-start gap-4">
                  <GradientIconTile icon={Icon} gradient={meta.gradient} size="lg" />
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
                    className="rounded-[16px] border border-black/5 bg-slate-200 px-3 py-2.5 dark:border-white/10 dark:bg-slate-800"
                  />
                  <MetricItem
                    label="Ride"
                    value={`${props.nextStopRideMinutes} min`}
                    labelClassName="text-[#7C3AED] dark:text-[#CDB4F5]"
                    className="rounded-[16px] border border-aio-purple/25 bg-aio-purple/15 px-3 py-2.5 dark:border-aio-purple/35 dark:bg-aio-purple/20"
                  />
                  <MetricItem
                    label="Due"
                    value={dueLabel(primaryJob)}
                    labelClassName="text-[#B45309] dark:text-[#F5C97B]"
                    className="rounded-[16px] border border-aio-orange/25 bg-aio-orange/15 px-3 py-2.5 dark:border-aio-orange/30 dark:bg-aio-orange/15"
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
            );
          })() : (
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

      {/* 3. Travel Plan */}
      <section aria-label="Travel plan">
        <AioSectionLabel
          trailing={
            <button
              type="button"
              onClick={() => onSpeakRoute(primaryJob)}
              disabled={!primaryJob}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-aio-line)] bg-[var(--color-aio-surface)] px-3 py-1.5 text-[12px] font-bold text-[var(--color-aio-blue)] transition-transform active:scale-95 disabled:opacity-40"
              aria-label={isSpeaking ? "Stop speaking route" : "Speak route"}
            >
              {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
              {isSpeaking ? "Stop" : "Speak Route"}
            </button>
          }
        >
          Travel Plan
        </AioSectionLabel>
        <AioCard className="mt-2.5 p-5">
          {primaryJob ? (
            <>
              <div className="flex items-start gap-4">
                <GradientIconTile icon={CloudSun} gradient="bg-gradient-to-br from-[#30B0C7] to-[#64D2FF]" size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="aio-caption text-[12px]">{getStreetName(primaryJob.address)}</p>
                  <h4 className="mt-0.5 text-[17px] font-black tracking-[-0.01em] text-[var(--color-aio-text)]">
                    {transitReady
                      ? `${transit.trip!.totalDurationMinutes} min · ${transit.trip!.transferCount} transfer${transit.trip!.transferCount === 1 ? "" : "s"}`
                      : transit.status === "loading"
                        ? "Planning transit…"
                        : transit.status === "error"
                          ? "Transit plan unavailable"
                          : "Use bike or maps"}
                  </h4>
                  <p className="mt-0.5 text-[13px] font-medium text-[var(--color-aio-text-2)]">
                    {transitReady && leaveBy
                      ? `Leave by ${leaveBy} to arrive on time`
                      : transit.status === "error"
                        ? "Live transit is unavailable right now — ride or open maps."
                        : `${props.nextStopRideMinutes} min bike ride estimated`}
                  </p>
                </div>
              </div>

              {deadline && (
                <div className={`mt-4 flex items-center gap-2 rounded-[16px] px-3 py-2.5 ${
                  deadline.onTime === false
                    ? "bg-[#FF453A]/10 text-[#D70015] dark:text-[#FF453A]"
                    : deadline.arrivalMinutesBeforeDeadline !== null && deadline.arrivalMinutesBeforeDeadline < 15
                      ? "bg-[#FF9F0A]/10 text-[#B25000] dark:text-[#FF9F0A]"
                      : "bg-[#30D158]/10 text-[#248A3D] dark:text-[#30D158]"
                }`}>
                  <StatusIndicator
                    tone={deadline.onTime === false ? "red" : deadline.arrivalMinutesBeforeDeadline !== null && deadline.arrivalMinutesBeforeDeadline < 15 ? "amber" : "green"}
                    label={`${deadline.label} · ${primaryJob.dueTime || "no due time"}`}
                  />
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <AioButton variant="secondary" onClick={props.onOptimizeRoute} icon={RouteIcon}>
                  Optimize Route
                </AioButton>
                <a
                  href={mapsUrl}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[var(--color-aio-line)] bg-[var(--color-aio-surface)] px-4 py-3 text-[15px] font-bold tracking-[-0.01em] text-[var(--color-aio-text)] transition-transform active:scale-[0.98]"
                >
                  <MapPin size={18} strokeWidth={2.2} />
                  Open Route
                </a>
              </div>
            </>
          ) : (
            <div className="py-2 text-center">
              <p className="aio-caption">Add a job to see its travel plan.</p>
            </div>
          )}
        </AioCard>
      </section>

      {/* 4. Today's Other Jobs */}
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
                <CompactJobRow key={job.id} job={job} onOpen={props.onOpenJob} />
              ))}
            </div>
          )}
        </AioCard>
      </section>

      {/* 5. This Week */}
      <section aria-label="This week">
        <AioSectionLabel trailing={<button type="button" onClick={() => props.onSelectStripDate(today)} className="aio-label text-[13px] text-[var(--color-aio-blue)]">Today</button>}>
          This Week
        </AioSectionLabel>
        <AioCard className="mt-2.5 p-4">
          <div className="flex items-stretch gap-1.5">
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
            <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-aio-line)] pt-3">
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
        </AioCard>

        {selectedStripDate && (() => {
          const selectedDay = weeklyDays.find(day => day.date === selectedStripDate) || null;
          if (!selectedDay) return null;
          return (
            <div className="mt-3">
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
      </section>
    </div>
  );
}
