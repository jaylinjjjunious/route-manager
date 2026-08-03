import React from "react";
import { ChevronRight, Ellipsis, CalendarDays, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Job } from "../../types";
import { getStreetName, getJobTypeLabel, getJobIconMeta, getRouteBadgeClasses, getRouteBadgeLabel } from "./jobMeta";

export type AioNavTab = "today" | "jobs" | "more";

/* ---------- Card surface ---------- */

export function AioCard({
  children,
  className = "",
  onClick,
  gradient = false,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  gradient?: boolean;
  "aria-label"?: string;
}) {
  const base = `${gradient ? "aio-hero-gradient" : "aio-card"} ${
    onClick ? "cursor-pointer touch-manipulation active:scale-[0.985] transition-transform" : ""
  } ${className}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={`w-full text-left ${base}`}>
        {children}
      </button>
    );
  }
  return <div className={base}>{children}</div>;
}

/* ---------- Section label ---------- */

export function AioSectionLabel({
  children,
  trailing,
  className = "",
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <h2 className="aio-label">{children}</h2>
      {trailing}
    </div>
  );
}

/* ---------- Gradient icon tile ---------- */

export function GradientIconTile({
  icon: Icon,
  gradient,
  size = "md",
  className = "",
}: {
  icon: LucideIcon;
  gradient: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "sm" ? "h-9 w-9 rounded-[12px]" : size === "lg" ? "h-14 w-14 rounded-[18px]" : "h-11 w-11 rounded-[14px]";
  const iconSize = size === "sm" ? 16 : size === "lg" ? 24 : 20;
  return (
    <span
      className={`flex shrink-0 items-center justify-center text-white shadow-[0_6px_18px_rgba(15,23,42,0.2)] ${gradient} ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      <Icon size={iconSize} strokeWidth={2.2} />
    </span>
  );
}

/* ---------- Status indicator ---------- */

const STATUS_TONES = {
  blue: "bg-[var(--color-aio-blue)]",
  green: "bg-[var(--color-aio-green)]",
  amber: "bg-[var(--color-aio-orange)]",
  red: "bg-[var(--color-aio-red)]",
  neutral: "bg-[var(--color-aio-text-3)]",
} as const;

export function StatusIndicator({
  tone,
  label,
  className = "",
}: {
  tone: keyof typeof STATUS_TONES;
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`h-2 w-2 rounded-full ${STATUS_TONES[tone]}`} aria-hidden="true" />
      <span className="aio-label text-[13px]">{label}</span>
    </span>
  );
}

/* ---------- Metric item ---------- */

export function MetricItem({
  label,
  value,
  tone = "default",
  className = "",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: "default" | "accent" | "success" | "warning" | "danger";
  className?: string;
}) {
  const valueTone =
    tone === "accent"
      ? "text-[var(--color-aio-blue)]"
      : tone === "success"
        ? "text-[#248A3D] dark:text-[#30D158]"
        : tone === "warning"
          ? "text-[#B25000] dark:text-[#FF9F0A]"
          : tone === "danger"
            ? "text-[#D70015] dark:text-[#FF453A]"
            : "text-[var(--color-aio-text)]";
  return (
    <div className={className}>
      <p className="aio-label text-[12px] leading-tight">{label}</p>
      <p className={`mt-0.5 text-[19px] font-black leading-tight tracking-[-0.02em] ${valueTone}`}>{value}</p>
    </div>
  );
}

/* ---------- Checklist row ---------- */

export function ChecklistRow({
  checked,
  label,
  detail,
  onToggle,
}: {
  checked: boolean;
  label: React.ReactNode;
  detail?: React.ReactNode;
  onToggle?: () => void;
}) {
  const content = (
    <>
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          checked
            ? "border-[var(--color-aio-blue)] bg-[var(--color-aio-blue)] text-white"
            : "border-[var(--color-aio-text-3)] bg-transparent"
        }`}
        aria-hidden="true"
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
            <path d="M2.5 6.2 5 8.7l4.5-5.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-semibold leading-tight ${checked ? "text-[var(--color-aio-text-3)] line-through" : "text-[var(--color-aio-text)]"}`}>
          {label}
        </span>
        {detail && <span className="mt-0.5 block text-[13px] font-medium text-[var(--color-aio-text-2)]">{detail}</span>}
      </span>
    </>
  );

  if (onToggle) {
    return (
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 py-2 text-left">
        {content}
      </button>
    );
  }
  return <div className="flex items-start gap-3 py-2">{content}</div>;
}

/* ---------- Button ---------- */

