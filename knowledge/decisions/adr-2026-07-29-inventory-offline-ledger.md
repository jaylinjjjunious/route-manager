# ADR: Start Inventory Custody With A Job-Scoped Offline Ledger

**Status:** Accepted for first vertical slice

## Context

Route Manager stores jobs and proof-vault evidence in browser storage. The Railway Express backend has authenticated shower-proof, dispatcher, OCR, and health endpoints, but no inventory event API or durable inventory schema. A camera-first receiving workflow must work when a technician is offline without disturbing current job and proof behavior.

## Decision

Implement the first inventory slice inside the existing job detail modal with a job-scoped local ledger, event-level evidence IDs, automatic timestamp/GPS capture, and a hash chain. Copy events to a local sync queue, retry on `online`, and register a Background Sync tag that wakes controlled clients. Do not claim server synchronization until an authenticated durable endpoint and conflict policy are implemented.

## Consequences

- Technicians can receive, install, remove, and return items offline now.
- Existing navigation, job statuses, and proof-vault records remain unchanged.
- The local history is tamper-evident but not tamper-proof or server-authoritative.
- The next slice must add authenticated durable persistence, replay/idempotency, attachment storage, and multi-device conflict handling before custody history is relied on as a compliance record.
