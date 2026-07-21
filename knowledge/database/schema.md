# Database Schema

**Last Updated:** 2026-07-20 (c12bd44)
**Related Source Files:** `worker/index.ts`, `db/schema.ts`, `drizzle/0001*.sql`, `drizzle/0002*.sql`, `drizzle/0003*.sql`

---

## Overview

The Route Manager uses two storage backends:

1. **Cloudflare D1** (SQLite-compatible) — primary database for the Worker
2. **Express local storage** — JSON file + filesystem for the Express server

---

## D1 Tables (Cloudflare Worker)

### `habit_state`

Stores user habit tracking state.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `key` | TEXT | PRIMARY KEY | Habit identifier |
| `value` | TEXT | — | Serialized habit state value |
| `updated_at` | TEXT | — | ISO timestamp of last update |

---

### `shower_proofs` (Legacy)

Legacy proof storage table. Used by the `/api/shower-proof` endpoints.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID |
| `barcode` | TEXT | — | Full barcode string |
| `cycle_key` | TEXT | — | Shower cycle key |
| `captured_at` | TEXT | — | ISO timestamp of capture |
| `image_data_url` | TEXT | — | Base64 data URL of image |
| `verified` | NUMERIC | — | Boolean (0/1) verification flag |

---

### `shower_proof_records` (Current)

Current proof storage table. Used by the `/api/shower-proofs/*` endpoints.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID |
| `cycle_id` | TEXT | — | Shower cycle identifier |
| `local_date` | TEXT | — | Local date string (YYYY-MM-DD) |
| `barcode` | TEXT | — | Full barcode string |
| `captured_at` | TEXT | — | ISO timestamp of capture |
| `storage_key` | TEXT | — | Storage location key |
| `image_data_url` | TEXT | — | Base64 data URL of image |
| `upload_status` | TEXT | — | Upload status (e.g., "uploaded", "pending") |
| `verification_status` | TEXT | — | Verification status |
| `created_at` | TEXT | — | Record creation timestamp |
| `updated_at` | TEXT | — | Record last update timestamp |

#### Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_shower_proof_records_cycle_captured` | `(cycle_id, captured_at DESC)` | Fast lookup of proofs by cycle, most recent first |
| `idx_shower_proof_records_captured` | `(captured_at DESC)` | Chronological ordering across all proofs |

---

### Data Types

D1 uses SQLite, so all types map to SQLite's type affinity:

| Drizzle Type | SQLite Type | Notes |
|--------------|-------------|-------|
| `TEXT` | TEXT | Used for strings, timestamps, UUIDs |
| `NUMERIC` | NUMERIC | Used for booleans (0/1) and numeric values |

There are no `INTEGER`, `BOOLEAN`, or `TIMESTAMP` columns — everything is stored as TEXT or NUMERIC, which is standard SQLite practice.

---

## Express Local Storage

The Express server does not use a database. Instead it uses:

1. **Local JSON file** — contains serialized proof records and app state
2. **`local-shower-proofs/` directory** — stores uploaded proof images as files on disk

This means the Express server is single-device only and data does not persist across deployments or device changes.

---

## Drizzle Migrations

Schema migrations are managed via Drizzle ORM and stored in the `drizzle/` directory:

| Migration | Purpose |
|-----------|---------|
| `0001*.sql` | Initial schema: creates `habit_state` and `shower_proofs` tables |
| `0002*.sql` | Creates `shower_proof_records` table with updated schema |
| `0003*.sql` | Adds indexes on `shower_proof_records` for query performance |

The `db/schema.ts` file defines the Drizzle ORM schema objects that mirror these SQL migrations.
