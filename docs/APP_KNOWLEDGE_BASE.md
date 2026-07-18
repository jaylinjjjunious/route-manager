# Route Manager Application Knowledge Base

Last updated: 2026-07-18

Maintenance rule: update this file at the end of every development task that changes behavior, data models, APIs, routing, deployment, tests, limitations, or known problems. Do not store secrets, proof images, private contact information, payment information, tokens, or sensitive personal data here.

## 1. Product Overview

Route Manager / Route Optimizer is a mobile-first field-work mission-control app for an e-bike gig worker in Bakersfield. It helps plan, execute, track, and prove completion for mixed work such as retail audits, merchandising, mystery shops, delivery-style field tasks, revisions, and process-server jobs.

The core user problem is fast field execution: answer "what do I do next?", preserve battery, avoid wasted miles, track earnings, protect proof, and keep work safe enough to complete. The app currently combines route planning, job state, battery risk, Ride Mode, proof folders, habits, and a local AI Dispatcher-style command panel.

The AI Dispatcher is currently an operations command interpreter in `src/components/AIDispatcher.tsx`. It is not a general chatbot in the deployed app. It can read active route state, answer common route questions, run deterministic route actions through callbacks, and fetch a safety news brief from the hosted Worker.

Current development stage: active prototype / personal daily-use app. Many workflows are usable, but important persistence, provider, and production-hardening gaps remain.

## 2. Product Principles

- Mobile-first: bottom navigation, large controls, and phone-oriented field workflows are primary.
- High contrast and outdoor readability: bold text, strong color states, and dark/light themes are used.
- Large readable text: dashboard and Ride Mode prioritize large labels and numbers.
- Minimal scrolling in execution: Dashboard and Ride Mode try to surface next stop, route, battery, earnings, and jobs left first.
- One-handed use: bottom navigation and large action buttons are used for common actions.
- Glance Mode: Dashboard acts as a quick "mission control" readout.
- Ride Mode: manual, focused mode started by "I'm Riding"; it hides bottom nav while active.
- Important information first: next stop, shower lock state, jobs left, battery, and earnings appear before deeper tools.
- Do not encourage interaction while actively riding: Ride Mode is simplified, but the app still contains interactive controls; the user should interact only while stopped.
- Preserve time, battery, earnings, safety, and proof: route, battery, safety, and proof features are treated as core field protections.

## 3. Technology Stack

- Frontend framework: React 19 with Vinext app-router entry under `app/`.
- Language: TypeScript.
- Styling system: Tailwind-style utility classes plus global CSS in `src/index.css`, `app/globals.css`, and fallback CSS in `public/route-manager-fallback.css`.
- Router/navigation: single-page tab state in `src/App.tsx`; hash values map to bottom navigation tabs.
- State management: React `useState`, `useEffect`, and local component state. No Redux or external state library.
- Storage/database: browser `localStorage` for jobs, battery, ride sessions, proof vault, dispatcher messages, and local fallback habit/shower metadata; Cloudflare D1 binding `DB` for `/api/habits`, legacy `/api/shower-proof`, and Mission Control `/api/shower-proofs`.
- Build system: Vinext and Vite configured in `vite.config.ts`; custom Sites plugin in `build/sites-vite-plugin.ts`.
- Testing tools: TypeScript check through `npm run lint`; Vinext build through `npm run build`; Playwright script `tests/habit-ui-check.cjs` through `npm run test:habits`.
- AI provider: `@google/genai` is used by the standalone Express `server.ts` endpoints. The deployed Worker does not currently expose those Gemini OCR/chat/TTS Express routes.
- Maps provider: optional Google Maps Platform through `@vis.gl/react-google-maps` in `src/components/BakersfieldMapPreview.tsx`; fallback is SVG/GIS-style local map.
- Voice provider: browser Web Speech API fallback in `src/utils/voiceProviders.ts`; premium provider wrappers call `/api/dispatcher/tts`, which is not exposed by the deployed Worker.
- Barcode scanning: native `BarcodeDetector` when UPC-A is supported; fallback `@zxing/browser` and `@zxing/library` one-dimensional UPC-A reader.
- Camera/media: `navigator.mediaDevices.getUserMedia`, `<video>`, `Image`, canvas image resizing for proof attachments, and camera torch constraints when available.
- Hosting/deployment: OpenAI Sites / Cloudflare Worker. `.openai/hosting.json` has project id `appgprj_6a5135d24f18819187875b0514e19552`, D1 binding `DB`, and no R2 binding.

## 4. Repository Structure

