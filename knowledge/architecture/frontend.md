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
          <Header />                     (when not on dashboard)
          <main>
            <ShowerGatePanel />          (dashboard, gate locked)
            <RideModeV2 />               (dashboard, ride mode)
            <RouteTab />                 (route optimization)
            <JobsTab />                  (job list, import)
            <BatteryTab />               (e-bike telemetry)
            <TrackerTab />               (end of day summary)
            <HabitsTab />                (mandatory shower habit)
            <SettingsTab />              (hub address, theme, debug)
          </main>
          <BottomNav />                  (floating pill navigation)
        </App>
      </ProtectedApp>
    </AuthProvider>
  </DebugProvider>
</StrictMode>
```

### Tab Structure

Seven app tabs defined at `src/App.tsx:128`:

| Tab | ID | Protected | Purpose |
|-----|----|-----------|---------|
| Dashboard | `dashboard` | No | Shower gate, ride mode toggle, quick actions |
| Route | `route` | Yes | Route optimization, routing provider, sequence |
| Jobs | `jobs` | Yes | Job list, sub-tabs (Active, Secure Import, Archived), proof vault |
| Battery | `battery` | Yes | Jasion EB5 telemetry, range calculator |
| Tracker | `tracker` | Yes | End of day summary, ride telemetry |
| Habits | `habits` | No | Mandatory shower habit + custom habit tasks |
| Settings | `settings` | No | Hub address, theme, DB maintenance, Debug Center, sign out |

Protected tabs (`route`, `jobs`, `battery`, `tracker`) show a "Shower Gate Locked" overlay when `showerGateUnlocked` is false.

### State Management

All state lives in `App.tsx` using `useState` hooks. No Redux, Zustand, or Context for app state (auth uses AuthProvider context).

Key state groups:
- **Jobs**: `jobs`, `routeOrder`, `routeAJobs`, `archivedJobs`
- **Route**: `routeMetrics`, `routingProvider`, `nextRouteAJob`
- **Ride Mode**: `rideModeActive`, `currentStopIndex`, `rideSession`
- **Shower Gate**: `showerProofs`, `showerGateUnlocked`, `barcodeScanSuccess`
- **Habits**: `showerHabitLogs`, `showerHabitTasks`
- **Proof Vault**: `proofVault` (keyed by jobId)
- **Settings**: `startAddress`, `theme`, `debugCenterOpen`

### Rendering Patterns

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

The official application icon source is preserved at `public/branding/all-in-one-667-source-icon.png`. Safari iPhone home-screen installation uses `public/apple-touch-icon.png` through the `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />` tag in `index.html`. The app header reuses `public/icons/icon-192.png` for the small logo next to the `All in One 667` title.

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

- `src/App.tsx` — Main application (5837 lines)
- `src/main.tsx` — Entry point (62 lines)
- `src/index.css` — Styles (249 lines)
- `src/types.ts` — Shared types (132 lines)
- `index.html` - Vite HTML shell and app icon link tags
- `public/branding/all-in-one-667-source-icon.png` - preserved official app icon source
- `public/apple-touch-icon.png`, `public/icons/`, `public/favicon-*.png` - generated icon outputs

## Related Knowledge

- `ui/navigation.md` — Tab navigation details
- `ui/design-system.md` — CSS architecture
- `ui/components.md` — Component documentation
- `features/shower-gate.md` — Shower gate feature

## Last Updated

2026-07-22 (7efb4ec)
