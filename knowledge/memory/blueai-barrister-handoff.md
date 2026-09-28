# BlueAI / Barrister handoff — 2026-09-27

## User intent and constraints
- Phone app should request BlueAI work on the Windows computer and receive Barrister results.
- Include assigned work orders and available jobs, kept distinct. Read only; no acceptance, bidding, status changes, or messaging.
- Conserve usage: reuse existing work, small samples, sparse polling, no redundant research or broad validation before a concrete change.
- Prove locally before considering paid cloud hosting. Computer must remain awake for desktop execution.

## Verified progress
- BlueAI 1.1.26 is installed under C:/Program Files/BlueAI_nxt. Native access works through the computer-use skill and node_repl @oai/sky; earlier claims that desktop access was unavailable were superseded.
- Launch app ID com.blueai.app.nxt. Always rediscover the window because IDs change. Chat UI is hosted at https://ai-worker-app.now.gg/chat inside the desktop app.
- Submitted one read-only request for at most two assigned Barrister orders and two available jobs, requesting structured output without contact details, access codes, or credentials, plus a supported export capability check.
- Last observed execution status before interruption: Starting BlueStacks Instance. No actual job extraction or export was verified. Do not rerun blindly; recover the existing conversation first. Credits displayed fell from 452 to 445 during that run.
- Official BlueStacks skill guide confirms custom instructions, Python scripts, and structured output; an external supported trigger API has NOT been established.

## Existing workspace work (preserve)
- On resumption the checkout was main with substantial pre-existing uncommitted BlueAI ingestion code, tests, and documentation. This task has not authored or validated that implementation.
- Read knowledge/features/blueai-ingestion.md and knowledge/decisions/2026-09-27-blueai-ingestion.md before editing.
- Existing receiver expects title/date/startTime/endTime/location/sourceApp/externalId, optional pay/coordinates, a server machine token, configured owner, persistent data directory, and a real authenticated browser session.
- Contract gap: current allowed payload fields have no assigned/available category. Do not ingest available opportunities as assigned calendar jobs. Required exact schedule fields may be absent in Barrister; never invent them.
- Render free storage is ephemeral; existing receiver docs explicitly prohibit enabling it there without persistent storage. No deployment/configuration has been performed for this prototype.

## Next steps
1. Recover BlueAI conversation result and identify any emulator/login blocker.
2. Verify a small real read-only extraction and supported result export; keep actual private job data out of Git.
3. Reconcile assigned/available distinction and missing schedule handling before connecting sender to receiver.
4. Only then configure/test an authenticated local round trip. Do not expose desktop control or invent a private API.

## Recovered result
- Open BlueAI → top-right three-dot Navigation menu → Chat History → newest conversation titled Read-only integration test for my Route Manager app. History view has the entire result; do not rerun extraction just to recover it.
- Saved BlueAI response reports zero assigned orders and one available Barrister job, with order number, city, pay, short title/description, month/day and start time, and Pending Dispatch status. This is BlueAI-reported extraction, not independently verified against Barrister UI.
- BlueAI reports a supported write_file tool and suggests C:/ProgramData/BlueAI_nxt/agent_files/work_orders.json for local export. No file export has yet been invoked or verified; no ingestion into Route Manager has occurred.
- Exact private job details intentionally omitted from this tracked handoff. They remain in the user's BlueAI chat history.
- Returned schedule lacks an explicit year and end time. Existing receiver requires a full date and start/end times. Do not fabricate values or send this available listing into the assigned calendar.
- Next concrete test: ask BlueAI to export the saved extraction using its supported tool, verify file creation privately, then reconcile the receiver's category/missing-time contract before real import. Preserve all pre-existing dirty integration files; do not commit or deploy them without review and required checks.
- User repeated the request to conserve usage. Keep future work narrow and avoid repeated searches/polls.

## Export test succeeded
- BlueAI's export-only follow-up created the requested JSON file. Independently parsed the actual host file: zero assigned records, one available record. File creation is now verified, unlike the initial claim.
- Export-only task is in BlueAI chat history. It required one confirmation of the destination and did not require another Barrister scan. Keep the real file outside Git.
- Added a separate Jobs → BlueAI results local-file preview for this exact output shape; source schedules stay verbatim and available offers cannot enter the assigned calendar. See knowledge/features/blueai-export-review.md. Validation and deployment status must be checked before claiming this UI is live.

## Validation resumed 2026-09-28
- Lint, production build, and four focused parser tests passed. Actual local UI import verified zero assigned and one available record with unchanged source schedule. No new scan was performed.
- Publishing only the standalone review panel; pre-existing receiver changes remain uncommitted and unvalidated for release. Phone triggering and persistent result delivery are still pending.