- `app/layout.tsx`: Vinext/Next-style root layout, metadata, global CSS, and fallback stylesheet link.
- `app/page.tsx`: client page that renders `src/App.tsx`.
- `src/main.tsx`: legacy Vite SPA entry with startup screen and dynamic import of `App.tsx`.
- `src/App.tsx`: main application shell, tabs, state, workflows, dashboard, Ride Mode, battery, habits, shower gate, proof vault modal, and job actions.
- `src/types.ts`: shared job, route, dispatcher, e-bike, and process-server types.
- `src/utils/routeUtils.ts`: Bakersfield coordinates, haversine distance, mock routing, route metrics, outlier detection, route scoring, smart revision merge, and routing provider interface.
- `src/utils/jobState.ts`: canonical job-state normalization helpers.
- `src/utils/showerCycle.ts`: 6:00 AM cycle helpers and exact required shower barcode constant.
- `src/services/showerProofApi.ts`: frontend service wrapper for Mission Control shower proof upload/history/current-record APIs.
- `src/utils/voiceProviders.ts`: browser voice provider and premium TTS wrapper providers.
- `src/hooks/useTextToSpeech.ts`: text-to-speech React hook.
- `src/components/AIDispatcher.tsx`: deterministic dispatcher UI, commands, safety news panel, and operation log.
- `src/components/ShowerGatePanel.tsx`: self-contained Mission Control shower barcode scanner, auto-capture proof upload, today proof, and proof history panel.
- `src/components/BakersfieldMapPreview.tsx`: Google Map or SVG route map preview.
- `src/components/JobCard.tsx`: reusable job cards and quick actions.
- `src/components/JobModal.tsx`: add/edit job modal, including process-server fields.
- `src/components/JobImportSystem.tsx`: mock OCR, manual paste parser, share-sheet simulator, and simulated partner OAuth import UI.
- `src/components/EndOfDaySummary.tsx`: end-of-day tracker summary.
- `src/components/OutlierDetector.tsx`, `RouteScoreGauge.tsx`, `RouteSummaryCard.tsx`: route analysis UI.
- `worker/index.ts`: Cloudflare Worker API routes and Vinext handler.
- `server.ts`: standalone Express dev/server prototype for Gemini dispatcher chat, TTS, OCR, and Vite middleware. It is not the deployed Worker entry.
- `drizzle/*.sql` and `db/schema.ts`: D1 table definitions for habits and shower proofs.
- `tests/habit-ui-check.cjs`: Playwright habit UI regression test.
- `docs/*.md`: project docs, now including this knowledge base.
- `.env.example`: environment variable names only; no real secrets.

## 5. Navigation and Pages

Bottom navigation tabs, defined in `src/App.tsx`:

- `dashboard`: Mission Control and Ride Mode entry.
- `route`: route map, sequence, routing engine controls, outliers, route score.
- `jobs`: job list/import tools and add/edit flows.
- `battery`: Battery Tracker V1 and range decision controls.
- `tracker`: ride telemetry, start/arrived/resume/end-day controls, ride history, end-of-day summary.
- `habits`: consistency tracker and Daily Shower Gate workflow.
- `settings`: start hub, theme presets, seed reset, and command manual.

The app is a single-page app; there are no separate public application routes besides `/`. Hash navigation is used for tabs. `getTabFromHash()` maps the URL hash to an `AppTab`.

Protected tabs while the shower gate is locked: `route`, `jobs`, `battery`, and `tracker`. Protection occurs in `handleTabChange`, the hashchange effect, `blockJobAccess`, and a guard effect that redirects protected tabs to `#dashboard` so Mission Control can show the contained Shower Gate panel.

Mobile navigation behavior: bottom nav has large buttons and a mobile tap helper (`activateTabFromTap`) that listens for `click`, `pointerup`, and `touchend` with duplicate protection.

Known navigation limitations: route protection is client-side only; the app has no user-role authorization layer beyond Sites/ChatGPT access and tab guards.

## 6. Dashboard

Dashboard sections:

- Self-contained Daily Shower Gate panel with locked, scanner, upload retry, completed, today's proof, and proof history views.
- Mission Control next-stop card with next job name, address, pay, distance, ride time, due time, Navigate/Shower Locked, and Under Review/Complete behavior.
- Today's Route list showing remaining active Route A jobs.
- Battery status: percent, estimated miles left, risk, finish yes/no, recharge yes/no.
- Jobs Left.
- Estimated Earnings Today and expected hourly rate.
- AI Dispatcher message.
- Revision Alerts.

Daily Shower Gate now lives directly on Mission Control and does not navigate to Habits for the scan/upload/history flow. The dashboard intentionally excludes full Proof Vault, full Battery Tracker, full Ride Tracker, settings, and long-form analytics unless Ride Mode is active.

## 7. Job System

Main type: `Job` in `src/types.ts`.

Important fields: `id`, `storeName`, `address`, `pay`, `estimatedMinutes`, `jobType`, `dueTime`, `notes`, `status`, `routeId`, `coordinates`, `smartMergeExplanation`, `smartMergeSavedMinutes`, `priority`, `isRevisionRequired`, `isCompleted`, `deadline`, `revisionStatus`, and optional `processServe`.

Job types: `retail_audit`, `merchandising`, `mystery_shop`, `field_task`, `process_serve`.

Statuses: `ready`, `revisit`, `under_review`, `completed`, `pending`, `postponed`, `outlier`. `pending` normalizes to `ready`.

State normalization: `src/utils/jobState.ts` keeps `status` canonical while syncing compatibility flags:

- Completed: `status = "completed"`, `isCompleted = true`, `isRevisionRequired = false`.
- Revision: `status = "revisit"`, `isCompleted = false`, `isRevisionRequired = true`.
- Other active states: `isCompleted = false`, `isRevisionRequired = false`.

Workflows:

