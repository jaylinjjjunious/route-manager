## User preference: conserve usage (2026-10-02)

The user explicitly requests careful, economical usage in every session.
- Keep work focused on the requested outcome; use concise updates and answers.
- Reuse established context and verified results. Read only relevant files and sections.
- Batch independent checks and avoid repeated searches, full-file dumps, or frequent polling.
- Do not spawn extra agents unless the user explicitly asks for them.
- Run only relevant tests and required checks; repeat them only after meaningful changes or failures.
- Avoid unsolicited artifacts, research, refactors, and extra features.
- Preserve essential safety and verification. Report a real blocker instead of spending usage on speculative retries.
- Record progress and remaining work so later sessions can resume without repeating completed work.

# Lessons Learned

## BlueAI visibility (2026-10-01)

- Inspect lazy frontend chunks before concluding deployed code is missing from index*.js.
- Authenticated HTTP 200 can still be a disabled feed. Show sync status and retry instead of permanently disabling polling.
- Scope asynchronous record state to the authenticated account and ignore responses after cancellation.


## Authentication

- Machine ingestion must map a dedicated credential to a fixed account rather
  than accepting an owner from the payload. With browser-local jobs, durable
  ingestion also needs an authenticated feed and revision-aware frontend merge;
  adding a POST endpoint alone cannot update the visible calendar.

- Supabase token refresh must be handled explicitly — implement a 401 retry pattern to catch stale tokens before upload requests fail.
- A local UI bypass must require an explicit development flag and a loopback
  hostname, compile out of production behavior, and never weaken protected API
  authentication. A visually hidden control is not a security boundary.

## Camera and Media

- Long screen recordings should be sampled locally at controlled seek intervals, with conservative duplicate removal and selected-page-only AI processing; uploading or OCRing every frame is wasteful and privacy-hostile.

- iPhone Safari camera requires the `playsInline` attribute on video elements.
- Camera lifecycle management must account for Safari's aggressive tab recycling.
- Camera capture buttons should wait for a readable video frame before capturing; zero-size video frames can produce invalid data URLs in automated and real startup timing.
- Long-press camera controls need CSS and pointer/context-menu guards (`select-none`, `touch-manipulation`, `user-select: none`, `-webkit-touch-callout: none`) to prevent mobile text selection while holding capture actions.
- Press-and-hold camera flows should wait for the visible button to be enabled in browser tests because capture cooldown can leave the next button visible before it is interactive.
- Real iPhone Safari/PWA acceptance cannot be replaced by desktop emulation; when direct device automation is unavailable, ship a privacy-safe tester-assisted route that records build info, pointer/touch lifecycle, selection/context menu evidence, visibility changes, photo sequence metadata, repeated correction attempts, and manual checklist results.
- Quality gates must run before active-sequence persistence. Warning-only validation is not enough for camera evidence workflows because bad frames can contaminate sequence, overlap, and stitching state.
- Immediate photo removal (no confirmation dialog) with an undo toast is more practical for field workflows than confirmation modals, which interrupt the camera flow and lose the user's spatial context.
- Undo after immediate removal requires restoring the exact photo by stable ID, its original sequence position, its active state, and recalculating overlaps and stitching from the restored sequence.
- Lens cleanliness detection requires rolling-frame analysis across multiple preview frames to avoid false positives from single uncertain frames, low-detail scenes, or transient conditions.
- Lens cleanliness should use cautious language ("may need cleaning") because visual symptoms alone cannot definitively identify the cause — it could be smudge, fog, low light, focus not settled, or a naturally low-detail scene.
- Motion blur, low light, and low-detail scenes must be distinguished from dirty-lens signals; a single soft frame after rapid movement or in dim lighting should not trigger a lens warning.

## Build and Deployment

- Vite 8 requires Node.js >= 20.19. The project pins to Node 22.16 for Railway compatibility.
- nixpacks Node version must match build requirements — mismatches cause silent failures.
- Render should use the same Node 22.16 pin and the repository's existing
  `npm run build` / `npm start` contract. A successful deploy does not make
  local filesystem writes durable; free instances lose those files on restart
  or spin-down.
