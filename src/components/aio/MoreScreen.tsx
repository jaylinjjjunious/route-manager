import React from "react";
import {
  Award,
  Battery,
  Briefcase,
  Bug,
  Camera,
  FileImage,
  FolderOpen,
  LogOut,
  Moon,
  PackageCheck,
  Settings,
  Sun,
  Timer,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GradientIconTile } from "./primitives";
import ChangePasswordPanel from "../auth/ChangePasswordPanel";

const AVATAR_PATH = "/profile/avatar.webp";

type LegacyTab = "inventory" | "battery" | "tracker" | "habits" | "tools" | "settings";

export interface MoreScreenProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  userEmail?: string;
  onNavigate: (tab: LegacyTab) => void;
  onOpenProofHistory: () => void;
  onOpenDebugCenter: () => void;
  onAddProcessServe: () => void;
  onImportScreenshots: () => void;
  lifecycleHarnessEnabled?: boolean;
  onResetLifecycleHarness?: () => void;
  onSignOut: () => void;
}

const FEATURES: { id: LegacyTab; label: string; subtitle: string; icon: LucideIcon; gradient: string }[] = [
  { id: "inventory", label: "Inventory", subtitle: "Store inventory custody & domains", icon: PackageCheck, gradient: "bg-gradient-to-br from-[#0A84FF] to-[#5AC8FA]" },
  { id: "battery", label: "Battery", subtitle: "Battery status, range, and charging", icon: Battery, gradient: "bg-gradient-to-br from-[#30D158] to-[#64D2FF]" },
  { id: "tracker", label: "Tracker", subtitle: "Ride timer and earnings tracker", icon: Timer, gradient: "bg-gradient-to-br from-[#FF9F0A] to-[#FFD60A]" },
  { id: "habits", label: "Habits", subtitle: "Daily routines and streaks", icon: Award, gradient: "bg-gradient-to-br from-[#BF5AF2] to-[#FF2D55]" },
  { id: "tools", label: "Tools", subtitle: "Smart Aisle Scan, imports, transit tools", icon: Camera, gradient: "bg-gradient-to-br from-[#30B0C7] to-[#64D2FF]" },
  { id: "settings", label: "Settings", subtitle: "Hub address, theme, database", icon: Settings, gradient: "bg-gradient-to-br from-[#8E8E93] to-[#C7C7CC]" },
];

const LINKS: { label: string; subtitle: string; icon: LucideIcon; gradient: string; action: "proof" | "debug" | "process_serve" | "import" }[] = [
  { label: "Proof Vault", subtitle: "Photos, screenshots, and receipts", icon: FolderOpen, gradient: "bg-gradient-to-br from-[#0A84FF] to-[#AF52DE]", action: "proof" },
  { label: "Add Process Serve", subtitle: "Log a legal process-serve stop", icon: Briefcase, gradient: "bg-gradient-to-br from-[#FF453A] to-[#FF9F0A]", action: "process_serve" },
  { label: "Import Job Screenshots", subtitle: "Upload screenshots of assignments", icon: FileImage, gradient: "bg-gradient-to-br from-[#AF52DE] to-[#5AC8FA]", action: "import" },
  { label: "Debug Center", subtitle: "System diagnostics and logs", icon: Bug, gradient: "bg-gradient-to-br from-[#48484A] to-[#8E8E93]", action: "debug" },
];

function FeatureRow({
  icon,
  gradient,
  label,
  subtitle,
  onClick,
  trailing,
}: {
  icon: LucideIcon;
  gradient: string;
  label: string;
  subtitle: string;
  onClick: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[18px] px-2 py-3 text-left transition-colors hover:bg-[var(--color-aio-surface-2)] active:bg-[var(--color-aio-surface-2)]"
    >
      <GradientIconTile icon={icon} gradient={gradient} />
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold leading-tight tracking-[-0.01em] text-[var(--color-aio-text)]">{label}</span>
        <span className="mt-0.5 block truncate text-[13px] font-medium text-[var(--color-aio-text-2)]">{subtitle}</span>
      </span>
      {trailing}
      <ChevronRight size={18} className="shrink-0 text-[var(--color-aio-text-3)]" aria-hidden="true" />
    </button>
  );
}

