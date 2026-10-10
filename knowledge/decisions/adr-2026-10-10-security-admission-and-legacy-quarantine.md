# Durable security admission and legacy quarantine

Status: implemented and deployed to main/Render at d223cbe. Public release, authenticated sync and durable accounting verified; see the guide for remaining device/legacy-hosting checks.

Render's free filesystem is ephemeral. Production request admission therefore records minimal service-role-only quota events in the existing Supabase activity table. This avoids a permissive fallback during storage outages and survives container replacement without adding a database permission or assigning old data to a new owner. Admission is serialized in the current single Express process; an atomic database counter RPC is required before horizontal scaling.

Proof images require owner-authenticated retrieval and server verification of decoded bytes and barcode. Storage limits reject new writes instead of evicting another owner or deleting old evidence. Ownerless historical Worker and browser records are preserved but excluded from normal access until ownership can be confirmed. The unowned Worker endpoints are retired with HTTP 410.

See [remediation contracts and release evidence](../../docs/SECURITY_SCAN_2026_10_10.md). This does not make Render proof files durable; moving proof files to owner-scoped persistent storage remains necessary.
