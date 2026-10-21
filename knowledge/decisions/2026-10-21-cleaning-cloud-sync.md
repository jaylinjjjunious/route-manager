# Cleaning account cloud synchronization

Accepted by user request, 2026-10-21. Supersedes the earlier deferral of cloud sync.

Use the existing Supabase account/project through an independent Cleaning client, retaining app boundaries and same-origin session reuse. Store one complete versioned plan per auth.uid with RLS and an atomic expected-revision save function. Keep account-scoped offline caches, preserve unowned legacy data until explicitly imported, and preserve both snapshots before user-selected conflict resolution. Do not infer ownership, merge conflicting active sessions automatically, or use ephemeral host disk for durable plans.

Whole-plan CAS is the smallest correct first step for this personal app; automatic field-level collaboration and realtime subscriptions are deferred. Poll on focus/reconnect and every 30 seconds. Schema/check scripts are owned by Cleaning. Forty-seven tests and database rollback-only isolation/revision checks pass; public release verification pending.