- Add/edit: `JobModal`.
- Import: `JobImportSystem`.
- Delete/duplicate: `handleDeleteJob`, `handleDuplicateJob`.
- Under review: job can be marked `under_review`; Complete is intended after review/check clears.
- Completion: `handleToggleComplete` marks completed, creates proof folder, updates dispatcher message, and if in Ride Mode records store time and completed job id.
- Route B: jobs can be moved to standby Route B.
- Tomorrow: unfinished jobs can be tracked in `jobs_moved_to_tomorrow`.
- Undo: dispatcher actions push `{ jobs, battery }` snapshots to `historyStack`; undo restores jobs and battery.

Protected actions: job status changes, review, completion, navigation, and Ride Mode are blocked while the daily shower gate is locked.

## 8. Route System

Current route calculation is estimated/mock-first.

Confirmed route logic:

- Coordinates are resolved from `BAKERSFIELD_COORDINATES` or deterministic fallback offsets in `src/utils/routeUtils.ts`.
- Distances use Haversine miles.
- `optimizeRoute` provides nearest-neighbor greedy order.
- `optimizeRouteWithSmartMerge` builds a priority-aware route, handles completed jobs first, inserts revisions into the best slot, and adds explanations.
- Metrics include pay, ride time, work time, total time, distance, estimated battery use, earnings/hour, and completion counts.
- Outlier detection flags isolated stops over a nearest-neighbor threshold and suggests action based on battery/pay/time.
- Route Score evaluates pay, distance, battery safety, clustering, and outlier count.

Google Maps mode:

- `BakersfieldMapPreview` can use Google Maps and Routes if a client-visible key is available.
- Without a valid key, the UI falls back to SVG/GIS preview and displays setup guidance.

Known routing limitations:

- No guaranteed real bike-aware routing in production.
- No live elevation, traffic, road closures, or weather-aware route engine.
- Google Maps key configuration may require client exposure through a Vite-compatible variable or runtime global.

## 9. Ride Mode and Travel Sessions

Ride Mode starts from Dashboard by pressing "I'm Riding" and is blocked by the shower gate. Starting Ride Mode:

- Sets `rideModeActive = true`.
- Sets `trackerStatus = "riding"`.
- Resets ride/store/total timers and completed job session ids.
- Captures start battery.
- Hides bottom nav while active.

Tracker states:

- `idle`
- `riding`
- `at_store`
- `completed`

Tracker tab controls:

- Start Ride
- Arrived at Store
- Resume Ride
- End Day
- Reset Current Tracker Session

Ride timing:

- `trackerRideTime` increments while `trackerStatus === "riding"`.
- `trackerStoreTime` increments while `trackerStatus === "at_store"`.
- `trackerTotalDayTime` increments while either riding or at store.

End Ride / End Day creates a session log with ride time, store time, total time, battery, jobs completed, distance estimate, earnings, earnings/hour, average speed, route score, efficiency score, and learned range data. Sessions persist in `ride_tracker_sessions`.

Distance is currently estimated from ride time multiplied by average e-bike speed, not GPS mileage.

## 10. Battery System

Default profile: Jasion EB5, 360Wh, 18 mph average, 2.8% battery per mile, 36 mile max range in `DEFAULT_EBIKE_CONFIG`.

Battery inputs and state:

- Current battery percentage.
- Assist level.
- Rider weight.
- Cargo weight.
- Wind factor.
- Terrain factor.
- Learned percent per mile.

Battery outputs:

- Estimated route battery use.
- Estimated miles remaining.
- Risk level.
- Can finish route.
- Recharge recommended.
- Learned performance.

Limitations:

- Battery use is modeled, not measured from the e-bike.
- Ride distance is inferred from ride time and configured average speed.
- No live elevation, wind API, Bluetooth e-bike telemetry, or real odometer feed.
- Multiple-battery planning is not a formal data model yet.

## 11. Scheduling and Breaks

Working schedule support is partial.

Implemented or visible:

- Job `dueTime` and `deadline` fields.
- Deadline-aware priority bonus and revision insertion penalty.
- Dispatcher "Can I finish today?" uses the current time, 8:00 PM end-of-day assumption, route time, and battery estimate.
- Job estimated minutes contribute to route metrics.

Not formalized:

- Work start/end schedule settings.
- Lunch windows.
- Break durations.
- Fixed appointments.
- Food stops.
- Charging stops as schedule entities.
- A real scheduler that decides which jobs fit into a calendar.

## 12. AI Dispatcher

Working in deployed app:

- Deterministic command interpreter in `AIDispatcher`.
- Commands: next stop, jobs left, can I finish today, complete job, move job, re-optimize, safety news.
- Structured actions use `DispatcherAction` and call `onExecuteAction` in `src/App.tsx`.
- Undo button calls `onUndoAction`.
- Dispatcher messages persist in `dispatcher_chat_messages`.
- Safety news fetches `/api/safety-news`.

Mock or not deployed:

- `server.ts` contains Gemini dispatcher chat endpoint `/api/dispatcher/chat`, but deployed Worker does not expose it.
- Premium TTS endpoint `/api/dispatcher/tts` exists in Express `server.ts`, but not in deployed Worker.

Example supported commands:

- "What's next?"
- "Can I finish today?"
- "Complete this job"
- "Move this job"
- "How many jobs left?"
- "Re-optimize"
- "Check safety news near my stops"

