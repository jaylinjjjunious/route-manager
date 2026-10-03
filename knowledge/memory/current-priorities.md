# Current Priorities

## BlueAI follow-through (2026-10-01)

The production integration owner and two legacy-test synthetic rows have been corrected to the newer signed-in account. Completed 2026-10-02: personally verified both synthetic records and successful sync in production Jobs. No further debugging is needed for this visibility issue. Do not alter Barrister records. Supabase-backed export storage is already implemented, superseding the older priority below to provision a private data directory for this path. Render is the production target requested by the user.


## High

- **Production 404 blocker (2026-10-03):** Set `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` in Render dashboard → Environment; trigger redeploy. Without service role key, `database` client in `server/admin/probationRoutes.ts` is null; authenticated `/api/probation-check-ins` returns 404 instead of 503. `render.yaml` updated (c5f9f9e deployed); dashboard config pending.

- Independent review hold (2026-10-02): fix the user-editable admin-role trust in `server/admin/activityLog.ts` before granting admin privileges; add security regression coverage. Wire owner-isolated probation save/load, preserve dirty data during merging, and make activity failures/retries reliable. Then confirm database setup and verify the real cross-browser Admin/probation flow. See `known-bugs.md` and lifeline H-007; deployed code alone is not readiness.

- Apply Admin Portal migration `drizzle/0006_activity_log.sql` to production Supabase and assign admin role via Supabase Dashboard. Verify production `/admin` access.

- Configure BlueAI's server-only token, owner UUID and persistent private data
  directory, then verify a real sender create/update in the signed-in calendar.
  The current Render free configuration has no disk; leave the receiver disabled
  until durable storage is available. See `features/blueai-ingestion.md`.

- Complete the final signed-in Render verification: the Blueprint is deployed,
  the public sign-in page loads, and `/api/health` passes at
  `https://route-manager-phtj.onrender.com`. Verify authentication, protected
  API calls, and the signed-in mobile app before retiring Railway as the
  temporary rollback host.

- Add server-side Supabase bearer-token validation to protected Cloudflare
  Worker routes so Worker deployments enforce the same authentication boundary
  as Express; track as P011.

- Continue named Today-screen panel reviews against the simplified dashboard stack. The removed inline Preview/Ride Mode readiness panel and Travel Plan panel should not be reintroduced unless explicitly requested.

- Verify the AIØ three-tab redesign (Today/Jobs/More) in the live signed-in app on a real device: simplified Today stack (weather artwork, This Week calendar, Next Best Jobs, Today's Other Jobs), live-weather slot (day sun / night moon, temperature, condition, feels-like, and the offline/denied fallback), Next Best Job actions, weekly strip + expanded day panel, Jobs schedule list, More hub navigation, and the jobs-count badge. Headless layout verification (320/390/430 px, dark/light, no overflow) is done via `scripts/screenshot-today.mjs`; the signed-in production pass remains.

- Complete real iPhone Safari/Home Screen PWA verification of Preview Guide using a real slow-scroll recording, including codec decode, seek order, cancellation/recovery, storage pressure, camera preparation photo, explicit trip handoff, and arrival persistence.

- Finish Phase 1 scheduling verification: confirm weekly strip + expanded day panel + move-to-day flows work end-to-end in the live production app (move today/future/remove, overdue + unscheduled review, migration of any legacy moved-tomorrow data), then update the ADR and mark the phase complete.
- Implement Phase 2 scheduling (weather + air-quality analysis in the weekly strip / expanded day panel) and Phase 3 (TTS companion summary), per the approved roadmap.

- Add the authenticated durable inventory custody sync slice: server endpoint, append-only persistence, idempotent replay, attachment storage, and multi-device conflict policy. The current job-detail ledger is offline-first and intentionally remains queued until this is implemented.

- Continue the generic field-work procedure rollout: the Job Detail Procedure workspace now has mobile-validated ergonomics (scroll-to-step, current-step highlighting, quiet satisfied states, prominent blocking actions). Next: validate the complete Sonic technician flow end-to-end on a real phone (create job → assign procedure → open job → continue procedure → capture proof/serial → complete closeout), then add procedure-derived assignment/defaulting and additional customer-specific procedure data only after the generic proof/equipment/closeout loops are stable.


- Verify Smart Aisle Scan real-iPhone deletion/undo and lens cleanliness detection through `/real-device-verification?access=fuckyouleavemelone`: run Safari portrait/landscape and installed Home Screen PWA tests for immediate delete, undo restore, count update, automatic restitch, lens check result, recheck, false-warning avoidance, and capture blocking; collect the privacy-safe report plus screenshots or recording, and evaluate any failures before marking the feature fully verified.
- Verify Test Lab data isolation in the authenticated full app: local harness confirms cleanup preserves audit sessions, but production views still need a signed-in app pass.

## Medium

- Monitor Shower Gate cycle reset behavior in production.
- Monitor the monthly probation check-in reset, day-8 lock, device classification, and browser-local proof capacity in production.
- Gather user feedback on barcode scanning reliability.
- Test Smart Aisle Scan full-screen camera + 0.5x zoom on actual mobile device.
- Consider image compression before localStorage upload for scan photos.
- Expand automated Test Lab tests to include authenticated Settings entry and provider-controlled physical mobile camera capture when real-device service credentials are available.
- Calibrate lens cleanliness confidence thresholds with controlled smudge samples on a real device (P008).
- Verify Transit Mode against the live upstream quota during extended field use (stale-while-revalidate behavior, 429 handling, monthly budget consumption, exact plan stop offsets, and scheduled-vs-realtime timing). The audit and trip-stop accuracy remediations are implemented and need a signed-in production pass to confirm live behavior.

## Low

- If the Road Readiness concept returns, scope it as a separately requested feature rather than adding it back to the simplified main dashboard by default.

---

**Last Updated:** 2026-10-03 (Production 404 root cause identified — missing Render env vars; render.yaml fix deployed; dashboard config pending)

## 2026-09-26 release

Publish the approved local-only login identity, Monthly Check-In page, and simplified job popup. Verify the deployed commit plus public navigation; native iOS browser behavior requires separate device validation.
## Remediation status — 2026-10-02
This supersedes the earlier independent review findings for local code. Admin authorization trusts only app_metadata; client-editable metadata is denied. Account-scoped automatic loading/saving, visible sync failures/retry, and explicit legacy import are connected to the app. Migration 0007 atomically saves records and idempotent activity; stale proof/events are merged without erasing completion. Supabase tables and RPC are installed; rollback-only reliability tests passed. Local focused tests: 21 passed. Final deployment and signed-in account/Admin/cross-browser checks remain pending; no admin account is assigned. Provider recognition remains unimplemented.