- Multipart form parsing needs careful handling. A hand-rolled parser caused issues and was replaced with multer.
- Packages required by the production build belong in `dependencies` when a host may omit `devDependencies`; otherwise local builds can pass while Railway fails.
- Date-only `YYYY-MM-DD` scheduling math must use UTC calendar fields. Constructing local `Date` objects makes results depend on the host timezone even when display logic targets America/Los_Angeles.

## Application Logic

- A Preview Guide's storage `status: 'ready'` can mean extracted pages are ready; user readiness must instead require `summary.reviewedByUser === true`.
- Shower gate cycle boundary at exactly 6:00:00 requires careful comparison — use `< boundary`, not `<=`.
- Bottom navigation on mobile needs `overflow-x-auto` for small screens to prevent tab overflow.
- Focus trapping improves accessibility for modal-like components.
- Job Detail already contains lifecycle forms with native selects; new compact selector surfaces should avoid taking over generic `querySelector('select')` ordering in existing tests and should use clearly scoped controls.
- Optional chaining filters must check `!= null` when a missing parent object should be excluded; `obj?.value !== null` still allows `undefined` through.
- Local calendar days must never round-trip through `new Date('YYYY-MM-DD')` — that parses as UTC and shifts the rider's day. Use a local-noon `Date` for math and `Intl.DateTimeFormat('en-CA', { timeZone })` for the `YYYY-MM-DD` string, and encode the rule in a timezone test.
- Date validation must check the real calendar (leap years, month lengths) with `Date.UTC` re-read, and invalid stored dates surface as Needs Review instead of being silently coerced.

## CSS / Dark Mode

- Transparent child elements inside a dark-mode parent with `dark:bg-[color]` will visually inherit that background. A connector `<div>` with no bg class appeared as a "black rectangle" because the parent section's `dark:bg-[#17181b]` showed through. Fix: give the element its own explicit background matching the surrounding card aesthetic.

## Process

- Checkpoint tags enable safe rollback without losing work.
- Always verify deployment after push — never assume it succeeded.
- Documentation must be updated in the same session as code changes, or it will drift.
- Do not add new interaction behavior, panels, or secondary flows unless the user explicitly asks for them. If a possible improvement is only a suggestion, ask first before implementing it.
- Before telling the user a UI change is done, verify the user-visible app or served production bundle actually contains the change. If verification fails or deployment is still stale, say that plainly and keep working instead of handing it back as complete.

## External API Integration (Transit)

- Auth header can be a literal `apiKey` header, not `Bearer` — read the upstream docs, don't assume.
- Transit v4 returns HTTP 200 with an `{"error": "..."}` body for malformed plan requests — treat 200-with-error as failure, not success.
- Build upstream URLs with `new URL(base + pathname)` when the base URL has a path (`/v4`); `new URL(pathname, base)` silently drops it.
- Sensitive upstream keys must be server-side only; gate the UI with a separate public build-time `VITE_` flag and enforce the separation with a key-hygiene test.
- Mocking `fetch` in Vitest requires `vi.fn<FetchMock>` typing and reading `init?.headers` (RequestInit) to satisfy TypeScript — cast headers via `new Headers(...)` when asserting.
- Test upstream module selection with `vi.stubEnv`/`vi.resetModules` (dynamic import) so the chosen provider is actually re-evaluated per test.
- A route's first and last stops are not necessarily the rider's boarding and exit stops. Prefer plan offsets and stop schedule items, carry confidence in the normalized contract, and visibly label any fallback as inferred or unavailable.
- Scheduled and predicted transit times are separate facts. Preserve both Unix-second values, use the predicted value for display only when the upstream marks the data realtime, and expose that realtime status to the UI.

## Test Stabilization