## 13. Safety Dispatcher

Implemented:

- `/api/safety-news` in `worker/index.ts` accepts active jobs and queries Google News RSS for Bakersfield crime/police/safety terms near route areas.
- Items are classified as `high`, `watch`, or `info` using keyword matching.
- Dispatcher UI shows checked areas, safety headlines, sources, publication times, and links.
- UI warns that it is not a live emergency alert and says to leave/call 911 for immediate danger.

Limitations:

- Not a real-time police, CAD, emergency, or neighborhood risk database.
- Uses news RSS and keyword filtering, so coverage can be incomplete, delayed, or noisy.
- No trusted-contact sharing workflow is implemented.
- No "Arrived Safely" or "I don't feel safe" emergency workflow is implemented.
- No saved safe locations, bike-parking reports, hazard reports, or environmental safety provider are formalized.
- The app must never state a neighborhood is definitively safe or dangerous.

## 14. Daily Shower Gate

Implemented in `src/components/ShowerGatePanel.tsx`, `src/services/showerProofApi.ts`, `src/utils/showerCycle.ts`, `src/App.tsx`, `/api/shower-proofs`, and legacy `/api/shower-proof`.

Workflow:

- Daily cycle key resets at 6:00 AM local time.
- Before 6:00 AM, `getShowerCycleKey()` uses the previous date.
- Mission Control now shows a self-contained Shower Gate panel for the current cycle.
- Locked state begins with "Shower Gate Locked", "Product barcode required", "Scan Product Barcode", and "View Proof History".
- Protected tabs/features: Route, Jobs, Battery, Tracker, ride mode, job navigation, job review, and job completion.
- Required accepted barcode: `075371003233`.
- Barcode is treated as a string to preserve the leading zero.
- Mission Control scanner opens inside the panel, requests the rear camera, shows a live preview and framing guide, and includes Close/Cancel controls.
- There is no separate Attach Proof button in the Mission Control Shower Gate.
- Incorrect barcode shows "Incorrect product barcode.", keeps the gate locked, and does not capture or upload proof.
- Correct barcode automatically captures one still image from the active stream, stops camera tracks, uploads proof, and saves a backend proof record.
- Unlock requires exact barcode match, automatic image capture, successful backend upload, and successful backend record save.
- On success, the panel shows "Daily Shower Verified", product matched, proof saved, completion time, thumbnail, View Today's Proof, and View Proof History.
- Successful Mission Control verification adds the mandatory shower habit log if not already logged for the cycle.
- Next-cycle reset happens because the cycle key changes after 6:00 AM.
- Direct-route protection redirects protected hashes to `#dashboard` while locked so the contained Shower Gate is visible.
- Camera permission errors show status messages.
- Torch uses ZXing `switchTorch` when available or `MediaStreamTrack.applyConstraints({ torch })` when native scanning is active and supported.
- Proof History and View Today's Proof open inside the Shower Gate panel and do not leave Mission Control.

Current limitations:

- New Mission Control proof images are not stored permanently in frontend localStorage; the frontend keeps only lightweight proof metadata and backend image URLs/keys.
- Worker backend still stores proof image bytes as a D1 data URL behind `/api/shower-proofs/:id/image`; Express fallback stores local files under ignored `.local-shower-proofs`.
- No R2 bucket is configured.
- Real phone camera/barcode behavior depends on browser/device support and still needs physical iPhone Safari verification.

## 15. Barcode Scanner

Accepted format: UPC-A only.

Validation:

- Exact string match against `075371003233`.
- No partial matches.
- No manually entered barcode path exists in the UI.
- QR codes are not accepted by the configured UPC-A scanner flow.

Implementation:

- Native `BarcodeDetector` is used when `getSupportedFormats()` includes `upc_a`.
- ZXing fallback uses `BrowserMultiFormatOneDReader` with `BarcodeFormat.UPC_A`.
- `barcodeScanHandledRef` prevents repeated handling of the same scan.
- Mission Control `ShowerGatePanel` prevents duplicate capture with `scanHandledRef`.
- Wrong barcode in the Mission Control panel displays "Incorrect product barcode." and does not upload.
- Success in the Mission Control panel moves through Product verified, Capturing proof, Uploading proof, and Proof saved.

Testing strategy currently includes mobile Playwright workflow checks from recent tasks, but there is no committed barcode-specific automated test file and no real-device barcode test in this repository.

## 16. Proof Vault

Job proof records:

- Stored in `proof_vault_records` localStorage.
- Created or updated when a job is completed.
- Contains job id, store name, address, completion time, arrival time, GPS coordinates, photos, screenshots, receipts, notes, createdAt, updatedAt.
- Process-server jobs generate richer proof notes from processServe fields.
- Users can add photos/screenshots/receipts later through file inputs in the proof modal.
- Users can update notes.

Shower proof:

- Legacy Habits proof is stored in D1 table `shower_proofs` and localStorage fallback `daily_shower_gate_proofs`.
- Mission Control proof records are stored through `/api/shower-proofs` in D1 table `shower_proof_records` on the Worker path or ignored `.local-shower-proofs` files when using standalone Express.
- Mission Control localStorage keeps lightweight cycle metadata only: proof ID, storage key, image URL, exact barcode, capture time, local date, upload status, and verification status.
- Mission Control proof records contain unique proof ID, storage key, image URL endpoint, exact barcode, capture timestamp, local date, cycle ID, upload status, verification status, createdAt, and updatedAt.

