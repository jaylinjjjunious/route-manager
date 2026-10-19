# Next App Process — Sonic Field Pilot Readiness

Repository: jaylinjjjunious/route-manager
Branch: main

Task:
Take the current Sonic Verifone Device Swap workflow from technically complete to field-pilot ready.

This is the next process after the Job Detail mobile redesign.

Do NOT add Mission Control in this task.
Do NOT add another customer procedure.
Do NOT redesign the lifecycle/procedure/proof/inventory/closeout architecture.

The goal is to validate and tighten the complete technician flow from job creation through closeout, then add only the smallest missing assignment/defaulting behavior needed for real use.

## 1. Start from current main

Inspect the current repo state first.

Confirm:
- latest Job Detail tab redesign is present
- Sonic procedure v1.0.0 resolves correctly
- Sonic harness still works
- local auth bypass is still DEV + env flag + loopback only
- existing tests/lint/build status

Run:
- git status
- git log -5 --oneline
- npm test
- npm run lint
- npm run build

Fix any current regression before adding new behavior.

Do not use ts-ignore, disable tests, or weaken types.

## 2. Launch the real local technician flow

Start locally with:

VITE_LOCAL_AUTH_BYPASS=true
VITE_ENABLE_SONIC_PROCEDURE_HARNESS=true

Report the exact URL emitted by the dev server.

Use the Sonic harness and test the redesigned Job Detail on:
- 320 px
- 390 px
- 430 px

If a real phone is available, test there too.

## 3. End-to-end technician acceptance path

Validate this exact flow:

1. Create a Sonic field_task job.
2. Select one or more devices:
   - V400M
   - UX301
   - UX401
3. Confirm the Sonic Verifone Device Swap procedure assignment.
4. Open the job.
5. Confirm WORK tab is readable and focused.
6. Arrive / Check In.
7. Start Job.
8. Continue Procedure.
9. Work through the current phase.
10. Capture required proof.
11. Record required serial/inventory information.
12. Complete testing acknowledgements.
13. Pause/resume once to confirm lifecycle persistence.
14. End the visit if needed and reopen/continue correctly.
15. Mark Work Complete.
16. Open CLOSEOUT.
17. Confirm blockers are accurate.
18. Jump from blocker to correct procedure step.
19. Complete remaining proof/inventory/return requirements.
20. Complete final closeout.
21. Refresh and confirm persisted state remains correct.

## 4. Procedure suggestion and assignment behavior

Inspect current JobModal Sonic suggestion behavior.

Required product behavior:
- selecting Sonic + supported device(s) may SUGGEST sonic-verifone-device-swap@1.0.0
- suggestion must be visible
- exact version must be shown
- user must explicitly confirm assignment
- do not silently assign
- do not silently upgrade to a newer version
- editing a pre-start job may change assignment normally
- changing assignment after work starts must continue using existing confirmation-required behavior

If the current UI only says a procedure will be suggested later but does not actually provide an explicit confirmation flow, implement the smallest clean confirmation interaction.

Use existing assignment APIs.

## 5. Deterministic procedure defaulting/matching layer

Add a small generic matching layer only if needed.

Purpose:
Given job fields such as:
- customer/company
- jobType
- deviceTypes

return a list of suggested exact procedure versions.

For Sonic v1, deterministic mapping may suggest:
- sonic-verifone-device-swap@1.0.0

Rules:
- suggestion only
- no silent assignment
- exact ID/version
- no latest-version fallback
- no fuzzy AI matching in this slice
- unsupported/ambiguous inputs remain unresolved

Keep this generic enough that future customers can register match rules without adding customer-specific React components.

Suggested location:
- src/features/jobs/procedures/procedureSuggestions.ts

Prefer pure functions and tests.

## 6. Job import readiness

Inspect existing Job Import.

Support deterministic Sonic recognition only where source data is explicit enough.

Possible structured matches:
- customer/company clearly Sonic
- device identifiers explicitly contain V400M, UX301, UX401
- compatible job type

Import preview should show:
- mapped customer/company
- mapped deviceTypes
- suggested procedure ID/version
- unresolved fields

Require user confirmation before assignment.

If device type cannot be determined, do not guess.

Do not build AI parsing in this task.

