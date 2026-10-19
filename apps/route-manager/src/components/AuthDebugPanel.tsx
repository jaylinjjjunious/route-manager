import React, { useEffect, useState } from "react";
import {
  getAuthDebugState,
  subscribeAuthDebug,
  authDebugStorageCheck,
  authDebugPathname,
  type AuthDebugState,
} from "../auth/authDebug";

export default function AuthDebugPanel() {
  const [, forceUpdate] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const unsub = subscribeAuthDebug(() => forceUpdate((n) => n + 1));
    const interval = setInterval(() => {
      authDebugStorageCheck();
      authDebugPathname();
      forceUpdate((n) => n + 1);
    }, 500);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const s: AuthDebugState = getAuthDebugState();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 8,
        left: 8,
        zIndex: 99999,
        maxWidth: collapsed ? 180 : 380,
        maxHeight: collapsed ? undefined : 320,
        overflow: collapsed ? undefined : "auto",
        background: "rgba(0,0,0,0.88)",
        color: "#d1d5db",
        borderRadius: 8,
        padding: collapsed ? "6px 10px" : "10px 12px",
        fontFamily: "monospace",
        fontSize: 11,
        lineHeight: "15px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
        userSelect: "none",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div
        style={{ cursor: "pointer", fontWeight: "bold", color: "#facc15", marginBottom: collapsed ? 0 : 6 }}
        onClick={() => setCollapsed((c) => !c)}
      >
        AUTH DEBUG {collapsed ? "▸" : "▾"}
      </div>
      {collapsed ? (
        <div style={{ color: s.sessionPresent ? "#4ade80" : "#f87171" }}>
          session: {s.sessionPresent ? "yes" : "no"}
        </div>
      ) : (
        <>
          <Row label="pathname" value={s.pathname} />
          <Row label="AuthProvider mounted" value={s.authProviderMounted ? "yes" : "no"} color={s.authProviderMounted ? "#4ade80" : "#f87171"} />
          <Row label="auth loading" value={String(s.authLoading)} color={s.authLoading ? "#facc15" : "#4ade80"} />
          <Row label="session present" value={s.sessionPresent ? "yes" : "no"} color={s.sessionPresent ? "#4ade80" : "#f87171"} />
          <Row label="user present" value={s.userPresent ? "yes" : "no"} color={s.userPresent ? "#4ade80" : "#f87171"} />
          <Row label="last auth event" value={s.lastAuthEvent} />
          <Row label="event time" value={s.lastAuthEventTime} />
          <Row label="protected rendered" value={s.protectedAppRendered ? "yes" : "no"} color={s.protectedAppRendered ? "#4ade80" : "#9ca3af"} />
          <Row label="login rendered" value={s.loginPageRendered ? "yes" : "no"} color={s.loginPageRendered ? "#f87171" : "#9ca3af"} />
          <Row label="last API status" value={s.lastApiStatus !== null ? String(s.lastApiStatus) : "(none)"} color={s.lastApiStatus === 401 ? "#f87171" : s.lastApiStatus !== null ? "#4ade80" : "#9ca3af"} />
          {s.lastApiUrl && <Row label="last API url" value={s.lastApiUrl} />}
          <Row label="last nav dest" value={s.lastNavigationDest || "(none)"} />
          <Row label="signOut called" value={s.signOutCalled ? "YES" : "no"} color={s.signOutCalled ? "#f87171" : "#4ade80"} />
          {s.signOutCaller && <Row label="signOut caller" value={s.signOutCaller} color="#f87171" />}
          <Row label="storage entry" value={s.supabaseStorageExists ? "exists" : "GONE"} color={s.supabaseStorageExists ? "#4ade80" : "#f87171"} />
          <div style={{ marginTop: 6, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 4 }}>
            <div style={{ color: "#9ca3af", fontWeight: "bold", marginBottom: 2 }}>Event Log</div>
            <div style={{ maxHeight: 100, overflow: "auto" }}>
              {s.events.length === 0 && <div style={{ color: "#6b7280" }}>(no events)</div>}
              {s.events.map((e, i) => (
                <div key={i} style={{ color: e.event.includes("401") || e.event.includes("GONE") || e.event.includes("UNMOUNTED") ? "#f87171" : e.event.includes("yes") || e.event.includes("EXISTS") || e.event.includes("MOUNTED") ? "#4ade80" : "#d1d5db" }}>
                  {e.time} {e.event}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <span style={{ color: "#9ca3af", whiteSpace: "nowrap" }}>{label}:</span>
      <span style={{ color: color || "#e5e7eb", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}