Privacy/security limitations:

- Job proof assets are local browser data URLs, not encrypted durable storage.
- Worker Mission Control shower proof image data is still stored as a data URL in D1 behind an image endpoint; this is not ideal for privacy or large images.
- There is no retention/deletion policy beyond local clearing or overwriting.

## 17. Screenshot Job Import

Implemented UI modes:

- OCR screenshot upload.
- Mock OCR templates.
- Manual raw paste parser.
- Share-sheet simulation.
- Simulated partner OAuth import.

OCR endpoint:

- UI calls `/api/import/ocr`.
- Express `server.ts` implements `/api/import/ocr` using Gemini if `GEMINI_API_KEY` exists.
- Deployed Worker currently does not implement `/api/import/ocr`, so this path is broken on the Sites deployment unless routed separately.

Privacy design:

- UI states that credentials are not stored.
- Manual parser is local.
- OCR prompt asks not to extract customer names, phone numbers, or driver logins.

## 18. Saved Locations and Charging Spots

Implemented:

- Starting hub/home address can be edited in Settings and stored in `route_optimizer_start`.
- Known Bakersfield coordinates are hardcoded for seed stops and map preview.

Not formalized:

- Personal saved places list.
- Electrical outlet notes.
- Charging locations.
- Parks, food, restrooms, water, and safe rest areas.
- Verification notes and reliability ratings.
- Community charging-location network.

## 19. Voice System

Implemented:

- Browser Web Speech API provider with sentence chunking and stop support.
- Voice styles: calm, professional, fast, friendly.
- Hook state: speaking/loading/supported/error/provider/style/rate/pitch.
- Premium provider wrappers for Gemini, OpenAI, and ElevenLabs.

Limitations:

- Premium wrappers call `/api/dispatcher/tts`.
- Express `server.ts` implements `/api/dispatcher/tts`, but deployed Worker does not.
- Browser speech quality and available voices vary by browser/device.
- No sensitive-proof readout rules are enforced beyond current UI usage.

## 20. Storage and Persistence

Browser/localStorage keys confirmed in `src/App.tsx` and components:

- `route_optimizer_jobs`
- `route_optimizer_jobs_schema_version`
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
- `habit_tracker_tasks`
- `habit_tracker_active_task_id`
- `habit_tracker_task_name`
- `habit_tracker_target_minutes`
- `habit_tracker_last_minutes`
- `habit_tracker_logs`
- `daily_shower_gate_proofs`
- `proof_vault_records`
- `dispatcher_chat_messages`

D1 tables:

- `habit_state`: one default row with task metadata, active task id, tasks JSON, logs JSON, updated timestamp.
- `shower_proofs`: one row per cycle key with proof/barcode/flash/event/confirmation metadata.

Data-loss risks:

- Jobs, proof vault assets, dispatcher messages, ride sessions, battery settings, and route state are browser-local and can be lost if browser storage clears.
- Cross-device sync is incomplete; habits and shower proof have backend support, but jobs/proof vault do not.
- No backup/export workflow is implemented.

## 21. APIs and External Providers

Hosted Worker APIs:

- `/api/habits`: GET/PUT habit state in D1. Returns no-store JSON. Requires D1 binding `DB`.
- `/api/shower-proof`: GET/POST daily shower proof in D1. Confirms only exact barcode `075371003233` plus proof data.
- `/api/shower-proofs`: POST multipart proof image plus barcode/cycle metadata; server rejects every barcode except exact string `075371003233`.
- `/api/shower-proofs`: GET proof history newest first.
- `/api/shower-proofs/current?cycleId=...`: GET verified/saved proof for the requested 6:00 AM cycle.
- `/api/shower-proofs/:id`: GET one proof metadata record.
- `/api/shower-proofs/:id/image`: GET proof image bytes from backend storage.
- `/api/safety-news`: POST route jobs; fetches Google News RSS searches and returns safety headlines.
- `/_vinext/image`: Vinext image optimization route using Cloudflare Images binding.

Standalone Express APIs in `server.ts`:

- `/api/health`
- `/api/shower-proofs`: local fallback POST/GET using ignored `.local-shower-proofs` storage.
- `/api/shower-proofs/current?cycleId=...`
- `/api/shower-proofs/:id`
- `/api/dispatcher/chat`
- `/api/dispatcher/tts`
- `/api/import/ocr`

Important: `server.ts` routes are not present in `worker/index.ts`, and `npm run dev` runs `vinext dev`, not the Express server. Treat Express APIs as prototype/local-only unless wired into deployment.

Environment variables documented in `.env.example`:

