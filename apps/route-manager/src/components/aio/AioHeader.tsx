import React, { useEffect, useId, useRef, useState } from "react";

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
  renderProfileMenu,
}: {
  userName?: string;
  renderProfileMenu: (close: () => void) => React.ReactNode;
}) {
  const menuId = useId();
  const menuRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const openMenu = () => { if (!menuRef.current?.open) { menuRef.current?.showModal(); setOpen(true); } };
  const closeMenu = () => menuRef.current?.close();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    let start: { x: number; y: number; time: number; closing: boolean } | null = null;
    const onStart = (event: TouchEvent) => {
      start = null;
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const closing = !!menuRef.current?.open;
      if (closing && (!(event.target instanceof Node) || !menuRef.current?.contains(event.target))) return;
      if (!closing && (touch.clientX > 24 || document.querySelector('dialog[open], [aria-modal="true"]'))) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select')) return;
      start = { x: touch.clientX, y: touch.clientY, time: Date.now(), closing };
    };
    const onEnd = (event: TouchEvent) => {
      const gesture = start;
      start = null;
      if (!gesture || event.changedTouches.length !== 1 || Date.now() - gesture.time > 700) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - gesture.x;
      if (Math.abs(touch.clientY - gesture.y) > 48) return;
      if (gesture.closing && dx < -64) closeMenu();
      else if (!gesture.closing && dx > 64) openMenu();
    };
    const cancel = () => { start = null; };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", cancel);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", cancel);
    };
  }, []);
  const hour = new Date().getHours();
  const greetingName = userName ? `, ${userName.trim().split(/\s+/)[0]}` : "";
  const profileClass = "flex aspect-square h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-aio-line)] bg-[var(--color-aio-surface)]";

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
            <button type="button" onClick={openMenu} aria-label="Open navigation sidebar" title="Open menu" aria-controls={menuId} aria-expanded={open} aria-haspopup="dialog" className="rounded-md text-left touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
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
            </button>
          </h1>
          <p className="mt-1.5 text-[13px] font-medium text-[var(--color-aio-text-2)]">{formatToday()}</p>
        </div>
        <button type="button" className={profileClass} title="Profile" aria-label="Open profile menu" aria-controls={menuId} aria-expanded={open} aria-haspopup="dialog" onClick={openMenu}>
          <img src={AVATAR_PATH} alt="Your profile picture" className="h-full w-full rounded-full object-cover" />
        </button>
      </div>
      <dialog id={menuId} ref={menuRef} aria-label="Navigation sidebar" onClose={() => setOpen(false)}
        onClick={event => { if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeMenu();
        } }}
        className="aio-sidebar border-r border-[var(--color-aio-line)] bg-[var(--color-aio-surface)] text-[var(--color-aio-text)] shadow-2xl">
        <div className="flex items-start gap-3">
          <img src={AVATAR_PATH} alt="Profile photo" className="h-12 w-12 shrink-0 rounded-full object-cover" />
          <p className="min-w-0 flex-1 break-words pt-1 text-sm font-semibold leading-snug">{userName || "Your profile"}</p>
          <button type="button" autoFocus onClick={closeMenu} aria-label="Close navigation sidebar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--color-aio-line)] text-xl hover:bg-[var(--color-aio-surface-2)]">×</button>
        </div>
        <nav aria-label="Sidebar navigation" className="mt-3 border-t border-[var(--color-aio-line)] pt-2">
          {renderProfileMenu(closeMenu)}
        </nav>
      </dialog>
    </header>
  );
}
