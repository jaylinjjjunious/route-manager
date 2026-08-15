# Inventory And Chain Of Custody

## Purpose

Job-scoped inventory tracking for receiving, installation, removal, and return of physical items. The first vertical slice keeps the technician workflow inside the existing job detail surface and prioritizes camera-first evidence capture with minimal taps.

## Current Implementation

- `InventoryCustodyPanel` is rendered inside `JobDetailModal` for every job and on the dedicated Inventory page.
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
- The queue currently has no durable authenticated server endpoint. Until that backend slice exists, queued events remain local and are not reported as server-synced.
- Custody items and events can optionally carry procedure requirement identity: `requirementId`, `procedureId`, `procedureVersion`, `procedureStepId`, `visitId`, and `requirementRole` (`assigned_item`, `installed_item`, `removed_item`, `return_item`, `serial_capture`). These fields are optional for legacy compatibility and allow procedure-derived equipment requirements to be evaluated against real inventory evidence.

## Workflow

1. Open Inventory from the main navigation, select an existing job, and use its custody panel.
2. Capture the item with the rear camera, enter part and serial numbers, and save Receive-in.
3. Tap Install when the item is installed, then Removal when it is removed.
4. Enter the return receipt and tracking number and record Return.
5. Review the latest event chain and evidence from the same job detail surface.

## Data And Integrity

The local ledger key is `inventory_custody_ledger_v2:<domain>:<jobId>`. Sync queues are also domain-specific. Legacy v1 merchandising ledgers and queues migrate into the merchandising namespace without deleting records; legacy hashes retain their original canonical format, while new domain-aware events use the v2 format. Each event includes `previousHash` and `hash`; the UI verifies the local chain and shows a review state if event contents or ordering are changed.

This is tamper-evident local history, not tamper-proof storage. A user who controls browser storage can alter both records and hashes. Durable server verification, user identity, conflict handling, and append-only server persistence are the next required vertical slice.

### Procedure Equipment Evidence

Procedure definitions describe required equipment/serial/return obligations, while Inventory Custody remains the source of truth for actual devices and custody events. Pure helpers in `src/services/inventory/procedureInventory.ts` flatten job ledgers into inventory evidence and evaluate exact `requirementId`, `procedureId`, `procedureVersion`, `procedureStepId`, optional `visitId`, quantity, serial roles, removal tracking, and return completion.

Serial semantics are generic: `none` requires no serial; `single` requires one serial value; `old` requires a removed/original serial; `new` requires an assigned/installed replacement serial; `old_and_new` requires both old and new serials and they must be distinguishable. Removed-equipment tracking requires an actual removal/removed custody state. `returnRequired` is satisfied only by a return custody event/state with receipt and tracking data, not by removal alone. Legacy inventory without procedure identity remains readable but does not satisfy new procedure requirements through fuzzy model/name matching.

## Related Source Files

- `src/components/InventoryCustodyPanel.tsx` — job detail UI and technician workflow
- `src/services/inventory/chainOfCustody.ts` — ledger, hash chain, evidence, queue, and GPS helpers
- `src/services/inventory/procedureInventory.ts` — pure procedure equipment/serial/removal/return satisfaction helpers for closeout
- `public/sw.js` — Background Sync wake-up message
- `src/features/jobs/JobDetailModal.tsx` — natural integration point
- `tests/inventoryChain.test.ts` — local persistence, lifecycle, and tamper detection tests
- `tests/procedureInventoryCloseout.test.ts` — procedure equipment closeout satisfaction tests

## Known Limitations

- No server route or durable database table exists for inventory custody events yet.
- Background Sync can notify an open controlled client, but cannot complete authenticated upload while no client has access to the Supabase session.
- Barcode detection is supported when the browser exposes BarcodeDetector; low-confidence, unsupported, and unmatched scans fall back to manual part-number correction. Full text OCR remains a follow-up enhancement.
- The initial offline reference catalog is sourced from the Drive contract PDF `1099 CE TJX AGREEMENT - Jaylin Junious - Sole Proprietor - Review.pdf` and contains only `24173-02-R`, `CBL445-040-02-A`, `MSC445-032-01-A`, and `M379-122-21-WWA-5-DN-0001027`. Receiving checks supported barcodes against this catalog and keeps manual correction when there is no match.
- End-to-end UI verification can use the loopback-only development verification handshake when both explicit development flags are enabled; it uses local seeded jobs and local custody storage, not production records or Supabase credentials.
- Large photo/document data URLs can approach browser storage limits.
- Contract-parts jobs must still be explicitly marked in imported or edited job metadata; no current seeded job is assigned to that domain.
- Evidence calendar data is derived only from the active domain ledger; the current server sync endpoint remains unavailable, so the calendar is local/offline-first.

---

**Last Updated:** 2026-08-15 (Procedure equipment requirements connected to Inventory Custody evidence)
