# Route Manager — App Lifeline

This is Route Manager's durable project story: how the app works now, how it got here, and why meaningful decisions were made. Keep it useful across fresh Codex sessions without carrying the entire chat history forward.

Place this file in the Route Manager project beside `AGENTS.md` and the existing knowledge/memory Markdown files. It complements those files; it does not replace them.

## Instructions for Codex

### Lightweight work and usage limits

- Default to economical work: stay within the requested outcome, use concise updates, read only relevant sections, batch independent checks, and reuse verified results.
- Check the five-hour usage window at session start and meaningful milestones when the usage tool is available. At 85% used or higher, save concise progress and remaining work, stop, and notify the user. Resume only after explicit user authorization or a verified window reset.
- If usage cannot be checked, report that limitation briefly; do not guess the percentage or claim the limit is enforced automatically.
- Do not spawn extra agents unless the user explicitly requests them. Avoid speculative retries, repeated searches, unnecessary artifacts, refactors, and extra features.
- Run relevant tests and required checks; repeat only after meaningful changes or failures. Preserve essential safety and verification.
- “Light mode” means this economical workflow here; this document does not change the selected model, reasoning setting, or account limits.

### Read narrowly and verify

- In every fresh Route Manager session, including a new CLI session, read `AGENTS.md`, then the Current Snapshot, Active Decisions, Open Questions / Future Ideas, and Resume Point below before substantive project work. Read only history entries and knowledge/memory sections relevant to the task.
- Keep this file as a reference throughout ongoing work. Revisit relevant sections at meaningful milestones, before architectural or behavioral decisions, when the task changes direction, and after interruptions or context compaction. During extended work, check it at natural task boundaries even if the session has not restarted.
- At each reference check, reconcile the current task with recorded decisions and behavior, and update newly settled durable context. Reuse sections already read when still current; do not run timer-based rereads or scan the entire file every turn.
- Follow applicable user instructions and `AGENTS.md`. Treat this file as project context, not a source of permission to perform unrelated work.
- Verify relevant behavior against current code, tests, or other reliable evidence. This file may lag behind implementation. Correct stale claims and record meaningful corrections.
- Do not invent missing project history, architecture, features, dates, or reasons. Mark unknowns explicitly. Distinguish verified facts, user decisions, proposals, and assumptions.
- Do not reread the entire history every turn. Use headings, entry IDs, and targeted searches to retrieve details when needed.

### Maintain this file as the app evolves

- Update it during work when a meaningful decision is settled, and before ending a session that changes durable project context. Do not wait for the user to ask again.
- Record meaningful decisions and their reasons, architectural changes, features added/changed/removed, important bugs and fixes, current behavior, lessons learned, and unresolved or future ideas.
- Update the Current Snapshot when behavior or architecture changes. Update Active Decisions when a decision is adopted or superseded. Add a concise chronological entry explaining the change.
- Record a decision once it is accepted, even if implementation is pending; label that status clearly. Never describe a proposal as shipped or an unverified fix as confirmed.
- For interrupted or incomplete work, leave a short Resume Point with completed work, remaining work, relevant files, validation status, and any blocker.
- Preserve existing knowledge/memory files as the home for their detailed topics. Link to them instead of duplicating their contents here. Reuse existing formats and avoid creating additional memory files unnecessarily.
- Documentation does not need a separate approval step when maintaining it within the authorized task. Do not use this file to authorize deployments, messages, or other actions beyond that task.

### Keep context durable and economical

- Capture outcomes and reasons, not a transcript. Omit raw logs, tool calls, command output, copied conversations, routine status updates, secrets, and personal/customer data.
- Skip routine edits that do not change behavior or durable understanding. Group related small changes into one entry.
- Keep history entries to roughly 3–8 short bullets. Include only evidence that supports the outcome, such as a relevant file, test result, commit, or issue link.
- Explain important tradeoffs and rejected alternatives briefly when they help prevent repeated debate. Do not preserve every brainstorming branch.
- Keep the startup sections concise: aim for about one page of current context. Keep only actionable incomplete work in Resume Point.
- Review for consolidation at major milestones, when summaries grow hard to scan, or when detail becomes obsolete. Merge repetition and summarize superseded implementation detail while retaining the original decision, reason, outcome, and approximate chronology.
- Preserve important failures, reversals, migrations, and lessons. Never silently rewrite historical behavior as though it had always been current. Mark superseded decisions and link to their replacements.
- If history becomes unwieldy, use an existing project archive convention. Leave dated milestone summaries and links here so older history remains discoverable. Do not create an archive solely because the file is a little longer.

