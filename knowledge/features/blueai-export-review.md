# BlueAI export review prototype

Added 2026-09-27. Jobs → BlueAI results accepts a local JSON export with assigned_work_orders and available_jobs arrays. This separate client-only preview does not use or enable the pending machine-authenticated ingestion receiver.

The view preserves the source schedule verbatim, including missing years/end times. Missing fields show Not provided. Available listings never become scheduled/accepted jobs. No calendar, route, lifecycle, or original app record is changed. Results exist only while Jobs is mounted; leaving Jobs or refreshing clears the preview. Files are not uploaded or persisted in browser storage.

Validation limits the file to 256 KiB and each category to 100 records, requires stable order numbers, rejects duplicates across groups and contradictory categories, and retains only displayed fields. Source text renders through React escaping. Validation failure clears the previous preview so stale results cannot appear to represent the failed file.

Sources: src/features/jobs/BlueAiResultsPanel.tsx, src/features/jobs/blueAiExport.ts, src/features/jobs/JobsScreen.tsx. Tests: tests/blueAiExport.test.ts.

The real BlueAI export test created valid JSON on the Windows host with one available record and no assigned records. Job details remain outside Git. File creation was independently verified; extracted job accuracy has not been independently checked against Barrister. Desktop-to-phone transfer, remote triggering, durable synchronization, and cloud deployment of the receiver remain unimplemented/unverified. This UI is a review prototype, not automatic integration.
