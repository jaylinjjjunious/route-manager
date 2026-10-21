import React from "react";

export type ProfileDestination = "inventory" | "battery" | "tracker" | "habits" | "tools" | "checkin" | "changepassword" | "admin" | "diagnostics" | "support";

interface ProfileMenuProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  startAddress: string;
  onUpdateStart: (address: string) => void;
  onNavigate: (destination: ProfileDestination) => void;
  onOpenProof: () => void;
  onSignOut: () => void;
  isAdmin?: boolean;
  onOpenTestLab?: () => void;
  onResetLifecycle?: () => void;
  onResetSonic?: () => void;
}

const rowClass = "flex min-h-11 w-full items-center rounded-lg px-2 py-2 text-left text-sm font-medium hover:bg-[var(--color-aio-surface-2)] focus-visible:outline focus-visible:outline-2";

export default function ProfileMenu(props: ProfileMenuProps) {
  const row = (label: string, action: () => void) => <button type="button" className={rowClass} onClick={action}>{label}</button>;
  return (
    <div className="space-y-1" aria-label="Profile controls">
      <details>
        <summary className={`${rowClass} cursor-pointer list-item`}>Starting address</summary>
        <form className="px-2 pb-3" onSubmit={event => {
          event.preventDefault();
          const address = String(new FormData(event.currentTarget).get("address") || "").trim();
          if (address) props.onUpdateStart(address);
        }}>
          <label htmlFor="profile-start-address" className="text-xs text-[var(--color-aio-text-2)]">Where your route starts</label>
          <input key={props.startAddress} id="profile-start-address" name="address" defaultValue={props.startAddress} required className="mt-2 w-full min-w-0 rounded-lg border border-[var(--color-aio-line)] bg-[var(--color-aio-bg)] p-2 text-sm" />
          <button type="submit" className={rowClass}>Save starting address</button>
        </form>
      </details>
      {row(props.theme === "dark" ? "Switch to light mode" : "Switch to dark mode", props.onToggleTheme)}
      {row("Monthly Check-In", () => props.onNavigate("checkin"))}
      {row("Proof Vault", props.onOpenProof)}
      {row("Inventory", () => props.onNavigate("inventory"))}
      <details>
        <summary className={`${rowClass} cursor-pointer list-item`}>Ride tools</summary>
        <div className="ml-3 border-l border-[var(--color-aio-line)] pl-2">
          {row("Battery", () => props.onNavigate("battery"))}
          {row("Tracker", () => props.onNavigate("tracker"))}
          {row("Transit tools", () => props.onNavigate("tools"))}
        </div>
      </details>
      {row("Habits", () => props.onNavigate("habits"))}
      <details>
        <summary className={`${rowClass} cursor-pointer list-item`}>Support & diagnostics</summary>
        <div className="ml-3 border-l border-[var(--color-aio-line)] pl-2">
          {row("Debug Center", () => props.onNavigate("support"))}
          {props.isAdmin && row("Diagnostics Console", () => props.onNavigate("diagnostics"))}
          {props.onOpenTestLab && row("Smart Aisle Scan Test Lab", props.onOpenTestLab)}
          {props.onResetLifecycle && row("Reset Lifecycle Test Job", props.onResetLifecycle)}
          {props.onResetSonic && row("Reset Sonic Test Jobs", props.onResetSonic)}
        </div>
      </details>
      {props.isAdmin && row("Admin Portal", () => props.onNavigate("admin"))}
      <div className="mt-2 border-t border-[var(--color-aio-line)] pt-2">
        {row("Change password", () => props.onNavigate("changepassword"))}
        {row("Sign out", props.onSignOut)}
      </div>
    </div>
  );
}
