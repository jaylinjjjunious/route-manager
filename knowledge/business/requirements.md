# Product Requirements

## Vision

A field-work mission control app for e-bike gig workers, optimized for the Bakersfield, CA area.

## Core Requirements

### Route Optimization
- Nearest-neighbor greedy algorithm for job sequencing.
- Battery-aware routing based on e-bike range estimates.
- Outlier detection for jobs that are inefficient additions.
- Revision jobs and process serve jobs handled as first-class types.

### Daily Hygiene Verification (Shower Gate)
- Barcode scan required before work begins each day.
- Cycle resets at 6:00 AM local time.
- Protected tabs are locked until verification passes.

### Job Management
- 5 job types: default, revision, process_serve, delivery, pickup.
- 7 job statuses for lifecycle tracking.
- Proof of completion required for each job.
- Proof vault supports photos, screenshots, and receipts.

### E-Bike Battery Tracking
- Configurable battery specs (default: Jasion EB5).
- Range estimation based on consumption rate.
- Battery level affects route optimization decisions.

### AI-Powered Dispatch
- Gemini-powered chat assistant for route and job advice.
- Accessible from any tab in the app.
- Supports adding and removing jobs via suggestions.

### Safety Information
- Area-specific crime and safety news.
- Google News RSS feed filtered for Bakersfield.

### Habit Tracking
- Mandatory shower verification as a daily habit.
- Custom daily tasks with streak tracking.

## Platform Requirements

- Mobile-first design (iOS and Android).
- Offline-capable using localStorage persistence.
- Single-user application (no multi-tenant).

---

**Last Updated:** 2026-07-20 (c12bd44)
