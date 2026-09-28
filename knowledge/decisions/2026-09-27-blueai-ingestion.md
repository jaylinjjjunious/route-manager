# BlueAI v1 receiver and browser merge

Accepted 2026-09-27 for the requested ingestion bridge.

Jobs are currently browser-local, while Express already uses private JSON
storage for server features. Add a bounded, atomically replaced inbox of
existing Job snapshots on explicitly configured persistent storage, and a
Supabase-authenticated polling feed into `useJobs`. Keep source revisions
separate from local lifecycle/proof/notes state. Dedicated machine credentials
map to one configured account; never accept owner IDs from incoming payloads.

This avoids replacing existing job CRUD or introducing a database migration
for v1. It requires one Express process per data directory, persistent disk
in production, sequential source updates, and a real signed-in session.
Cloudflare, bidirectional sync, external Google Calendar writes, geocoding,
multi-replica locking and source timestamp conflict resolution are out of scope.
Move to transactional shared storage before scaling beyond one writer process.

See [contract and configuration](../features/blueai-ingestion.md).
