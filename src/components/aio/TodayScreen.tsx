import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  CloudSun,
  Hourglass,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Volume2,
  VolumeX,
  Wind,
  Zap,
  AlertTriangle,
  Bike,
  BookOpen,
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
  ChecklistRow,
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
        <div className="aio-hero-gradient rounded-[28px] p-5 text-white shadow-[0_18px_50px_rgba(10,132,255,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-white/80">
                Road Readiness
              </p>
              <h2 className="mt-1 text-[28px] font-black leading-none tracking-[-0.02em]">
                {readiness.message}
              </h2>
            </div>
            <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-black uppercase tracking-wide backdrop-blur-sm ${
              readiness.status === "blocked" ? "bg-rose-500/25" : readiness.status === "needs_attention" ? "bg-amber-400/25" : "bg-white/20"
            }`}>
              <StatusIcon size={14} />
              {statusLabel}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-[13px] font-bold">
              <Wind size={15} />
              {windLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-[13px] font-bold">
              <Zap size={15} />
              {batteryPct}% · {batteryMilesLeft} mi left
            </span>
            <button
              type="button"
              onClick={handleReadinessAction}
              disabled={readiness.primaryAction === "none" || (readiness.primaryAction === "start_ride_mode" && !readiness.rideModeAllowed)}
              className="ml-auto inline-flex min-h-12 items-center gap-2 rounded-[16px] bg-white px-4 py-3 text-[15px] font-black text-[#0A84FF] transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              {readiness.primaryAction === "review_preview_guide"
                ? <BookOpen size={20} strokeWidth={2.4} />
                : <Bike size={20} strokeWidth={2.4} />}
              {readiness.primaryAction === "review_preview_guide"
                ? "Review Preview Guide"
                : readiness.primaryAction === "none"
                  ? "Preview Guide Unavailable"
                  : "Start Ride Mode"}
            </button>
          </div>

          {confirmLightHeadwind && (
            <div className="mt-3 rounded-[16px] border border-amber-200/30 bg-black/25 p-3" role="alert">
              <p className="text-[13px] font-bold">Light headwind is active. Confirm once to start Ride Mode.</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setConfirmLightHeadwind(false)} className="min-h-11 flex-1 rounded-xl border border-white/25 px-3 text-sm font-bold">
                  Cancel
                </button>
                <button type="button" onClick={props.onStartRideMode} className="min-h-11 flex-1 rounded-xl bg-white px-3 text-sm font-black text-[#0A84FF]">
                  Confirm &amp; Start
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-white/20 pt-4">
            <ChecklistRow
              checked={props.previewGuideReadiness === "reviewed"}
              label="Preview guide ready"
              detail={props.previewGuideReadiness === "reviewed"
                ? "Preview Guide reviewed for the next actionable job"
                : props.previewGuideReadiness === "unavailable"
                  ? "Preview Guide is unavailable"
                  : "Review is required before Ride Mode"}
            />
            <ChecklistRow
              checked={batteryPct >= 15}
              label="Battery above 15%"
              detail={batteryRisk === "High" ? "Charge before the next leg" : batteryPct >= 15 ? "Enough range for the route" : "Charge before riding"}
            />
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
                    className="rounded-[16px] bg-[var(--color-aio-surface-2)] px-3 py-2.5"
                  />
                  <MetricItem
                    label="Ride"
                    value={`${props.nextStopRideMinutes} min`}
                    className="rounded-[16px] bg-[var(--color-aio-surface-2)] px-3 py-2.5"
                  />
                  <MetricItem
                    label="Due"
                    value={dueLabel(primaryJob)}
                    className="rounded-[16px] bg-[var(--color-aio-surface-2)] px-3 py-2.5"
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