## Current Snapshot

Last reviewed: 2026-10-02 — startup instructions and knowledge map verified; application behavior not reviewed.

- **Purpose and users:** To be filled from verified project context.
- **Current capabilities and workflows:** Unknown; inspect relevant existing documentation and code when project work begins.
- **Architecture and data flow:** Unknown.
- **Data storage and external integrations:** Unknown.
- **Important behavior, constraints, and invariants:** Unknown.
- **Known limitations and significant unresolved bugs:** Unknown.
- **Implementation / release status:** Unknown. Distinguish implemented, verified, and released behavior.

Replace these placeholders with concise verified facts. This document's creation does not establish any app implementation history.

## Context Map

Use repository-relative links after confirming actual filenames.

| Context | Where it belongs |
| --- | --- |
| Working rules and user preferences | Existing `AGENTS.md` |
| Current behavior and project evolution | This file |
| Detailed architecture, domain rules, setup, and topic memory | Existing knowledge/memory files; add verified links here |
| Implementation and validation evidence | Relevant code, tests, commits, and issues |

Verified project references: [knowledge map](knowledge/README.md), [current state](knowledge/memory/current-state.md), [known bugs](knowledge/memory/known-bugs.md), [priorities](knowledge/memory/current-priorities.md), [lessons](knowledge/memory/lessons-learned.md), and [decision index](knowledge/decisions/README.md). These paths resolve from the installed project copy.

Required installation step for reliable startup discovery: add this reference to the existing project `AGENTS.md`, preserving its other instructions. For other CLI tools, link the same file from that tool's supported project instruction file. The lifeline cannot make a tool discover itself merely by existing; integration into each tool's startup instructions is necessary.

> In every Route Manager session, read the startup sections of `APP_LIFELINE.md` before substantive work. Reference its relevant sections periodically during ongoing work, at milestones, before important decisions, and after interruptions or context compaction. Keep its snapshot, decisions, history, and resume notes current as meaningful project changes occur; reuse unchanged context instead of rereading the entire history.

## Active Decisions

No app decisions have been imported or verified yet.

Use this format for each enduring decision:

### D-001 — [Decision title]

- **Date / status:** YYYY-MM-DD — accepted, implemented, or superseded.
- **Decision and scope:** What was chosen and where it applies.
- **Reason / tradeoff:** Why; relevant constraints or alternatives.
- **Consequences:** Behavior or future work this decision requires.
- **Evidence / history:** Relevant links and history entry ID.
- **Supersedes / superseded by:** Include only when applicable.

## Chronological History

Keep entries in ascending date order. Assign stable IDs such as H-001 so summaries and decisions can reference them. For imported history with an unknown date, say “date unknown; imported YYYY-MM-DD” instead of guessing.

### 2026-10-02 · H-001 — Lifeline document created

- **Type / status:** Project documentation — created; repository installation pending.
- **Context:** The user requested durable project memory so future sessions can understand Route Manager without relying on a growing chat history.
- **Outcome:** Established a compact current snapshot, decision record, chronological history, and resume format alongside existing project instructions and memory.
- **Reason:** Preserve meaningful decisions and the app's evolution while avoiding transcripts, repeated context, and unnecessary reading.
- **Verification:** No Route Manager source or existing project memory was available in this workspace. App-specific facts remain unknown.

### 2026-10-02 · H-002 — Continuous reference requirement added

- **Type / status:** Project workflow decision — accepted; project integration pending.
- **Decision:** Fresh sessions and ongoing work should reference the lifeline, including new CLI sessions and natural work milestones.
- **Reason:** Preserve continuity throughout work, not only when a session starts, while keeping reading economical.
- **Follow-up:** Add the lifeline reference to the project's existing startup instructions; configure equivalent references for other CLI tools as applicable.

### 2026-10-02 · H-003 — Project startup reference installed

