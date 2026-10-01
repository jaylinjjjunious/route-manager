# BlueAI job ingestion (v1)

## Current Barrister export integration (2026-10-01)

The sections below describe the legacy single-job/file-store bridge. The current Express wiring uses SUPABASE_SERVICE_ROLE_KEY with the configured Supabase URL for durable Barrister exports in blueai_records (migration drizzle/0004_blueai_records.sql). BLUEAI_DATA_DIR is not required for this Supabase path. Never expose the service-role key to the browser.

POST /api/integrations/blueai/export authenticates the machine token and maps all records to BLUEAI_OWNER_ID. GET /api/integrations/blueai/records authenticates the browser session and returns { enabled, assigned, available }. Disabled authenticated responses include reason: not_configured or account_mismatch, without exposing the configured owner's identity. Ownership checks are unchanged.

Jobs displays a persistent BlueAI sync status plus separate assigned/available record sections. useBlueAiRecords retries every 15 seconds while visible and on focus/visibility, including after disabled responses. Errors explicitly mark any retained same-account records as potentially stale. Account changes/sign-out hide prior records immediately and aborted responses cannot repopulate them. Source schedules remain raw; neither category is promoted to the calendar and no accept/bid/write action is sent to Barrister.

The public temporary diagnostic endpoint and build key fingerprint have been removed. Production frontend verification must inspect the lazy App chunk, not just index*.js: BlueAI already existed in the deployed App chunk during the September investigation. A 200 response alone does not prove an enabled feed or nonempty data. Relevant regression tests: blueAiRecordsSync, blueAiBridge, blueAiExport, blueAiSync.

The remaining production owner/configuration cause and synthetic-record visibility must be verified against the deployed status before claiming completion.


Implemented 2026-09-27. This is an Express receiver and browser sync adapter, not an embedded BlueAI SDK. Actual extraction/HTTP delivery from the installed BlueAI environment remains to be configured and verified.

## Configure the receiver

Set server-only environment variables and restart the Express server:

- `BLUEAI_INGEST_TOKEN`: a random secret of at least 32 characters. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Store it only in server configuration and the sender's secret store, never frontend variables or source control.
- `BLUEAI_OWNER_ID`: the target user's UUID from Supabase Authentication > Users. The sender cannot select or override ownership.
- `BLUEAI_DATA_DIR`: an absolute private directory, outside publicly served folders. For a Windows local server, use a persistent local folder. For Render/Railway, mount a persistent disk/volume and point this variable inside that mount (for example `/var/data/blueai`). **The checked-in Render free service has no persistent disk. Do not enable this bridge on its ephemeral filesystem.** Provision persistent storage first or run the receiver on a persistent local Express installation.

Use one Express process/replica per data directory. The JSON store serializes writes inside that process and uses atomic file replacement. It does not implement distributed locking. Back up `jobs.json` as private job data. No schema migration or new dependency is required. All three settings are required; absent/invalid configuration makes POST return 503 and authenticated GET return an empty disabled feed. Cloudflare Worker deployments do not implement this receiver. Reload the browser after enabling a previously disabled bridge.

## Send a job

`POST https://<app-host>/api/integrations/blueai/jobs`

Headers:

```text
Authorization: Bearer <BLUEAI_INGEST_TOKEN>
Content-Type: application/json
```

Example body: `tests/fixtures/blueai-job.json`:

```json
{
  "title": "Store display audit",
  "date": "2026-09-28",
  "startTime": "09:00",
  "endTime": "10:30",
  "location": "2151 S Chester Ave, Bakersfield, CA",
  "pay": 35.5,
  "sourceApp": "Example Jobs",
  "externalId": "audit-1042",
  "timezone": "America/Los_Angeles"
}
```

Required: title, date, startTime, endTime, location, sourceApp, externalId. Dates must exist; times use 24-hour HH:mm in America/Los_Angeles, the existing app planning timezone. The receiver does not infer other timezones or UTC offsets. Optional `endDate` handles overnight jobs and must be the same or next date; duration must be positive and at most 24 wall-clock hours. DST transitions do not change this wall-clock duration calculation. Optional `pay` is a nonnegative numeric USD amount, rounded to cents; absent/null means unknown and does not erase known pay. Optional `coordinates: { "lat": 35.3475, "lng": -119.0142 }` must be finite and in range. Unknown fields are rejected, including ownership and lifecycle fields.

