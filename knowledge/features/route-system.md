# Route Optimization and Ride Mode

## Purpose

Greedy nearest-neighbor route optimization with battery-aware planning, Dashboard route management, and distraction-free ride execution mode.

## Current Implementation

### Dashboard Route Interface

Dashboard is the authoritative route interface. The standalone Route tab/page was retired; Dashboard owns the user-facing route workflow for next stop, Today's Route, per-job detail panels, navigation links, review/complete actions, move controls, revision alerts, route order, route updates, and route calculations.

### Scheduling (Phase 1) integration

Today's Route pool = Route A jobs whose `effectiveDay(job, today) === today` (`src/features/jobs/jobSchedule.ts`). Future-dated jobs live on standby (Route B) and are excluded from today's pool; they are surfaced through the dashboard weekly strip (`WeeklyStrip`), per-day detail (`ExpandedDayPanel`), and the unscheduled/overdue review list. Moving a job to a future day sets `routeId: 'B'`; moving to today sets `routeId: 'A'`. Route re-optimization only ever runs over today's executable pool — future-dated Route A jobs are never re-ordered. Completed `finished` Route A jobs still roll into Route B at day end. Midday rollover only recomputes derived filters; active rides are never silently re-sorted.

Today's Route card surfaces are interactive: tapping the card surface opens a `DashboardJobDetailSheet` bottom-sheet modal that renders the shared `JobCard` component (the same visual design as the Jobs tab). The sheet includes a compact route-info header (stop number, leg distance, ride time) and footer actions (Navigate, Open in Jobs). Existing Navigate, Review, and Move controls on the route card stop event propagation and keep their original behavior.

The underlying route planning algorithms live in `src/features/routePlanning/routeUtils.ts`. Route-planning state, derived route values, continuous optimization monitor state, and route simulation lifecycle live in `src/features/routePlanning/useRoutePlanning.ts`. `src/App.tsx` still owns cross-feature orchestration and configuration boundaries such as job mutations/storage, battery config mutation, dispatcher routing, transit fetching, and screen composition. Retired route destinations (`/route`, `/routes`, `#route`) redirect to Dashboard.

### Route Optimization Algorithm

**optimizeRoute** (`src/features/routePlanning/routeUtils.ts`):
- Greedy nearest-neighbor algorithm
- Starts from Bakersfield coordinates
- Iteratively selects closest unvisited stop
- Time complexity: O(n²)

**optimizeRouteWithSmartMerge**:
- Priority-aware variant of optimizeRoute
- Considers job priority when inserting new stops
- Merges new jobs into existing optimized route

### Routing Providers

```typescript
interface RoutingProvider {
  getRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult>;
}
```

- **MockRoutingProvider** (default): Returns straight-line distance calculations
- Pluggable interface for future live API integration

### Route Metrics

| Metric | Description |
|--------|-------------|
| `totalPay` | Sum of all job pay |
| `totalRideTime` | Travel time between stops |
| `totalWorkTime` | Sum of estimatedMinutes |
| `totalDistance` | Total miles traveled |
| `batteryPercent` | Battery usage estimate |
| `payPerHourRatio` | $/hr efficiency metric |

### Battery-Aware Routing

**DEFAULT_EBIKE_CONFIG** (`src/features/battery/batteryUtils.ts`, re-exported by `src/features/routePlanning/routeUtils.ts` for compatibility):
```typescript
{
  name: 'Jasion EB5',
  capacityWh: 360,
  avgSpeedMph: 18,
  efficiencyPercentPerMile: 2.8,
  estimatedRangeMiles: 36
}
```

- Dynamic range calculation based on battery percentage
- Battery-aware routing prevents stranding
- Real-time battery estimation during route execution

### Ride Mode

**Distraction-free execution surface:**
- Hides bottom navigation
- Shows current stop and next stop
- Tracks current stop index
- Ride session timing (start/end)
- End-of-ride summary with metrics

**Dynamic Sequence Optimizer:**
- Re-optimizes remaining stops
- Shows outlier warnings during ride
- Allows skipping/completing stops in sequence

### Route Planning Hook

`useRoutePlanning` receives the current jobs, Route A subsets, start coordinates/address, e-bike config, current battery, learned battery factor, live ride distance, and travel mode. It owns route-owned local state (`lastOptimizationLog`, `isOptimizing`, simulation state), route monitor refs, route metrics/outlier/next-stop derivations, Google Maps route URL construction, and simulation timer cleanup/progression. It returns values and command callbacks only; it does not expose raw React setters.

## Architecture

### Data Flow

```
Jobs → optimizeRoute → Optimized List → Ride Mode
                ↓
        Route Metrics → Battery Tab
                ↓
        Ride Session → Completion Summary
```

### Key Components

