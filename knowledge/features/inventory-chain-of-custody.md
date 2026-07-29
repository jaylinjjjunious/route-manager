# Inventory And Chain Of Custody

## Purpose

Job-scoped inventory tracking for receiving, installation, removal, and return of physical items. The first vertical slice keeps the technician workflow inside the existing job detail surface and prioritizes camera-first evidence capture with minimal taps.

## Current Implementation

- `InventoryCustodyPanel` is rendered inside `JobDetailModal` for every job.
- Receive-in requires a part number, serial number, and item photo; optional receiving documents can be attached.
- Receive-in, install, removal, and return events are linked to the original job and item.
- Every event records an ISO timestamp, GPS coordinates when permission and signal are available, evidence IDs, and a SHA-256 predecessor hash.
- Return requires both a receipt number and tracking number and retains the original item identity.
- Events and evidence metadata are persisted per job in localStorage. Photo/document data is kept as data URLs for offline use.
- Events are also copied to a local sync queue. The page retries when online and registers the `inventory-custody-sync` Background Sync tag; the service worker wakes controlled clients to retry the queue.
- The queue currently has no durable authenticated server endpoint. Until that backend slice exists, queued events remain local and are not reported as server-synced.

## Workflow

1. Open Inventory from the main navigation, select an existing job, and use its custody panel.
2. Capture the item with the rear camera, enter part and serial numbers, and save Receive-in.
3. Tap Install when the item is installed, then Removal when it is removed.
4. Enter the return receipt and tracking number and record Return.
5. Review the latest event chain and evidence from the same job detail surface.

## Data And Integrity

The local ledger key is `inventory_custody_ledger_v1:<jobId>`. The shared queue key is `inventory_custody_sync_queue_v1`. Each event includes `previousHash` and `hash`; the UI verifies the local chain and shows a review state if event contents or ordering are changed.

This is tamper-evident local history, not tamper-proof storage. A user who controls browser storage can alter both records and hashes. Durable server verification, user identity, conflict handling, and append-only server persistence are the next required vertical slice.

## Related Source Files

- `src/components/InventoryCustodyPanel.tsx` — job detail UI and technician workflow
- `src/services/inventory/chainOfCustody.ts` — ledger, hash chain, evidence, queue, and GPS helpers
- `public/sw.js` — Background Sync wake-up message
- `src/components/JobDetailModal.tsx` — natural integration point
- `tests/inventoryChain.test.ts` — local persistence, lifecycle, and tamper detection tests

## Known Limitations

- No server route or durable database table exists for inventory custody events yet.
- Background Sync can notify an open controlled client, but cannot complete authenticated upload while no client has access to the Supabase session.
- Barcode detection is supported when the browser exposes BarcodeDetector; low-confidence, unsupported, and unmatched scans fall back to manual part-number correction. Full text OCR remains a follow-up enhancement.
- The initial offline reference catalog is sourced from the Drive contract PDF `1099 CE TJX AGREEMENT - Jaylin Junious - Sole Proprietor - Review.pdf` and contains only `24173-02-R`, `CBL445-040-02-A`, `MSC445-032-01-A`, and `M379-122-21-WWA-5-DN-0001027`. Receiving checks supported barcodes against this catalog and keeps manual correction when there is no match.
- End-to-end UI verification can use the loopback-only development verification handshake when both explicit development flags are enabled; it uses local seeded jobs and local custody storage, not production records or Supabase credentials.
- Large photo/document data URLs can approach browser storage limits.

---

**Last Updated:** 2026-07-29 (inventory-custody-first-slice)