## 7. Duplicate detection

If the current creation/import flow already has duplicate detection, make sure the Sonic path uses it.

If duplicate detection is missing from this path, add the smallest warning-only integration based on existing job identity fields.

Rules:
- warn
- show likely duplicate
- user decides
- never silently merge

Do not create a large deduplication subsystem in this task.

## 8. Real technician readability pass

Use the all-devices Sonic harness job as the stress case.

Check:
- WORK tab does not become a long report again
- PROCEDURE current phase is obvious
- Quick Mode can be scanned while holding tools
- Guided Mode instructions remain readable
- critical grounding warning is prominent
- no essential text below 12px
- proof action is easy to reach
- serial fields are easy to enter
- no sticky UI covers important content
- keyboard does not make serial/return inputs unusable
- CLOSEOUT blocker language is understandable

Fix only clear usability defects.

Do not redesign the entire screen again.

## 9. Proof validation

Confirm with real UI behavior:
- required proof stays attached to exact requirement identity
- wrong requirement does not satisfy another requirement
- proof capture returns user to the same procedure context
- requirement updates immediately after capture
- refresh preserves satisfaction

Proof Vault remains the source of truth.

## 10. Inventory / serial / return validation

Confirm with real UI behavior:
- old serial capture
- new serial capture
- old_and_new distinction where required
- removed equipment state
- returned equipment state
- removal alone does NOT satisfy return
- return requires receipt + tracking when the procedure requires them
- refresh preserves the ledger

Inventory Custody remains the source of truth.

## 11. Closeout validation

Confirm Closeout Gate uses the same canonical evaluator as Procedure Workspace.

Test at least:
- missing proof blocks
- missing serial blocks
- missing test blocks
- missing return blocks
- satisfied requirements unblock correctly
- unresolved procedure assignment blocks safely
- final completion only enabled when all active required/conditional requirements are satisfied

No second evaluator.

## 12. Harness improvements

Extend the DEV-only Sonic harness only if necessary to create these states quickly:
- no procedure assigned
- ambiguous/no device selected
- active V400M job
- active all-devices job
- blocked onsite
- awaiting support
- work complete pending closeout
- return still pending
- fully closeout-ready

Keep all harness behavior behind:
VITE_ENABLE_SONIC_PROCEDURE_HARNESS=true
and import.meta.env.DEV.

No production seed data.

## 13. Automated tests

Add/update tests for at least:
1. deterministic Sonic suggestion
2. exact procedure version returned
3. non-Sonic job does not receive Sonic suggestion
4. unsupported device does not silently match
5. explicit confirmation required before assignment
6. import preview includes suggested procedure
7. ambiguous import remains unresolved
8. deviceTypes persist
9. procedure assignment persists
10. Continue Procedure opens current step
11. Quick/Guided mode does not change requirement state
12. proof requirement exact matching remains intact
13. serial old/new requirements remain distinct
14. removal does not satisfy return
15. closeout blocks correctly
16. unresolved assignment blocks correctly
17. legacy non-procedure jobs still work
18. duplicate warning does not silently merge
19. local auth bypass safety guards remain intact
20. full existing suite does not regress

## 14. Validation

Run all:
- npm test
- npm run lint
- npm run build

All three must pass before completion.

Then launch locally again and report the exact URL.

## 15. Deployment

If main is clean/current and all checks pass:
- commit this slice separately
- push to main

If not:
- use feature/sonic-field-pilot-readiness

If main push triggers Railway deployment, verify the deployment status.
Do not claim success without verification.

## 16. Final report

Report:
1. files changed
2. original test/lint/build baseline
3. procedure suggestion behavior before/after
4. assignment confirmation behavior
5. deterministic matching layer
6. import behavior
7. duplicate warning behavior
8. technician mobile UX findings
9. proof validation results
10. inventory/serial/return validation results
11. closeout validation results
12. harness changes
13. 320/390/430 results
14. real-phone result if available
15. final tests
16. final lint
17. final build
18. exact local URL
19. commit SHA
20. branch pushed
21. deployment status
22. remaining blockers before declaring Sonic v1.0.0 ready for real field pilot

Do not declare field-pilot ready unless the real technician flow is usable and all required validation passes.