- **BakersfieldMapPreview**: Visual route preview (`src/features/routePlanning/BakersfieldMapPreview.tsx`)
- **RouteSummaryCard / RouteScoreGauge / OutlierDetector**: Route-owned UI now lives under `src/features/routePlanning/`
- **Route List**: Optimized order display with per-job detail via `DashboardJobDetailSheet` on Dashboard
- **Ride Mode**: Full-screen execution interface
- **Battery Tab**: Jasion EB5 battery summary (`src/features/battery/BatteryTab.tsx`; state/persistence owned by `src/features/battery/useBattery.ts`)

## Design Rationale

- **Greedy nearest-neighbor**: Simple, fast, sufficient for small job sets (<20 stops)
- **Priority-aware merge**: New jobs inserted based on priority without full re-optimization
- **Mock routing**: Avoids API costs; real GPS routing is overkill for local field work
- **Battery awareness**: Critical for eBike operations in Bakersfield heat

## Dependencies

- `src/features/routePlanning/routeUtils.ts` — core route-planning algorithms
- `src/features/routePlanning/useRoutePlanning.ts` — route-planning state, monitor, derivations, and simulation lifecycle
- `src/features/routePlanning/types.ts` — route-planning hook result/support types
- `src/features/battery/useBattery.ts` — e-bike config, current battery, battery factor/range/risk calculations, persistence, restore, and ride-learning actions
- `src/features/battery/batteryUtils.ts` — default Jasion EB5 config and pure battery calculations
- `src/utils/routeUtils.ts` — compatibility re-export shim for old imports during extraction
- `src/utils/geoUtils.ts` — shared Haversine distance helper used by route planning, Jobs scheduling UI, and Dispatcher
- `BAKERSFIELD_COORDINATES` (`src/utils/bakersfieldCoordinates.ts`) — 9 shared Bakersfield reference addresses used by routing, seed jobs, dispatcher, imports, and transit planning
- GPS API for live position tracking
- localStorage for ride session state

## Business Rules

1. Route optimization considers all `ready` and `revisit` status jobs
2. `outlier` jobs (>4.2 miles) are flagged but not removed from route
3. Ride Mode tracks completion in sequence
4. Battery must have sufficient charge to complete remaining route
5. Dynamic re-optimization available during ride
6. Pay/hour ratio calculated for route efficiency comparison

## Security

- GPS coordinates used only for routing calculations
- No location data transmitted to external services
- Ride session data stored locally

## Edge Cases

- **Zero jobs**: Route optimization returns empty list
- **Single job**: No optimization needed, direct to job
- **All outliers**: Every job flagged, manual selection required
- **Battery critical**: Route truncated at battery limit
- **GPS signal loss**: Ride Mode pauses until reacquired

## Failure Modes

- GPS unavailable → route optimization skipped
- Battery estimation inaccurate → potential stranding
- Mock routing doesn't account for real traffic/roads
- localStorage corruption → ride session lost

## Testing

- Manual test: Add jobs → optimize route → verify order
- Test battery estimation with known distances
- Test Ride Mode: start → complete stops → end summary
- Test dynamic re-optimization during ride
- Test outlier detection thresholds

## Known Limitations

- Mock routing only — no live traffic or road data
- Greedy nearest-neighbor not globally optimal (TSP approximation)
- Battery estimation based on flat efficiency, not terrain/weight
- No turn-by-turn navigation
- No real-time traffic integration

## Future Improvements

- Live routing API integration (Google Maps, Mapbox)
- Global route optimization (simulated annealing, genetic algorithm)
- Real-time battery telemetry from eBike
- Turn-by-turn navigation via TTS
- Traffic-aware routing
- Multi-day route planning

## Related Source Files

- `src/features/routePlanning/routeUtils.ts` — core algorithms and config
- `src/features/routePlanning/useRoutePlanning.ts` — route state, continuous monitor, next-stop/route-list derivations, and simulation actions
- `src/features/routePlanning/types.ts` — feature-local route planning types
- `src/utils/routeUtils.ts` — compatibility re-export shim
- `src/utils/geoUtils.ts` — shared coordinate distance utility
- `src/features/jobs/jobSchedule.ts` — effective-day pooling that gates today's route
- `src/App.tsx` — cross-feature route orchestration, configuration ownership, transit fetching handoff, and screen composition
- `src/features/routePlanning/BakersfieldMapPreview.tsx` — shared map visualization component, currently not mounted by the retired Route tab
- `src/features/routePlanning/RouteSummaryCard.tsx` — route metrics summary card
- `src/features/routePlanning/RouteScoreGauge.tsx` — route quality score UI
- `src/features/routePlanning/OutlierDetector.tsx` — geographic outlier warning UI

## Related Knowledge

- [Job System](./job-system.md) — jobs feed into route optimization (incl. scheduling)
- [Habit Tracker](./habit-tracker.md) — shower requirement before ride
- [Voice System](./voice-system.md) — TTS for directions during ride

## Last Updated

2026-08-08 (battery extraction Step 2: Battery-owned state, persistence, default e-bike config, range/risk calculations, and learning logic moved into `src/features/battery/`; route-planning extraction remains complete)
