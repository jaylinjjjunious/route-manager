# Route Optimization and Ride Mode

## Purpose

Greedy nearest-neighbor route optimization with battery-aware planning, Dashboard route management, and distraction-free ride execution mode.

## Current Implementation

### Dashboard Route Interface

Dashboard is the authoritative route interface. The standalone Route tab/page was retired; Dashboard owns the user-facing route workflow for next stop, Today's Route, per-job detail panels, navigation links, review/complete actions, move controls, revision alerts, route order, route updates, and route calculations.

Today's Route card surfaces are interactive: tapping the job number, store name, address, status, revision information, or empty card space opens a compact detail panel for that specific job. Existing Navigate, Review, and Move controls stop event propagation and keep their original behavior.

The underlying route system remains shared: `src/utils/routeUtils.ts`, route state in `src/App.tsx`, route/job types, battery-aware metrics, revision insertion, and Route A/Route B assignment logic are still active. Retired route destinations (`/route`, `/routes`, `#route`) redirect to Dashboard.

### Route Optimization Algorithm

**optimizeRoute** (src/utils/routeUtils.ts):
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

**DEFAULT_EBIKE_CONFIG** (src/utils/routeUtils.ts):
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

- **BakersfieldMapPreview**: Visual route preview
- **Route List**: Optimized order display with per-job card detail panels on Dashboard
- **Ride Mode**: Full-screen execution interface
- **Battery Tab**: Jasion EB5 battery summary

## Design Rationale

- **Greedy nearest-neighbor**: Simple, fast, sufficient for small job sets (<20 stops)
- **Priority-aware merge**: New jobs inserted based on priority without full re-optimization
- **Mock routing**: Avoids API costs; real GPS routing is overkill for local field work
- **Battery awareness**: Critical for eBike operations in Bakersfield heat

## Dependencies

- `routeUtils.ts` — core algorithms
- `BAKERSFIELD_COORDINATES` — 9 reference addresses
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

- `src/utils/routeUtils.ts` — core algorithms and config
- `src/App.tsx` — Ride Mode and route state
- `src/components/BakersfieldMapPreview.tsx` — shared map visualization component, currently not mounted by the retired Route tab

## Related Knowledge

- [Job System](./job-system.md) — jobs feed into route optimization
- [Habit Tracker](./habit-tracker.md) — shower requirement before ride
- [Voice System](./voice-system.md) — TTS for directions during ride

## Last Updated

2026-07-22 (dashboard-route-job-details)