- `GEMINI_API_KEY`
- `APP_URL`
- `GOOGLE_MAPS_PLATFORM_KEY`
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`

Client map component also checks `VITE_GOOGLE_MAPS_PLATFORM_KEY` and `globalThis.GOOGLE_MAPS_PLATFORM_KEY`.

## 22. Authentication, Privacy, and Security

Authentication:

- The deployed Sites URL requires ChatGPT/OpenAI sign-in before app access.
- Inside the app, tab protection is client-side, not account-role-based.

Protected data:

- Proof images, route stops, job details, and shower proof are sensitive.
- Job proof vault is local browser data.
- Legacy shower proof is D1-backed and stores proof data URL.
- Mission Control shower proof metadata is backend-backed; Worker image bytes are currently stored as D1 data URLs behind `/api/shower-proofs/:id/image`.

Security rules:

- Secrets should live in environment/Sites secrets, not Markdown or source.
- Barcode validation is server-side for `proof_confirmed` in `/api/shower-proof`.
- Barcode validation is server-side for `/api/shower-proofs` uploads and accepts only exact string `075371003233`.
- Camera access is requested only when scanning.
- Safety news should not be treated as emergency authority.

Current gaps:

- No durable encrypted proof file storage.
- No R2 bucket configured.
- No export/backup.
- OCR/TTS provider routes are not deployed in Worker.
- LocalStorage data can be lost or modified by the client.

## 23. Testing and Validation

Commands:

- `npm run lint`: `tsc --noEmit`.
- `npm run build`: Vinext production build.
- `npm run test:habits`: Playwright habit UI check against `http://localhost:3000`.

Last verification on 2026-07-18:

- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run test:habits`: passed.

Critical workflow checklist:

- [x] TypeScript compile.
- [x] Production build.
- [x] Habit add/log/history/streak Playwright test.
- [x] Recent manual/live checks showed deployed UI loads and nav buttons work after mobile tap fix.
- [ ] Automated Daily Shower Gate scan/proof/confirm test in repository.
- [ ] Automated mobile bottom-nav regression test in repository.
- [ ] Automated job completion/proof vault test.
- [ ] Automated Ride Mode timer/session test.
- [ ] Automated Worker API tests.
- [ ] Automated OCR/TTS route availability tests.

## 24. Deployment

Platform: OpenAI Sites / Cloudflare Worker.

Project id: `appgprj_6a5135d24f18819187875b0514e19552`.

Current public URL pattern: `https://route-manager-jj.terence-juni-4222.chatgpt.site`.

Build/deploy process used by Codex:

1. Run `npm run lint`.
2. Run `npm run build`.
3. Commit changes.
4. Push exact commit to Sites source remote.
5. Package built source including `dist`.
6. Save Sites version with the exact commit SHA.
7. Deploy saved Sites version.
8. Check deployment status and Worker logs.
9. Verify live URL in signed-in browser when possible.

Mobile-browser considerations:

- App shell headers are generated by `build/sites-vite-plugin.ts` to prevent stale shell caching.
- Hashed assets remain immutable.
- Recent mobile tap handling is implemented through `activateTabFromTap`.

Rollback:

- Recent backup tags include `backup-before-phone-cache-fix-20260718` and `backup-before-mobile-tap-fix-20260718`.
- Older restore docs also exist in `RESTORE_POINT.md`.

## 25. Active Unresolved Problems

| ID | Area | Problem | User impact | Severity | Reproduction steps | Suspected root cause | Related files | Workaround | Recommended next action | Date discovered | Last verified |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P001 | Hosted APIs | `/api/import/ocr` is referenced by the UI but not implemented in the deployed Worker. | Screenshot OCR import can fail on the live Sites app. | High | Open Jobs > Import > OCR, upload image, run OCR on deployed site. | OCR route exists in standalone `server.ts`, not `worker/index.ts`. | `src/components/JobImportSystem.tsx`, `server.ts`, `worker/index.ts` | Use mock templates or manual paste parser. | Port OCR route to Worker or clearly disable live OCR until provider is wired. | 2026-07-18 | 2026-07-18 |
| P002 | Hosted APIs / Voice | Premium TTS providers call `/api/dispatcher/tts`, but deployed Worker does not expose this route. | Realistic voice engines fail and fall back to browser speech. | Medium | Select premium voice provider and use read-aloud on deployed site. | TTS route exists in standalone `server.ts`, not Worker. | `src/utils/voiceProviders.ts`, `server.ts`, `worker/index.ts` | Use browser voice provider. | Port TTS route to Worker or hide premium providers when endpoint is unavailable. | 2026-07-18 | 2026-07-18 |
| P003 | Persistence | Jobs, proof vault records, ride sessions, and battery settings are still browser-local. | Data may not sync to phone/other devices and can be lost if browser storage clears. | High | Add jobs/proof on one browser, open app on another device. | No D1 schema/API for job/proof vault/ride state. | `src/App.tsx`, `src/types.ts`, `worker/index.ts` | Use same browser and avoid clearing site data. | Design D1/R2 persistence with export/backup before relying on proof records. | 2026-07-18 | 2026-07-18 |
| P004 | Proof storage/privacy | Worker Mission Control shower proof images are still stored as D1 data URLs behind an image endpoint, not secure object storage. | Large/private proof images can bloat DB and create privacy risk. | High | Complete Mission Control Shower Gate proof; inspect `shower_proof_records` storage path. | No R2 binding; Worker stores `image_data_url` directly while Express fallback uses ignored local files. | `worker/index.ts`, `src/components/ShowerGatePanel.tsx`, `src/services/showerProofApi.ts` | Use only required proof images; avoid unnecessary private images. | Add R2 or secure file storage; store only metadata/path in D1. | 2026-07-18 | 2026-07-18 |
| P005 | Maps/provider config | Google Maps live mode may not work unless the key is exposed in a client-readable way. | User may see setup screen or fallback SVG instead of real map routing. | Medium | Open Route map with only `GOOGLE_MAPS_PLATFORM_KEY` configured server-side. | Vite client usually exposes `VITE_*`; component checks multiple sources but `.env.example` emphasizes non-VITE key. | `src/components/BakersfieldMapPreview.tsx`, `.env.example` | Use SVG/GIS preview. | Clarify/env-wire `VITE_GOOGLE_MAPS_PLATFORM_KEY` or runtime injection. | 2026-07-18 | 2026-07-18 |
| P006 | Scheduling | Lunch, breaks, fixed appointments, charging stops, and calendar-fit scheduling are not implemented as a formal system. | App can estimate route time but cannot truly plan a whole day schedule. | Medium | Try to set lunch/charging/fixed appointment constraints. | No schedule data model or scheduler. | `src/App.tsx`, `src/utils/routeUtils.ts` | Use due times and manual route adjustments. | Add schedule model after core persistence stabilizes. | 2026-07-18 | 2026-07-18 |

