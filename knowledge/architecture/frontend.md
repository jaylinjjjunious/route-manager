# Frontend Architecture

## Purpose

Describes the React application structure, component hierarchy, state management, and rendering patterns.

## Current Implementation

### Component Tree

```
<StrictMode>
  <DebugProvider>
    <AuthProvider>
      <ProtectedApp>
        <StartupScreen />               (while loading)
        <LoginPage />                   (unauthenticated)
        <ResetPasswordPage />           (password reset)
        <App>                            (authenticated)
          <AioHeader />                  (Today/Jobs/More tabs)
          <Header />                     (legacy tabs)
          <main>
            <TodayScreen />              (today tab — readiness hero, next job, travel plan, week strip)
            <JobsScreen />               (jobs tab — schedule list)
            <MoreScreen />               (more tab — legacy feature hub)
            <InventoryTab />             (legacy)
            <BatteryTab />               (e-bike telemetry)
            <TrackerTab />               (end of day summary)
            <HabitsTab />                (mandatory shower habit)
            <ToolsTab />                 (Smart Aisle Scan, transit tools)
            <SettingsTab />              (hub address, theme, debug)
          </main>
          <BottomTabBar />               (Today / Jobs / More)
        </App>
      </ProtectedApp>
    </AuthProvider>
  </DebugProvider>
</StrictMode>
```

### Tab Structure

Three AIØ primary tabs plus five legacy feature tabs (reachable from More), defined in `src/App.tsx`:

| Tab | ID | Component | Protected | Purpose |
|-----|----|-----------|-----------|---------|
| Today | `dashboard` | `TodayScreen` | No | Authoritative route-planning screen: readiness hero, Next Best Job / Current Job, Today's Other Jobs, Travel Plan, This Week strip + expanded day panel |
| Jobs | `jobs` | `JobsScreen` | No | Schedule list: Today, later days, Route B standby, overdue/unscheduled review, Optimize/Add |
| More | `more` | `MoreScreen` | No | Hub for legacy tabs and actions (Proof Vault, Process Serve, Import, Debug Center, Sign Out) |
| Inventory | `inventory` | legacy | No | Store inventory custody & domains |
| Battery | `battery` | legacy | **Yes** | Jasion EB5 telemetry, range calculator |
| Tracker | `tracker` | legacy | **Yes** | End of day summary, ride telemetry |
| Habits | `habits` | legacy | No | Mandatory shower habit + custom habit tasks |
| Tools | `tools` | legacy | No | Smart Aisle Scan, imports, transit tools |
| Settings | `settings` | legacy | No | Hub address, theme, DB maintenance, Debug Center, sign out |

Protected tabs (`battery`, `tracker`) show a "Shower Gate Locked" overlay when `showerGateUnlocked` is false (temporarily bypassed while SHOWER_GATE_REQUIRED = false).

### State Management

All state lives in `App.tsx` using `useState` hooks. No Redux, Zustand, or Context for app state (auth uses AuthProvider context).

Key state groups:
- **Jobs**: `jobs`, `routeOrder`, `routeAJobs`, `archivedJobs`
- **Scheduling**: `today` (local LA date string, recomputed on focus/visibility/60s tick), `selectedStripDate`, `showScheduleReview`, `moveToDayJob`
- **Inventory**: `inventoryDomain`, `inventoryJobId`, domain-filtered job selection
- **Route**: `routeMetrics`, `routingProvider`, `nextRouteAJob`
- **Ride Mode**: `rideModeActive`, `currentStopIndex`, `rideSession`
- **Shower Gate**: `showerProofs`, `showerGateUnlocked`, `barcodeScanSuccess`
- **Habits**: `showerHabitLogs`, `showerHabitTasks`
- **Proof Vault**: `proofVault` (keyed by jobId)
- **Settings**: `startAddress`, `theme`, `debugCenterOpen`

### Scheduling derivations