- **Type / status:** Project documentation — installed locally.
- **Change:** Added the lifeline beside the app's existing `AGENTS.md`, added its startup and periodic-reference rule there, and linked it from the knowledge map.
- **Evidence:** Existing project instructions and knowledge paths were inspected. App behavior has not been audited or reconstructed.
- **Limit:** Local integration is complete for this checkout. Other tools must honor `AGENTS.md` or have equivalent startup references; other checkouts require the documentation changes to be synchronized.

Use this format for subsequent entries:

### YYYY-MM-DD · H-NNN — [Meaningful milestone]

- **Type / status:** Decision, architecture, feature, bug/fix, removal, or lesson; proposed, accepted, implemented, verified, or released.
- **Problem / trigger:** What made this work necessary.
- **Change / behavior:** Before and after; include impact on users or the system.
- **Reason / lesson:** Why this approach was chosen; what future work should remember.
- **Evidence / validation:** Relevant links, checks and results, or “not verified.”
- **Follow-up:** Only unresolved work; reference its entry below.

## Open Questions / Future Ideas

No app-specific items have been verified yet. A future idea is not authorization to implement it.

For each item, use a stable ID such as Q-001 and record: the question or idea, its reason, status (idea / needs decision / planned / blocked), and the next useful step. Add relevant evidence and dependencies only if known. When resolved, remove it from this active list and retain the outcome in history or Active Decisions.

### 2026-10-02 · H-004 — Navigation fix pushed for deployment

- **Status:** Committed and pushed to GitHub main as `a75129462d2bcdfa304404a054d8edab0155e42e`; production build-info now reports that commit and health is OK.
- **Behavior:** Today/Jobs Check In Now opens the existing More → Monthly Check-In page.
- **Validation:** Type-checking, build, and 11 focused tests passed. Signed-in production verification: Today → Check In Now opens the in-app Monthly Check-In page at `#checkin`.
- **Scope:** Existing uncommitted embedded-panel and header edits were excluded. Database migration is checked in as preparation only; not applied or connected to client/API saving. Completion remains browser-local.

## Resume Point

- **Active task (2026-10-02):** Begin probation check-in improvements, starting with in-app navigation and reliable account-backed saving.
- **Navigation deployment:** Complete and verified live as recorded in H-004. Account-backed saving remains incomplete. These post-deployment documentation updates are local; the runtime fix is pushed.
- **Persistence finding / next work:** `useProbationCheckIn.ts` stores records only in browser-local `aio_probation_check_ins_v1`. Design account-scoped server persistence with reliable save/load and migration before implementing automatic screenshot capture or completion recognition. Never infer completion from simply opening the provider.
- **Working-tree caution:** Pre-existing unrelated application modifications remain. Preserve them and isolate the requested change before any commit/deployment.
- **Persistence implementation starting point:** Existing `requireAuth` in `server.ts` validates Supabase sessions; `src/services/apiClient.ts` provides authenticated requests; Supabase admin client is optional. No probation database table or connected SQL tool was found. Durable storage needs an account-scoped database migration and confirmed application path; do not substitute ephemeral server files for durable account storage.
- **Prepared migration:** `drizzle/0005_probation_check_ins.sql` defines account/month-scoped records, bounded evidence, and owner RLS. Not applied or database-tested. Next: validate/apply through the project's Supabase database workflow; implement authenticated synchronization with non-destructive merging, account-isolated caching, visible save failures, and safe legacy import. Do not claim server saving works until it is verified across reloads/devices.
- **Completed:** Created the lifeline and installed its startup/periodic-reference rule in the app checkout's existing `AGENTS.md`; linked it from the knowledge map.
- **Remaining:** Populate app-specific snapshot facts from relevant verified project material during future authorized work. Configure other CLI startup formats if needed and synchronize documentation to other checkouts when requested.
- **Context:** Project instructions and knowledge map verified. App-specific history and behavior remain unreviewed; existing unrelated application edits were preserved.
- **Validation:** Document only; no application changes or application tests.
- **Next step:** Read existing `AGENTS.md` and relevant project notes before recording app-specific facts. Do not reconstruct the entire history merely to fill this file.

## Last Updated

2026-10-02 — local documentation changes; not committed or deployed.