## 26. Resolved Problems

| Problem ID | Original problem | Root cause | Resolution | Files changed | Test performed | Date resolved | Remaining risk |
|---|---|---|---|---|---|---|---|
| R001 | Phone website showed loading/unstyled old UI. | Stale app shell caching and previous deployment lag. | Added no-store app shell headers while keeping hashed assets immutable; deployed Sites version 29. | `build/sites-vite-plugin.ts` | Build, live signed-in browser check. | 2026-07-18 | User phone may need a fresh URL/tab after cache changes. |
| R002 | Buttons appeared visible but did nothing on phone. | Mobile browser/webview tap behavior needed touch/pointer handling after click-only nav change. | Added `activateTabFromTap` with `click`, `pointerup`, `touchend`, and duplicate protection; deployed Sites version 30. | `src/App.tsx` | Type check, build, local mobile Playwright tap test, live click test. | 2026-07-18 | Real phone should still be checked after opening fresh URL. |
| R003 | Daily Shower Gate flow was too large and not aligned with Habits. | Camera preview lived in top gate panel while the full workflow belonged in Habits. | Made top gate compact, moved scanner preview/flash into Habits card, exposed Battery tab, cleaned nav flow; deployed Sites version 28. | `src/App.tsx` | Type check, build, mobile locked-flow Playwright test, live browser check. | 2026-07-18 | Real camera behavior depends on phone permissions and browser support. |
| R004 | Daily Shower Gate could unlock too loosely. | Proof attachment, barcode verification, and confirmation were not fully separated. | Enforced exact barcode/proof/confirm workflow and backend validation for `proof_confirmed`; deployed earlier commit `57473ab`. | `src/App.tsx`, `worker/index.ts` | Type check, build, intercepted workflow tests. | 2026-07-18 | Proof storage still needs R2/privacy hardening. |
| R005 | Mission Control Shower Gate lacked the requested contained scan/upload/history flow. | The dashboard gate was only a reminder that opened Habits, and proof attachment was manual. | Added self-contained Mission Control `ShowerGatePanel`, automatic capture after exact barcode match, `/api/shower-proofs` backend record contract, in-panel Today/History views, and Dashboard lock routing. | `src/components/ShowerGatePanel.tsx`, `src/services/showerProofApi.ts`, `src/utils/showerCycle.ts`, `src/App.tsx`, `worker/index.ts`, `server.ts`, `.gitignore` | `npm run lint`, `npm run build`, mobile Playwright UI flow, direct API exact/wrong barcode check. | 2026-07-18 | Real phone barcode/camera success still needs physical Safari/Chrome verification; Worker storage still needs R2. |

## 27. Known Limitations

- Routing is mostly mock/haversine unless Google Maps key is valid and live route mode works.
- No live elevation, traffic, weather, police, or road-closure routing.
- Battery use is modeled from distance/time and user settings, not e-bike telemetry.
- Jobs/proof vault/ride state are not fully backend-synced.
- OCR and premium TTS endpoints are not deployed in Worker.
- Browser speech quality varies.
- Safety news is RSS/news-based and incomplete.
- Saved charging/rest/food/safe-location system is not built.
- No automated barcode camera test in repo.
- Real device validation is still needed for iPhone Safari/Chrome camera scanning, torch support, and auto-capture with the physical barcode.
- No full export/backup/restore.

## 28. Architectural Decisions

