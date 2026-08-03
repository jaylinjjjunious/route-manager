import React from "react";
import { Moon, Sun, Ellipsis } from "lucide-react";

function getGreeting(hour: number): string {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatToday(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = now.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `${weekday}, ${monthDay}`;
}

export default function AioHeader({
  theme,
  userName,
  onToggleTheme,
  onMore,
}: {
  theme: "dark" | "light";
  userName?: string;
  onToggleTheme: () => void;
  onMore?: () => void;
}) {
  const hour = new Date().getHours();
  const greetingName = userName ? `, ${userName.trim().split(/\s+/)[0]}` : "";
  const iconClass = "flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-aio-line)] bg-[var(--color-aio-surface)] text-[var(--color-aio-text-2)] transition-colors hover:text-[var(--color-aio-text)] active:scale-95 touch-manipulation";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-aio-line)] bg-[var(--color-aio-bg)]/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-end justify-between gap-3 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="aio-label text-[13px]">
            {getGreeting(hour)}
            {greetingName}
          </p>
          <h1 className="mt-0.5 text-[34px] font-black leading-none tracking-[-0.02em] text-[var(--color-aio-text)]">
            AI<span aria-label="Ø (slashed zero)">Ø</span>
          </h1>
          <p className="mt-1.5 text-[13px] font-medium text-[var(--color-aio-text-2)]">{formatToday()}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className={iconClass}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={20} strokeWidth={2.2} /> : <Moon size={20} strokeWidth={2.2} />}
          </button>
          {onMore && (
            <button
              type="button"
              onClick={onMore}
              className={iconClass}
              aria-label="Open more menu"
              title="More"
            >
              <Ellipsis size={20} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
