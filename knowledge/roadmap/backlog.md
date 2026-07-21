# Backlog

Items inferred from codebase gaps and known limitations.

## Multi-User Support
- Partition data by Supabase `user_id`.
- Requires database schema changes and auth token propagation to all API calls.
- Currently the highest-impact missing feature.

## Image Compression
- Compress proof images before upload to reduce base64 size in D1.
- Could use client-side compression (e.g., browser-image-compression) before sending.

## Automated Testing
- Add a unit test framework (Vitest recommended for Vite projects).
- Add Playwright end-to-end tests for critical flows (shower gate, job completion, proof upload).

## Live Routing
- Integrate a real routing provider (Google Maps, Mapbox) for turn-by-turn directions.
- Current nearest-neighbor is a rough estimate without road-network data.

## Offline Support
- Full offline capability beyond localStorage persistence.
- Service worker for caching static assets.

## Push Notifications
- Safety news alerts pushed to the device.
- Job reminders and schedule notifications.

## Job Scheduling
- Recurring job templates.
- Time-based scheduling with calendar integration.

## Proof Image Gallery
- Browse all proof images for a job in a gallery view.
- Currently proofs are listed as individual attachments.

## Ride History and Analytics
- Track ride metrics over time (distance, jobs completed, efficiency).
- Historical route visualization.

## User Preferences Sync
- Sync settings and preferences across devices via Supabase.

---

**Last Updated:** 2026-07-20 (c12bd44)