export function AioButton({
  children,
  onClick,
  variant = "primary",
  icon: Icon,
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: LucideIcon;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const base = "inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-[15px] font-bold tracking-[-0.01em] transition-all touch-manipulation";
  const variants = {
    primary:
      "bg-[var(--color-aio-blue)] text-white shadow-[0_8px_24px_rgba(10,132,255,0.35)] active:scale-[0.98] disabled:opacity-40",
    secondary:
      "border border-[var(--color-aio-line)] bg-[var(--color-aio-surface)] text-[var(--color-aio-text)] active:scale-[0.98] disabled:opacity-40",
    ghost: "text-[var(--color-aio-blue)] active:opacity-70 disabled:opacity-40",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={18} strokeWidth={2.2} aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ---------- Compact job row ---------- */

export function CompactJobRow({
  job,
  onOpen,
  trailing,
  subtitle,
}: {
  job: Job;
  onOpen?: (job: Job) => void;
  trailing?: React.ReactNode;
  subtitle?: string;
}) {
  const meta = getJobIconMeta(job);
  const Icon = meta.icon;
  const badge = getRouteBadgeLabel(job);
  const badgeClass = getRouteBadgeClasses(job);
  const rowContent = (
    <span className="flex w-full items-center gap-3 py-2.5 text-left">
      <GradientIconTile icon={Icon} gradient={meta.gradient} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[16px] font-bold leading-tight tracking-[-0.01em] text-[var(--color-aio-text)]">
            {job.storeName}
          </span>
          {badge && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${badgeClass}`}>{badge}</span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[13px] font-medium text-[var(--color-aio-text-2)]">
          {subtitle ?? `${getStreetName(job.address)} · ${getJobTypeLabel(job)}`}
        </span>
      </span>
      {trailing ?? (
        <span className="shrink-0 text-[13px] font-bold text-[var(--color-aio-text-2)]">
          ${job.pay.toFixed(2)}
        </span>
      )}
      <ChevronRight size={18} className="shrink-0 text-[var(--color-aio-text-3)]" aria-hidden="true" />
    </span>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(job)}
        className="flex w-full touch-manipulation items-center rounded-[16px] px-2 transition-colors hover:bg-[var(--color-aio-surface-2)] active:bg-[var(--color-aio-surface-2)]"
      >
        {rowContent}
      </button>
    );
  }
  return <div className="flex items-center rounded-[16px] px-2">{rowContent}</div>;
}

/* ---------- Week day indicator ---------- */

export function WeekDayIndicator({
  dayLabel,
  dateLabel,
  count,
  active = false,
  today = false,
  onClick,
}: {
  dayLabel: string;
  dateLabel: string;
  count?: number;
  active?: boolean;
  today?: boolean;
  onClick?: () => void;
}) {
  const base = "flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-[16px] px-1 py-2 transition-all touch-manipulation";
  const activeClass = active
    ? "bg-[var(--color-aio-blue)] text-white shadow-[0_6px_16px_rgba(10,132,255,0.35)]"
    : today
      ? "bg-[var(--color-aio-surface-2)] text-[var(--color-aio-text)]"
      : "bg-transparent text-[var(--color-aio-text-2)]";
  return (
    <button type="button" onClick={onClick} className={`${base} ${activeClass}`}>
      <span className="text-[12px] font-bold leading-none">{dayLabel}</span>
      <span className={`text-[12px] font-black leading-none ${active ? "text-white/90" : "text-[var(--color-aio-text-3)]"}`}>
        {dateLabel}
      </span>
      {typeof count === "number" && (
        <span
          className={`mt-0.5 rounded-full px-1.5 py-px text-[10px] font-bold leading-tight ${
            active ? "bg-white/25 text-white" : "bg-[var(--color-aio-surface-2)] text-[var(--color-aio-text-2)]"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ---------- Bottom tab bar ---------- */

const NAV_TABS: { id: AioNavTab; label: string; icon: LucideIcon }[] = [
  { id: "today", label: "Today", icon: CalendarDays },
  { id: "jobs", label: "Jobs", icon: ListChecks },
  { id: "more", label: "More", icon: Ellipsis },
];

export function BottomTabBar({
  current,
  onChange,
  jobsCount,
}: {
  current: AioNavTab;
  onChange: (tab: AioNavTab) => void;
  jobsCount?: number;
}) {
  return (
    <nav className="mobile-bottom-nav-shell fixed inset-x-0 bottom-0 z-50 mx-auto w-full px-3 pb-3 sm:left-1/2 sm:bottom-5 sm:w-[96%] sm:max-w-md sm:-translate-x-1/2 sm:px-0 sm:pb-0" aria-label="Primary app navigation">
      <div className="mobile-bottom-nav flex w-full items-stretch justify-around gap-1 rounded-[26px] border border-[var(--color-aio-line)] bg-[var(--color-aio-surface)] px-2 py-2 shadow-[0_22px_70px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:bg-[#0F0F10]/95">
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = current === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-h-[54px] flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-[20px] transition-all duration-300 ${
                isActive ? "text-[var(--color-aio-blue)]" : "text-[var(--color-aio-text-3)] hover:text-[var(--color-aio-text-2)]"
              }`}
            >
              {isActive && (
                <span className="absolute -top-1 h-1 w-8 rounded-full bg-[var(--color-aio-blue)]" aria-hidden="true" />
              )}
              <span className="relative">
                <Icon size={23} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
                {tab.id === "jobs" && typeof jobsCount === "number" && jobsCount > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF453A] px-1 text-[9px] font-black leading-none text-white">
                    {jobsCount > 99 ? "99+" : jobsCount}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wide ${isActive ? "font-black" : ""}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
