# All in One 667 Architecture

## Runtime Stack

- React 19 application.
- Vinext app-router entry under `app/`.
- Vite build configuration.
- Cloudflare Worker host through Vinext and the local Sites Vite plugin.
- Tailwind-style utility classes in component markup with global styles in `app/globals.css` and `src/index.css`.

## Main Entry Points

- `app/layout.tsx`: app metadata and global CSS import.
- `app/page.tsx`: client-side mounted guard, then renders `src/App.tsx`.
- `src/App.tsx`: main single-page application state, dashboard, Ride Mode, proof vault, settings, tabs, and workflow handlers.
- `src/main.tsx`: legacy Vite root entry that also renders `src/App.tsx`.
- `worker/index.ts`: Cloudflare Worker fetch handler and Vinext image optimization route.
- `vite.config.ts`: Vinext, Sites, and Cloudflare plugin setup.

## Component Boundaries

- `src/components/AIDispatcher.tsx`: local operations-command interpreter and dispatcher UI.
- `src/components/JobModal.tsx`: add/edit job modal, including process server fields.
- `src/components/JobImportSystem.tsx`: import UI for screenshot/OCR mock, manual paste, share-sheet mock, and partner mock.
- `src/components/JobCard.tsx`: job card rendering.
- `src/components/BakersfieldMapPreview.tsx`: route/map preview.
- `src/components/EndOfDaySummary.tsx`: day summary.
- `src/components/OutlierDetector.tsx`: outlier review.
- `src/components/RouteScoreGauge.tsx`: route score visualization.
- `src/components/RouteSummaryCard.tsx`: route metrics summary.

## Core Types

Defined in `src/types.ts`:

- `JobType`: retail audit, merchandising, mystery shop, field task, and process serve.
- `JobStatus`: ready, revisit, completed, pending, postponed, and outlier.
- `Job`: shared route item model.
- `ProcessServeDetails`: structured process server fields.
- `RouteMetrics`: route totals, battery estimate, earnings, and efficiency.
- `EbikeConfig`: battery and bike assumptions.
- `DispatcherAction` and `ChatMessage`: AI Dispatcher action/state types.

## Route And Battery Logic

Defined in `src/utils/routeUtils.ts`:

- Bakersfield coordinate lookup.
- Coordinate fallback resolver.
- Haversine distance calculation.
- Route optimization and route metric calculation.
- Outlier detection.
- Route scoring.
- Priority bonuses, including process serve priority.
- `RoutingProvider` interface and `MockRoutingProvider`.
- Smart revision merge route optimizer.

Current routing is local/mock-first. It is not yet real bike-navigation routing.

## State Flow

Most state lives in `src/App.tsx` as React state:

1. App loads saved jobs, start location, e-bike config, battery settings, ride state, proof vault, dispatcher messages, and ride logs from `localStorage`.
2. Jobs are filtered into Route A active work and Route B standby/tomorrow work.
3. Route A is optimized with smart merge logic.
4. Route metrics feed the dashboard, battery cards, dispatcher, and Ride Mode.
5. Completing a job updates the job list, creates proof vault data, updates ride counters, learns battery performance, and recalculates active route state.
6. Ending a ride produces a ride summary and persists a tracker session log.

## Local Storage Keys

Current browser storage includes:

- `route_optimizer_jobs`
- `route_optimizer_start`
- `route_optimizer_config`
- `route_optimizer_theme`
- `ebike_current_battery`
- `ebike_assist_level`
- `ebike_rider_weight`
- `ebike_cargo_weight`
- `ebike_weather_wind`
- `ebike_terrain`
- `battery_tracker_learned_percent_per_mile`
- `ride_tracker_status`
- `ride_tracker_ride_time`
- `ride_tracker_store_time`
- `ride_tracker_total_day_time`
- `ride_tracker_start_battery`
- `ride_tracker_jobs_completed`
- `ride_tracker_sessions`
- `jobs_moved_to_tomorrow`
- `proof_vault_records`
- `dispatcher_chat_messages`

There is no durable server database currently configured. `.openai/hosting.json` has no D1 or R2 binding.

## Proof Vault Flow

Proof data is stored locally under `proof_vault_records`.

When a job is completed:

- A proof record is created if one does not exist.
- Store/job name, address, completion time, arrival time, GPS placeholder, and notes are saved.
- Process server jobs generate richer notes from process serve fields.
- Photos, screenshots, and receipts can be added later through file input.

File assets are represented as browser object/data URLs in local state, so long-term persistence should be revisited before production proof storage.

## AI Dispatcher Flow

`AIDispatcher` is deterministic and local:

- Parses commands such as "What's next?", "Can I finish today?", "Complete this job", "Move this job", "Jobs left", and "Re-optimize".
- Builds a `DispatcherAction`.
- Calls `onExecuteAction` in `src/App.tsx`.
- App state changes happen through existing handlers.

This is not currently a server-side AI agent.

## Voice Flow

- `src/hooks/useTextToSpeech.ts` exposes speech state and controls.
- `src/utils/voiceProviders.ts` provides browser speech and future premium provider wrappers.
- Premium providers call `/api/dispatcher/tts`, but no implementation is documented in the current inspected files.
- Browser speech is the reliable fallback.

## Import Flow

`JobImportSystem` supports:

- Mock OCR templates.
- Manual raw paste parsing.
- Share-sheet simulation.
- Partner OAuth simulation.

The screenshot OCR path calls `/api/import/ocr`, which should be treated as a provider endpoint requirement before relying on real OCR.

## Build And Deployment

Build commands from `package.json`:

- `npm run lint`: TypeScript check with `tsc --noEmit`.
- `npm run build`: Vinext build.
- `npm run dev`: local Vinext development server.

Hosting:

- Sites project id: `appgprj_6a5135d24f18819187875b0514e19552`.
- Cloudflare Worker entry: `worker/index.ts`.
- GitHub remote is configured separately from the Sites remote.
