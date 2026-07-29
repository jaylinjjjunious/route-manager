# ADR: Temporarily Bypass the Shower Gate

**Status:** Accepted
**Date:** 2026-07-29

## Context

The Shower Gate scan and proof workflow remains implemented, but the current operational requirement is to keep the app fully usable without requiring that scan. Job workflows, including Inventory Custody, must not be blocked by a temporary access policy.

## Decision

Keep the scanner, proof state, API integration, cycle reset, and history intact. Add an explicit `SHOWER_GATE_REQUIRED` policy flag in `src/App.tsx`, currently `false`, and derive all access checks from that policy. When false, Dashboard, route/job actions, ride mode, Battery, Tracker, and job detail are available without a verified proof. The mandatory Shower Gate UI is not rendered as a blocker while bypassed.

## Reactivation

Set `SHOWER_GATE_REQUIRED` to `true`, run lint and build, then deploy through the normal production workflow. The existing proof validation and 6:00 AM cycle reset will resume controlling access; no scanner rewrite or data migration is required.

## Effects and Limits

- Inventory Custody remains job-detail scoped and locally offline-capable; this change only removes the Shower Gate dependency from reaching it.
- The bypass does not change proof storage, upload behavior, or history.
- Production validation without an authenticated session can confirm only the public build and login surface, not signed-in job-detail access.
