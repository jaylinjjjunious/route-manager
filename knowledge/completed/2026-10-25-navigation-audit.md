# Route Manager hands-on navigation audit — 2026-10-25

Scope: public All in One hallway, isolated guest workspace and the existing signed-in admin account in Edge. Cleaning/import excluded. No production jobs, habits, check-ins, proof, rides or account settings submitted or deleted. Guest-only labeled verification data remains separate from accounts.

| Area | Observed interaction/result |
| --- | --- |
| Entry and guest | Live bypass, Today/Jobs, create/edit, completion/reload/reopen, starting address, Maps, hallway roundtrip and explicit Sign in/re-entry passed in preceding release 54b519a. |
| Signed-in Today / Jobs | Existing session recovered, seven Today jobs retained. Hallway entry/return works. Jobs lists, screenshot import consent and unsaved process-serve form open/cancel. |
| Job details | Store/address and Maps URL render. Preview Guide opens correct empty-job prompt and returns to details. Scan preparation opens without capture. |
| Sidebar | Wordmark opening, close/Escape and full-height modal/body lock verified; 390×844 viewport has no horizontal overflow and 320px sidebar fits. |
| Account destinations | Monthly Check-In reports saved account status; Inventory verifies empty account ledger. Proof Vault, Habits, Battery, Tracker, Transit tools, Change Password, Support, Diagnostics and Admin overview/activity/probation open. Transit returns live stops. No irreversible actions exercised. |
| Assistant | Opens with quick prompts and closes; no AI message submitted. |
| Browser history | Reproduced defect: hallway → Today → Jobs → Back leaves app because tabs replace the same history entry. Fixed with shared useAppNavigation pushState/popstate/hashchange handling; tests exercise Back/Forward, duplicate taps, empty/retired/unknown hashes. |
| Habits | Reproduced warning: nonexistent /api/habits returns HTML, breaking JSON sync. Removed dead cloud requests, preserved local task/log storage, added explicit browser-only/no-account-sync copy. Tests preserve existing task/new log through remount with zero fetches. |
| API fallback | After existing authentication, unmatched /api requests now return JSON 404 rather than a successful HTML shell. Anonymous admin/unknown requests retain JSON 401. Registered API authentication remains unchanged. |
| Scan close | Both icon-only close controls now have accessible names and explicit button types. |

Validation: 25 focused navigation/profile/guest/habit tests pass; final root lint/build pass. Released at 10c6e9715ed2e4a6a427e0db3b2be248582a4f38; GitHub main/exact public Render SHA verified. Live signed-in Inventory → Back Jobs → Back Today → Forward Jobs, Jobs reload, explicit Habits browser-only notice and named scan exit pass. Guest bypass/reload still works independently; anonymous admin and unknown API requests remain JSON/auth-gated 401. No production records changed. Navigation audit complete within the non-destructive scope; camera/uploads/real completions/password changes were not exercised.

Practical limits: camera/microphone/GPS, actual proof uploads, real job/probation completions, password changes, ride start/end and external CE submission were not performed. These cannot be claimed verified by navigation alone. Habits remains browser-local, with legacy keys preserved; no account/cloud migration introduced. A library deprecation warning is non-blocking. One receiving-end connection console error appeared during reload without a reproduced app failure; its origin is unconfirmed, and app source has no matching browser-extension messaging calls. The Habits JSON warning no longer appears. No claim that every possible action/integration is failure-free.
