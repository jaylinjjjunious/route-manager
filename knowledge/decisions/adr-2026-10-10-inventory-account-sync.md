# Inventory Account Sync — 2026-10-10

Status: implemented; migration applied and rollback-tested; release verification pending.

Inventory uses owner/domain/job-scoped local ledgers and queues, plus a Supabase JSONB snapshot table. The snapshot retains existing item, event and evidence formats without rewriting historical hashes. A service-role-only atomic RPC validates extensions against the stored prefix and preserves prior evidence; divergent histories are rejected rather than overwritten. Express independently verifies SHA-256 and references and derives ownership from a verified session.

Unattributed local records require explicit ownership-confirmed import, preserving originals. Account lifetime generations reject delayed work, including A→B→A. Client sync is serialized and acknowledges only the sent event IDs/hashes. Account-saved inventory job metadata is discoverable without adding main-schedule jobs.

Tradeoffs: snapshots are bounded at 3 MB/job, 20 ledgers/10 MB/account, 100 MB globally. This is a small inventory slice, not bulk media storage. New photos are prepared as bounded JPEGs; existing oversized records stay local. Conflicts require separate review; no destructive reconciliation or archival is implemented. Jobs and standalone Proof Vault remain separate. Camera/photo legibility on physical devices remains unverified.

Validation: 51 focused inventory/security tests; production-bundle disposable API fixtures; applied migration and rollback SQL covering replay, isolation, extension, conflict, proof preservation, access and quota. Public release verification must be recorded before calling it live.
