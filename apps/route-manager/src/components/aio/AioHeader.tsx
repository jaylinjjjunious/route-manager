import React, { useId, useRef, useState } from "react";

const AVATAR_PATH = "/profile/avatar.webp";

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
  userName,
  userEmail,
  onOpenProfile,
}: {
  userName?: string;
  userEmail?: string;
  onOpenProfile: () => void;
}) {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 120, right: 16 });
  const hour = new Date().getHours();
  const greetingName = userName ? `, ${userName.trim().split(/\s+/)[0]}` : "";
  const profileClass = "flex aspect-square h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[var(--color-aio-line)] bg-[var(--color-aio-surface)] transition-transform hover:scale-[1.03] active:scale-95 touch-manipulation";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-aio-line)] bg-[var(--color-aio-bg)]/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-end justify-between gap-3 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="aio-label text-[13px]">
            {getGreeting(hour)}
            {greetingName}
          </p>
          <h1
            className="mt-0.5 text-[34px] font-black leading-none tracking-[-0.02em] text-[var(--color-aio-text)]"
            aria-label="AIØ 17 10/12"
          >
            <span aria-hidden="true">AIØ</span>
            <span
              aria-hidden="true"
              className="ml-[0.08em] bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, #dc2626 0%, #ef4444 20%, #f8fafc 45%, #ffffff 55%, #3b82f6 80%, #1d4ed8 100%)",
                WebkitTextFillColor: "transparent",
              }}
            >
              17
            </span>
            <span aria-hidden="true" className="ml-1 inline-block align-middle text-[11px] font-black leading-none tracking-normal text-green-600 dark:text-green-400">
              10/12
            </span>
          </h1>
          <p className="mt-1.5 text-[13px] font-medium text-[var(--color-aio-text-2)]">{formatToday()}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            popoverTarget={menuId}
            aria-controls={menuId}
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); setPosition({ top: rect.bottom + 12, right: Math.max(16, window.innerWidth - rect.right) }); }}
            className={profileClass}
            aria-label="Open profile and More menu"
            title="Profile"
          >
            <img
              src={AVATAR_PATH}
              alt="Your profile picture"
              className="h-full w-full rounded-full object-cover"
            />
          </button>
          <div id={menuId} ref={menuRef} popover="auto" role="dialog" aria-label="Profile menu"
            onToggle={event => setOpen((event.nativeEvent as ToggleEvent).newState === "open")}
            className="rounded-2xl border border-[var(--color-aio-line)] bg-[var(--color-aio-surface)] p-4 text-[var(--color-aio-text)] shadow-2xl"
            style={{ position: "fixed", inset: "auto", margin: 0, top: position.top, right: position.right, width: `min(288px, calc(100vw - ${position.right + 16}px))`, maxHeight: `calc(100dvh - ${position.top + 16}px)`, overflowY: "auto" }}>
            <div className="flex items-start gap-3">
              <img src={AVATAR_PATH} alt="Profile photo" className="h-12 w-12 shrink-0 rounded-full object-cover" />
              <p className="min-w-0 break-words pt-1 text-sm font-semibold leading-snug">{userName || "Your profile"}</p>
            </div>
            {userEmail && <p className="mt-3 break-words border-t border-[var(--color-aio-line)] pt-3 text-xs leading-relaxed text-[var(--color-aio-text-2)]">{userEmail}</p>}
            <button type="button" className="mt-4 w-full rounded-xl border border-[var(--color-aio-line)] px-4 py-3 text-sm font-semibold hover:bg-[var(--color-aio-bg)] focus-visible:outline focus-visible:outline-2"
              onClick={() => { menuRef.current?.hidePopover?.(); onOpenProfile(); }}>Open More</button>
          </div>
        </div>
      </div>
    </header>
  );
}