Today's route pool, the weekly strip, and the expanded day panel all derive from `effectiveDay(job, today)` and `groupJobsByDay(jobs, today)` in `src/utils/jobSchedule.ts` (see ADR-016). Only derived filters change on the mid-day rollover — job state is never mutated and active rides are never silently re-sorted.

### Rendering Patterns

- **Today screen (dashboard)**: The AIØ Today screen is the authoritative route interface; the standalone Route tab was retired and `/route`, `/routes`, and `#route` redirect to Dashboard. Job rows open compact per-job detail panels while action buttons keep their own behavior.
- **Inventory domain selection**: The dedicated Inventory page resolves jobs without `inventoryDomain` to merchandising / secret-shopping and exposes explicit contract-parts jobs only when marked `inventoryDomain: 'contract_parts'`.
- **Conditional rendering** based on `currentTab` and `showerGateUnlocked`
- **Protected tab overlay**: Rendered before actual tab content when `!showerGateUnlocked`
- **Ride Mode**: Replaces entire dashboard with distraction-free execution surface
- **Shower Gate Panel**: Only renders on Dashboard when `!showerGateUnlocked && !rideModeActive`

### Mobile Considerations

- Bottom navigation is a floating pill (`.mobile-bottom-nav-shell`) fixed to bottom of viewport
- Camera scanning uses native `BarcodeDetector` API with `@zxing/browser` fallback
- iOS Safari requires `playsInline` on video elements
- HTTP camera access blocked on mobile; requires HTTPS (cloudflared tunnel for dev)
- Touch target sizes are minimum 48px for mobile buttons

### App Icons

The official application icon source is preserved at `public/branding/all-in-one-667-source-icon.png`. Safari iPhone home-screen installation uses `public/apple-touch-icon.png` through the `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />` tag in `index.html`. The app also ships `public/manifest.webmanifest` and a no-stale `public/sw.js` service worker for installed Home Screen PWA verification. The app header reuses `public/icons/icon-192.png` for the small logo next to the `All in One 667` title.

Generated icon outputs:
- `public/apple-touch-icon.png` - 180x180 for iPhone Safari Add to Home Screen
- `public/icons/icon-192.png` - 192x192 PNG
- `public/icons/icon-512.png` - 512x512 PNG
- `public/favicon-32x32.png` - 32x32 PNG
- `public/favicon-16x16.png` - 16x16 PNG

A maskable 512 icon is not currently generated because the supplied artwork has not been verified as adaptive-icon safe without risking crop or padding changes to the design.

### Browser Support

Targets modern mobile browsers (iOS Safari, Android Chrome) and desktop (Chrome, Firefox, Edge). No IE support.

## Dependencies

- `react` 19, `react-dom` 19
- `lucide-react` — Icons
- `motion` — Animations
- `@zxing/browser` — Barcode scanner fallback
- `@google/genai` — Gemini API (used via backend)
- `@supabase/supabase-js` — Auth client
- `tailwindcss` v4 — Styling
- `vite` 8 — Build tool

## Related Source Files

- `src/App.tsx` — Main application shell, Dashboard route cards, compact route job detail panel
- `src/main.tsx` — Entry point, auth bootstrap, real-device verification route bypass, and production service-worker registration
- `src/index.css` — Styles (249 lines)
- `src/types.ts` — Shared types (132 lines)
- `index.html` - Vite HTML shell, app icon, manifest, and iPhone PWA meta tags
- `public/branding/all-in-one-667-source-icon.png` - preserved official app icon source
- public/apple-touch-icon.png, public/icons/, public/favicon-*.png - generated icon outputs
- public/manifest.webmanifest, public/sw.js - installed-PWA manifest and no-stale service worker

## Related Knowledge

- `ui/navigation.md` — Tab navigation details
- `ui/design-system.md` — CSS architecture
- `ui/components.md` — Component documentation
- `features/shower-gate.md` — Shower gate feature

## Last Updated

2026-08-02 (aio-three-tab-redesign)
