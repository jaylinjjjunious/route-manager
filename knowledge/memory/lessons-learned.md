# Lessons Learned

## Authentication

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
- Multipart form parsing needs careful handling. A hand-rolled parser caused issues and was replaced with multer.

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

## External API Integration (Transit)

- Auth header can be a literal `apiKey` header, not `Bearer` — read the upstream docs, don't assume.
- Transit v4 returns HTTP 200 with an `{"error": "..."}` body for malformed plan requests — treat 200-with-error as failure, not success.
- Build upstream URLs with `new URL(base + pathname)` when the base URL has a path (`/v4`); `new URL(pathname, base)` silently drops it.
- Sensitive upstream keys must be server-side only; gate the UI with a separate public build-time `VITE_` flag and enforce the separation with a key-hygiene test.
- Mocking `fetch` in Vitest requires `vi.fn<FetchMock>` typing and reading `init?.headers` (RequestInit) to satisfy TypeScript — cast headers via `new Headers(...)` when asserting.
- Test upstream module selection with `vi.stubEnv`/`vi.resetModules` (dynamic import) so the chosen provider is actually re-evaluated per test.
- A route's first and last stops are not necessarily the rider's boarding and exit stops. Prefer plan offsets and stop schedule items, carry confidence in the normalized contract, and visibly label any fallback as inferred or unavailable.
- Scheduled and predicted transit times are separate facts. Preserve both Unix-second values, use the predicted value for display only when the upstream marks the data realtime, and expose that realtime status to the UI.

## Error Monitoring

- Any service test that imports a module pulling in `src/lib/supabase.ts` must mock it: that module throws at import time when `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing, so the transit provider-selection test needed a hoisted supabase mock to run without env vars.
- A client error reporter must not import modules that can throw at module scope in a "missing config" startup path; init it only after Supabase config is validated (inside the existing try/catch in `main.tsx`).

---

**Last Updated:** 2026-08-15 (Procedure workspace modal selector lesson)
