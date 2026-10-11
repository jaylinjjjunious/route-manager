# Inventory And Chain Of Custody

## Purpose

Job-scoped inventory tracking for receiving, installation, removal, and return of physical items. The first vertical slice keeps the technician workflow inside the existing job detail surface and prioritizes camera-first evidence capture with minimal taps.

## Current Implementation

- `InventoryCustodyPanel` is rendered on the dedicated Inventory page. Since 2026-10-10, the compact Job Detail Inventory shortcut opens that page with the selected job ID and matching domain; the panel is not embedded in the simplified popup.
- Inventory uses two explicit domains: existing jobs default to `merchandising` (the merchandising / secret-shopping company); only jobs with `inventoryDomain: 'contract_parts'` use the contract-parts company. The dedicated page displays and selects one domain at a time.
- Merchandising jobs use package custody: receive a package identifier and contents for the selected store job, capture delivery evidence before recording delivery, then record an exception or package return with receipt/tracking when applicable.
- Contract-parts jobs retain serialized part-number, serial-number, photo, and contract catalog matching; package fields and package events are not used in that domain.
- The domain-scoped Evidence photos control opens an offline calendar/timeline. Photos are grouped by captured event date with week, month, and year navigation, date counts, thumbnails, and event/job/item context.
- Contract-parts receive-in requires a part number, serial number, and item photo; merchandising package receive requires a package identifier and may omit serialized part matching. Optional receiving documents can be attached.
- Receive-in, install, removal, and return events are linked to the original job and item.
- Every event records an ISO timestamp, GPS coordinates when permission and signal are available, evidence IDs, and a SHA-256 predecessor hash.
- Return requires both a receipt number and tracking number and retains the original item identity.
- Events and evidence metadata are persisted per job in localStorage. Photo/document data is kept as data URLs for offline use.
- Events are also copied to a local sync queue. The page retries when online and registers the `inventory-custody-sync` Background Sync tag; the service worker wakes controlled clients to retry the queue.
- Authenticated Express GET/POST /api/inventory/custody-ledger now persists complete event/item/evidence snapshots in Supabase. GET /api/inventory/jobs exposes account/domain-filtered job metadata so cloud-only inventory jobs are selectable without changing the main schedule. Queues clear only matching acknowledgments; later local changes remain pending. The panel shows sync status and Retry inventory sync.
- Custody items and events can optionally carry procedure requirement identity: `requirementId`, `procedureId`, `procedureVersion`, `procedureStepId`, `visitId`, and `requirementRole` (`assigned_item`, `installed_item`, `removed_item`, `return_item`, `serial_capture`). These fields are optional for legacy compatibility and allow procedure-derived equipment requirements to be evaluated against real inventory evidence.

## Workflow

1. Open Inventory from the main navigation, select an existing job, and use its custody panel.
2. Capture the item with the rear camera, enter part and serial numbers, and save Receive-in.
3. Tap Install when the item is installed, then Removal when it is removed.
4. Enter the return receipt and tracking number and record Return.
5. Review the latest event chain and evidence from the same job detail surface.

## Data And Integrity

Current local keys are inventory_custody_ledger_v2:<domain>:<jobId>:<ownerId> and owner/domain-scoped queues. Unowned v1/v2 records and queues remain untouched. The selected-job panel offers an explicit ownership-confirmed import into an empty account ledger; originals are preserved. Legacy canonical integrity formats remain supported when SHA-256 verified. Owner lifetime generations guard delayed A→B→A responses and stale writes.

This is tamper-evident local history, not tamper-proof storage. A user who controls browser storage can alter both records and hashes. The server verifies SHA-256 chains, exact item/event/evidence identity and derived custody states. An atomic service-role-only RPC accepts replays/extensions, rejecting changed or shortened history, lost evidence and divergent forks. Compatible remote history restores locally; conflicts preserve both copies. RLS is enabled; direct anon/authenticated table/RPC access is revoked. Verified session ownership and expectedOwnerId are required.

### Procedure Equipment Evidence

Procedure definitions describe required equipment/serial/return obligations, while Inventory Custody remains the source of truth for actual devices and custody events. Pure helpers in `src/services/inventory/procedureInventory.ts` flatten job ledgers into inventory evidence and evaluate exact `requirementId`, `procedureId`, `procedureVersion`, `procedureStepId`, optional `visitId`, quantity, serial roles, removal tracking, and return completion.