The source app is trimmed/lowercased; external ID is trimmed and case-sensitive. Keep both identifiers stable when changing a job. A hash of owner + source app + external ID becomes the existing `Job.id`. Title maps to `storeName`, location to `address`, date to `scheduledDate`, end time to `dueTime`, and the time window to `estimatedMinutes`. Exact time fields, source identity, ownership and revision are in `Job.blueAi`. Jobs without coordinates use the existing unresolved `(0,0)` marker and appear in planning review; v1 does not geocode addresses or invent coordinates.

Response: `{ "action": "created" | "updated" | "unchanged", "job": <Job> }`; creation returns 201, updates/retries 200. Exact retries do not advance the revision. A changed snapshot advances it once. Unknown pay cannot erase captured pay. Jobs are stored before success is returned, even while the browser is closed. The last successfully received snapshot wins; send each job's snapshots sequentially and do not replay an older snapshot after a newer one. No automatic deletion or source timestamp conflict resolution is implemented in v1.

Errors: 400 validation/malformed JSON; 401 wrong machine token; 413 body over 16 KiB; 415 non-JSON; 429 more than 60 authenticated writes/minute (Retry-After: 60); 503 disabled, capacity (10,000 jobs), or storage unavailable. On 429/503, retry the same source ID and body with backoff. Fix 400/401/413/415 rather than looping. Use HTTPS outside localhost; the bridge token grants write access and must not be sent to another host.

## Automatic calendar updates

`GET /api/integrations/blueai/jobs` uses the existing Supabase bearer session, not the machine token. Only the configured account receives its feed. `useJobs` fetches it on mount, focus/visibility and every 15 seconds while visible. Closed/offline browsers catch up when reopened. The workspace sign-in bypass has no real session and cannot read the feed.

Snapshots merge into the existing `route_optimizer_jobs` storage and React state, so the weekly strip and day panels recompute automatically. Unchanged revisions leave state alone. Source-owned title, address, pay, date and time fields update; local notes, completion/lifecycle, proofs, procedure assignments and routing remain intact. A locally resolved coordinate survives a same-address update without source coordinates. A new address clears obsolete coordinates. New jobs use the existing field-task/ready model. Existing calendar/route filters and access locks remain in force. This does not write to external Google Calendar.

Deleting an imported job records a device-local tombstone in `blueai_deleted:<ownerId>`, preventing polling from recreating it on that browser. A copied job loses source metadata so it becomes independently editable. Other owners' imported jobs are filtered from active state; this does not migrate the app's broader legacy single-user localStorage design. Local lifecycle edits/deletions are not sent back to the job app or shared across devices.

New jobs without resolved coordinates start on Route B standby while retaining
their scheduled calendar date; they require location review before route use.
Jobs with supplied coordinates start on Route A. Subsequent source updates
preserve the user's chosen route rather than silently moving work into a ride.

## Next BlueAI step

After the receiver is configured, create a sender workflow in the installed BlueAI environment that reads the specific job app, extracts only the fields above, and sends one HTTPS POST per job using its supported HTTP/script capability. First prove one fixture POST, then change its date/pay with the same external ID and confirm an `updated` response and a moved calendar entry. Use an actual stable job identifier, never title/date as the key. Do not invent missing times or pay. Keep API credentials outside prompts and logs where supported. If that BlueAI installation cannot make HTTP/script calls, a supported local adapter is still needed; no unverified BlueAI SDK or UI configuration is assumed here.

## Verification

- `tests/blueAiBridge.test.ts`: real HTTP create/retry/update, durable reload, calendar day change, local-state preservation, machine authentication, owner isolation, malformed/oversized payloads, concurrent creates, corrupt-store handling.
- `tests/blueAiSync.test.ts`: mounted React hook polls into existing calendar groups/localStorage and respects deletion.
- Existing job scheduling/state tests remain applicable.
- Signed-in production calendar and real BlueAI delivery remain unverified until receiver settings, persistent storage and authenticated access are available.
