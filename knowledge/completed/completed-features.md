# Completed Features

## Navigation
- 6-tab navigation with protected tab support.
- Bottom navigation with overflow handling for small screens.

## Shower Gate
- Daily barcode scan verification (barcode: 075371003233).
- Proof upload with camera or file picker.
- Cycle management with 6:00 AM reset.
- Panel hidden from Dashboard after cycle completion.

## Job System
- 5 job types: default, revision, process_serve, delivery, pickup.
- 7 job statuses for lifecycle tracking.
- Completion workflow with proof attachment requirement.
- Proof vault for storing job completion evidence.

## Route Optimization
- Nearest-neighbor greedy algorithm.
- Battery-aware routing based on e-bike range.
- Outlier detection for inefficient route additions.
- Route A (active) and Route B (standby) separation.

## Ride Mode
- Distraction-free execution surface.
- Job completion and proof upload within Ride Mode.
- Auto-navigation to next stop.

## Habit Tracker
- Mandatory shower verification as built-in habit.
- Custom daily task creation.
- Daily streak tracking.

## AI Integration
- AI Dispatcher with Gemini 2 chat.
- Route and job advice via conversational interface.

## Safety
- Safety News brief for Bakersfield area.
- Google News RSS integration.

## Utilities
- Screenshot OCR import for job data extraction.
- Text-to-speech with 3 providers (Gemini, OpenAI, ElevenLabs).
- Debug Center for diagnostics and system status.

## Authentication
- Supabase authentication (magic link + email/password).
- JWT token handling with refresh.

## Deployment
- Railway deployment with Autodeploy from main.
- Cloudflare Worker API variant.
- Checkpoint and release scripts (`scripts/checkpoint.cjs`, `scripts/release.cjs`).
- Verify script (`scripts/verify.cjs`) for lint + build.

## Documentation
- Knowledge system (this directory).

## Smart Aisle Scan
- Camera-guided retail aisle photography system.
- Full capture workflow: setup, camera capture with alignment overlay, hold-to-capture auto-capture, beginning/ending/context photo roles, coverage review, canvas panorama stitching, stitch review, final checklist, manual override.
- Compatible job types: retail_audit, mystery_shop, merchandising.
- Entry point: JobDetailModal "Smart Aisle Scan" button + Tools tab job picker.
- Full-screen camera: modal goes edge-to-edge during capture/ending/context phases with overlay controls.
- 0.5x/1x zoom toggle with native track.applyConstraints + CSS scale fallback.
- Session persistence: localStorage with resume-on-reopen.
- Quality analysis: brightness, motion, level detection.
- Coverage analysis: pairwise overlap estimation with gap/duplicate warnings.
- Canvas stitching: scaled panorama with overlap.

## Smart Aisle Scan Test Lab
- Development/testing feature for Smart Aisle Scan quality assurance.
- Feature flag: `VITE_ENABLE_SMART_AISLE_TEST_LAB` enables the Test Lab only in local dev builds; production builds ignore the flag and remove Test Lab UI from the client bundle.
- Entry point: Settings > Developer Tools > Smart Aisle Scan Test Lab.
- Live Camera Practice: opens real SmartAisleScan in test_lab mode with setup instructions.
- Imported Test Sequence: select images from device, process through real pipeline.
- Controlled Test Scenarios: 8 predefined scenarios with expected outcomes validated against real pipeline.
- Test Markers: displayable high-contrast markers for overlap/direction testing.
- Sensor Diagnostics: live camera and sensor values panel.
- Test Results: scorecard, pass/fail, exportable JSON report.
- Test Data Cleanup: delete test sessions without affecting real audit data.
- Browser validation: local Playwright harness covers practice setup, imported image processing, controlled scenario results, markers, diagnostics, cleanup, test/audit data isolation, and production build hiding.
- Data isolation: test sessions use `mode: 'test_lab'`, excluded from all production views.
- Types: `AisleScanSessionMode`, `TestLabScreen`, `SmartAisleTestScenario`, `TestLabResult`, `TestLabScorecardItem`.

---

**Last Updated:** 2026-07-26 (smart-aisle-scan-test-lab)


## 2026-07-26

- Smart Aisle Scan Test Lab: development/testing feature with Live Camera Practice, Imported Test Sequence, Controlled Test Scenarios, Test Markers, Sensor Diagnostics, Test Results, and Cleanup. Feature flag `VITE_ENABLE_SMART_AISLE_TEST_LAB` is dev-build only. Added browser harness validation, fixed imported sequence result generation when first photo has no overlap score, and guarded production builds from exposing Test Lab UI.

## 2026-07-22

- Dashboard authoritative route interface: standalone Route page and navigation destination retired; shared route calculations and Dashboard route controls preserved.