Serial semantics are generic: `none` requires no serial; `single` requires one serial value; `old` requires a removed/original serial; `new` requires an assigned/installed replacement serial; `old_and_new` requires both old and new serials and they must be distinguishable. Removed-equipment tracking requires an actual removal/removed custody state. `returnRequired` is satisfied only by a return custody event/state with receipt and tracking data, not by removal alone. Legacy inventory without procedure identity remains readable but does not satisfy new procedure requirements through fuzzy model/name matching.

The retained generic Procedure workspace (not mounted in the simplified Job Detail popup) can write requirement-scoped custody events through `recordInventoryForRequirement(...)`. The UI records the exact procedure ID, version, step ID, requirement ID, active visit ID when present, and a generic custody role (`serial_capture`, `installed_item`, `removed_item`, or `return_item`) so the existing closeout evaluator can determine satisfaction from custody evidence.

## Account Sync Limits And Validation (2026-10-10)

- At most 200 events/100 items and 3 MB per ledger/request; 20 ledgers/10 MB per account and 100 MB global. Database storage accounting is serialized atomically. Existing durable request admission limits inventory writes to 10/minute, 200/month, one account write at a time.
- New images are prepared as JPEG, up to 1600px and 1 MB data URL; PDF/text/CSV documents are capped at 1 MB. Oversized/unsupported existing evidence stays local with an error. Local storage exhaustion is reported. Device/browser codec and camera checks remain separate.
- Empty account reads display “No inventory records yet — account checked”; only acknowledged records display Saved to your account.
- Migration 0008 applied; replay, two-owner isolation, append/conflict, evidence preservation, access and ledger quota verified using rollback-only SQL fixtures. All 51 focused tests, lint/build and production-bundle mocked-database checks pass. GitHub main and public Render build-info confirm bc4cc64. Signed-in controls remain unverified because the browser connection closed; do not describe the full interaction as ready.
- Main jobs and standalone Proof Vault are separate features; this slice syncs inventory only. No automatic branch merge or archival UI.

## Related Source Files

- server/inventory/inventoryRoutes.ts — bounded owner-scoped API.
- drizzle/0008_inventory_account_sync.sql — atomic history extension and storage accounting.
- src/services/inventory/integrity.ts — shared pure canonical hashing/verification.
- src/services/inventory/useInventoryAccountJobs.ts — cloud-only inventory job discovery.
- tests/inventoryAccountSync.test.ts and tests/inventoryDatabaseRollback.sql — preservation, lifetime and persistence checks.

- `src/components/InventoryCustodyPanel.tsx` — job detail UI and technician workflow
- `src/services/inventory/chainOfCustody.ts` — ledger, hash chain, evidence, queue, and GPS helpers
- `src/services/inventory/procedureInventory.ts` — pure procedure equipment/serial/removal/return satisfaction helpers for closeout
- `src/features/jobs/procedures/ProcedureWorkspace.tsx` — generic Procedure workspace prompts that route equipment requirement capture through Inventory Custody
- `public/sw.js` — Background Sync wake-up message
- `src/features/jobs/JobDetailModal.tsx` — natural integration point
- `tests/inventoryChain.test.ts` — local persistence, lifecycle, and tamper detection tests
- `tests/procedureInventoryCloseout.test.ts` — procedure equipment closeout satisfaction tests

## Known Limitations

- Cloud sync is bounded and does not automatically merge divergent custody histories. Conflict review/archival remains future work.
- Background Sync can notify an open controlled client, but cannot complete authenticated upload while no client has access to the Supabase session.
- Barcode detection is supported when the browser exposes BarcodeDetector; low-confidence, unsupported, and unmatched scans fall back to manual part-number correction. Full text OCR remains a follow-up enhancement.
- The initial offline reference catalog is sourced from the Drive contract PDF `1099 CE TJX AGREEMENT - Jaylin Junious - Sole Proprietor - Review.pdf` and contains only `24173-02-R`, `CBL445-040-02-A`, `MSC445-032-01-A`, and `M379-122-21-WWA-5-DN-0001027`. Receiving checks supported barcodes against this catalog and keeps manual correction when there is no match.
- End-to-end UI verification can use the loopback-only development verification handshake when both explicit development flags are enabled; it uses local seeded jobs and local custody storage, not production records or Supabase credentials.
- Large photo/document data URLs can approach browser storage limits.
- Contract-parts jobs must still be explicitly marked in imported or edited job metadata; no current seeded job is assigned to that domain.
- Evidence calendar data is derived from the active domain ledger, including evidence restored from the account. It remains usable offline after local restoration.

---

**Last Updated:** 2026-10-10 (inventory cloud sync deployed; signed-in verification blocked by browser connection)