| Decision | Reason | Alternatives considered | Consequences | Date |
|---|---|---|---|---|
| Keep existing app rather than rebuild. | Existing code already covers routing, jobs, proof, battery, habits, dispatcher, and deployment. | Rebuild from scratch. | Faster stabilization but `src/App.tsx` remains large. | 2026-07-12 |
| Mission Control is first screen. | Field user needs next action immediately. | Start on route map or jobs list. | Dashboard prioritizes next stop, route, battery, earnings, and dispatcher status. | 2026-07-12 |
| Planning Mode and Ride Mode are separate. | Riding should be distraction-reduced. | One universal dashboard. | Ride Mode hides bottom nav and limits visible controls. | 2026-07-12 |
| Ride Mode starts manually. | Avoid unsafe or incorrect automatic ride state. | Auto-detect movement. | User must press "I'm Riding". | 2026-07-12 |
| Local-first persistence for jobs and route state. | Fast prototype and offline-ish behavior. | Full backend first. | Data-loss/sync risk remains. | 2026-07-12 |
| D1 for habits and shower proofs. | These workflows need cross-session backend persistence sooner. | Keep all localStorage. | Habits/shower have backend, but proof image storage needs hardening. | 2026-07-18 |
| Revisions stay in main route. | Revisions are mandatory work, not optional backlog. | Separate revision list. | Smart merge inserts revision jobs into Route A. | 2026-07-12 |
| Process server jobs are first-class jobs. | They share route execution but need extra proof fields. | Separate process-server module. | Shared `Job` model includes optional `ProcessServeDetails`. | 2026-07-12 |
| Completion creates proof. | Protects user if a job is questioned. | Manual proof creation only. | Every completed job creates/updates a proof vault record. | 2026-07-12 |
| Provider interfaces stay pluggable. | Real routing/OCR/TTS can be added later. | Hard-code one provider. | Some provider UI exists before hosted endpoints are fully wired. | 2026-07-12 |
| 6:00 AM shower-cycle reset. | User wanted daily gate active after 6:00 AM even if app opens later. | Midnight reset. | Cycle key rolls previous date before 6:00 AM. | 2026-07-18 |
| Exact UPC-A barcode required for shower confirmation. | User wanted a specific product proof gate. | Manual confirmation only or any barcode. | Jobs stay locked until exact string `075371003233` plus proof attachment. | 2026-07-18 |
| Mission Control owns the new Shower Gate panel. | User wanted the latest shower workflow visible and usable without leaving Mission Control. | Keep the scanner in Habits only. | Locked protected tabs return to Dashboard, and scanner/history/today proof views stay inside `ShowerGatePanel`. | 2026-07-18 |
| Shower proof upload uses a swappable service layer. | Storage should later move from local/D1 development storage to secure object storage. | Hard-code frontend storage details. | Frontend calls `showerProofApi`; Worker and Express fallback validate barcode server-side before saving. | 2026-07-18 |
| No-store app shell, immutable hashed assets. | Prevent mobile stale-shell failures while retaining asset caching. | Cache everything or no-cache everything. | Phone should fetch latest shell; assets still cache by content hash. | 2026-07-18 |

## 29. Current Development State

Working:

- Dashboard Mission Control.
- Bottom navigation, including mobile tap handling.
- Mission Control Shower Gate lock/scan/auto-capture/upload/history/today-proof UI flow.
- Legacy Habits shower gate lock/scan/proof/confirm workflow remains in place.
- Habit tracker with D1 sync and local fallback.
- Job add/edit/delete/duplicate/import mock/manual flows.
- Under review then complete workflow.
- Route A/Route B, smart revision merge, outlier detection, route score.
- Battery Tracker V1 estimates.
- Ride Mode and tracker sessions.
- Job proof vault local records.
- Safety news brief via Worker.
- Browser voice fallback.

Partially working:

- Google Maps live route mode if key is available and client-exposed.
- Screenshot OCR UI, because deployed endpoint is not wired in Worker.
- Premium TTS UI, because deployed endpoint is not wired in Worker.
- Persistence, because only habits and shower proof are backend-backed.
- Shower barcode/camera proof flow, because headless tests verified UI and API paths but real phone camera/torch behavior still needs physical-device verification.

Mocked:

- Partner OAuth imports.
- Share-sheet import simulator.
- OCR templates.
- Routing provider choices besides local mock/SVG and optional Google map.

Broken on hosted Worker:

- `/api/import/ocr`
- `/api/dispatcher/tts`
- `/api/dispatcher/chat`

Current phase: stabilization / documentation / production-hardening.

Next approved task: none recorded in code; current task is documentation audit only.

Last successful build: 2026-07-18, `npm run build` passed after Mission Control Shower Gate changes.

Last test result: 2026-07-18, `npm run lint`, `npm run build`, focused mobile Playwright Shower Gate UI flow, and direct `/api/shower-proofs` exact/wrong barcode API check passed.

## 30. Future Roadmap

Now:

- Keep documentation updated after every task.
- Add automated regression tests for mobile nav and Daily Shower Gate.
- Fix or disable hosted OCR/TTS premium endpoints.
- Preserve current deployment/version/rollback discipline.

Next:

- Move jobs, ride sessions, and proof vault metadata to backend storage.
- Add secure object storage for proof assets and shower proof.
- Add export/backup/restore.
- Clarify Google Maps key configuration.
- Add Worker API tests.

Later:

- Real bike-aware routing provider.
- Real scheduling with breaks, appointments, charging, and food stops.
- Rich safety workflow with safe stops, trusted-contact consent, arrived-safely, and hazard notes.
- Better process-server proof checklist and attempt workflow.
- More dispatcher commands with safer confirmations.

Separate future projects:

- Standalone e-bike application.
- Community charging/outlet network.
- Public charging-location reliability/reporting system.