- When a test expects an `aria-label` that no longer exists on a button, the root cause is usually a UI change that removed or renamed the attribute. Fix by restoring the missing accessibility attribute on the real component, not by weakening the test assertion.
- When a shared component (`MoreScreen`) begins importing a child component (`ChangePasswordPanel`) that calls `useAuth()`, every test that renders the parent must either wrap with an `AuthProvider` or mock `useAuth`. The smallest fix is a module-level `vi.mock` in the test file that provides the context values the child needs.
- The full test suite must be run before declaring stabilization complete. A targeted pass of only the "relevant" tests can miss regressions in seemingly unrelated files.

## Data-Driven Customer Procedures

- A real customer procedure should be implemented as pure data on the generic engine, not as customer-specific React components or lifecycle logic. The Sonic Verifone Device Swap (`sonic-verifone-device-swap` v1.0.0) proves this: 12 phases, 50+ steps, conditional device logic, proof/serial/testing/return requirements, and troubleshooting content all exist as a `ProcedureDefinition` with no Sonic-specific UI or closeout code.
- Conditional device steps should use the generic `device_type_equals` condition. When jobs may involve multiple devices, the condition evaluator must support an array (`deviceTypes`) in addition to a single string (`deviceType`). The smallest generic job field addition (`deviceType?: string` and `deviceTypes?: string[]`) is sufficient.
- Warning text belongs in `ProcedureStep.warningText` metadata so it renders in both Guided and Quick modes without custom React alerts.
- Return obligations must not be auto-satisfied by removal. The `returnRequired` flag on an equipment requirement blocks closeout until an actual return custody event with receipt and tracking is recorded.
- Do not invent credentials, phone numbers, passwords, file paths, or download URLs in procedure instructions. Represent job-specific values (store numbers, stall numbers) as technician input prompts within the step instructions.

## Error Monitoring

- Any service test that imports a module pulling in `src/lib/supabase.ts` must mock it: that module throws at import time when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing, so the transit provider-selection test needed a hoisted supabase mock to run without env vars.
- A client error reporter must not import modules that can throw at module scope in a "missing config" startup path; init it only after Supabase config is validated (inside the existing try/catch in `main.tsx`).

## Admin Portal (2026-10-02)

- Separate admin web interface (`/admin`) from worker app — same backend, different UI entry point. Server-enforced role authorization (`requireAdmin`) is mandatory; hiding buttons in frontend is not a security boundary.
- Shared `activity_log` table with service-role access provides cross-user audit trail. Use `logActivity()` helper after successful feature operations. Avoid logging every UI render — log meaningful events (completion, sync, start).
- Admin role stored in Supabase `app_metadata.role` (preferred, server-controlled) or `user_metadata.role`. AuthContext exposes `isAdmin` for conditional UI rendering.
- Feature-specific data stays in its own tables (probation_check_ins, shower_proof_records). Centralized `activity_log` provides the timeline; do not create one giant table.
- Local-first offline support preserved for client features. Server sync is explicit (`syncToServer`, `loadFromServer`) with non-destructive merge (local unsynced changes preserved).
- Admin Portal requires online connection — no offline queue. Document as limitation (P012).
- Only probation connected to Admin in first slice. Other features (jobs, inventory, proofs) remain in their own UIs. Document as limitation (P013).
- Migration `drizzle/0006_activity_log.sql` must be applied to Supabase before Admin Portal works in production (P016).

- Admin authorization must ignore client-editable user metadata. Account sync requires actual lifecycle consumers, owner-scoped caches, and acknowledgment guards. Saving audit data in the same database transaction prevents false success; deterministic retry keys prevent duplicate activity.

## 2026-10-05 — Diagnostics investigation
Absolute URLs and local tests do not prove a 404 cause. Capture actual response evidence first. Consume shared sync state rather than creating competing hooks. Never log proof/request bodies; sanitize before storing/exporting. Use the store-issued ID to keep request updates aligned across producers.

## 2026-10-05 — Production evidence and acknowledgment
React can defer functional state updaters: do not calculate an async save acknowledgment from a ref updated only inside setState. Update the ref from the current records synchronously, then schedule the render; retain fingerprint/account guards.