export default function MoreScreen(props: MoreScreenProps) {
  return (
    <div className="space-y-5" id="tab-view-more">
      <div>
        <p className="aio-label text-[13px]">Everything else</p>
        <h1 className="mt-0.5 text-[28px] font-black leading-none tracking-[-0.02em] text-[var(--color-aio-text)]">More</h1>
      </div>

      <section aria-label="Account">
        <div className="space-y-3">
          <div className="aio-card flex items-center gap-3 p-4">
            <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[var(--color-aio-line)] bg-[var(--color-aio-surface)]">
              <img
                src={AVATAR_PATH}
                alt={`${props.userEmail || "Account"} profile picture`}
                className="h-full w-full object-cover"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-bold text-[var(--color-aio-text)]">{props.userEmail || "Signed in"}</p>
              <p className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-aio-text-2)]">
                <ShieldCheck size={13} /> Authenticated
              </p>
            </div>
            <button
              type="button"
              onClick={props.onToggleTheme}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-aio-line)] bg-[var(--color-aio-surface)] text-[var(--color-aio-text-2)]"
              aria-label={props.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {props.theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          <ChangePasswordPanel />
        </div>
      </section>

      <section aria-label="Tools and features">
        <div className="aio-card p-2">
          <div className="divide-y divide-[var(--color-aio-line)]">
            {FEATURES.map(feature => (
              <FeatureRow
                key={feature.id}
                icon={feature.icon}
                gradient={feature.gradient}
                label={feature.label}
                subtitle={feature.subtitle}
                onClick={() => props.onNavigate(feature.id)}
              />
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Links">
        <div className="aio-card p-2">
          <div className="divide-y divide-[var(--color-aio-line)]">
            {LINKS.map(link => (
              <FeatureRow
                key={link.action}
                icon={link.icon}
                gradient={link.gradient}
                label={link.label}
                subtitle={link.subtitle}
                onClick={() => {
                  switch (link.action) {
                    case "proof": props.onOpenProofHistory(); break;
                    case "process_serve": props.onAddProcessServe(); break;
                    case "import": props.onImportScreenshots(); break;
                    default: props.onOpenDebugCenter();
                  }
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {props.lifecycleHarnessEnabled && props.onResetLifecycleHarness && (
        <section aria-label="Development lifecycle harness">
          <div className="aio-card p-4">
            <p className="aio-label text-[12px] text-[#B25000] dark:text-[#FF9F0A]">Development</p>
            <h2 className="mt-1 text-[17px] font-black text-[var(--color-aio-text)]">Lifecycle Acceptance Harness</h2>
            <p className="mt-1 text-[13px] font-medium leading-relaxed text-[var(--color-aio-text-2)]">
              Reset the fake technician job to planned/ready and open it from Jobs.
            </p>
            <button
              type="button"
              onClick={props.onResetLifecycleHarness}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#FF9F0A]/25 bg-[#FF9F0A]/10 px-4 py-2.5 text-[14px] font-black text-[#B25000] dark:text-[#FFCC00]"
            >
              <RefreshCw size={16} />
              Reset Lifecycle Test Job
            </button>
          </div>
        </section>
      )}

      <section aria-label="Sign out">
        <button
          type="button"
          onClick={props.onSignOut}
          className="flex w-full items-center gap-3 rounded-[18px] border border-[#FF453A]/25 bg-[#FF453A]/8 px-4 py-3.5 text-left text-[15px] font-bold text-[#D70015] dark:text-[#FF453A]"
        >
          <LogOut size={18} strokeWidth={2.2} />
          Sign Out
        </button>
        <p className="aio-caption mt-2 px-1 text-[12px]">
          Legacy screens remain reachable from this menu. Nothing has been removed.
        </p>
      </section>
    </div>
  );
}
