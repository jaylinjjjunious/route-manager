# Per-job Preview Guide

## Purpose

Preview Guide turns one slow iPhone screen recording of an external job preview into an offline, job-scoped visual reference and a reviewed action guide. It assists preparation and travel; the external job app remains the source of truth for instructions, answers, submission, and acceptance.

## User flow

1. Open a job detail and choose **Preview Guide**.
2. Import one screen recording (`video/*`, including browser-decodable MP4/QuickTime).
3. Review locally extracted pages; add, remove, restore, reorder, tag reference pages, or choose a cover.
4. Select important pages and create a proposed quick summary.
5. Review/edit/remove requirements and their confirmation mode, then save.
6. Complete the generated Get Ready requirements.
7. Choose **Complete Preparation**, then explicitly choose **I'm Ready — Plan My Trip**.
8. Start the existing job navigation/Transit flow and manually choose **I'm at the Store**.

## Capture and local extraction

- The full recording stays in IndexedDB and is not uploaded by default.
- `HTMLVideoElement` seeks at about one-second intervals; canvas creates reduced grayscale signatures.
- A conservative difference threshold removes near-duplicates. Local edge detail prefers a clearer nearby page when two candidates are similar.
- Extraction preserves time order, reports progress, supports cancellation, and uses plain-language decode/size/duration/storage errors.
- Current limits are 250 MB and 12 minutes. Browser decode support is authoritative; no format is promised until tested on the target device.
- Page full images and thumbnails are separate IndexedDB blobs. Metadata/state is versioned in localStorage and contains references only.

## Targeted OCR and review

Only pages explicitly selected by the user are sent to authenticated `POST /api/import/preview-summary` (maximum 12 pages and request-size guarded). The endpoint uses the existing Gemini client and `requireAuth`, accepts images—not video—and requests structured requirements, tasks, proof, warnings, uncertainty, and source page IDs. Server output drops items with invalid/missing source references.

The proposal cannot activate preparation until the user reviews all five required sections and saves it. Requirements can be edited, removed, marked required/optional, and assigned photo, one-tap, review, or no confirmation.

## Get Ready

Get Ready is generated only from the reviewed `beforeYouGo` requirements. Photo-mode requirements use a job/requirement-scoped IndexedDB image. The UI says the photo was saved and makes no claim that the correct object/document was verified. Dress-code requirements use one tap and never open the camera. Required incomplete items block completion with an explanation; optional items do not.

## Navigation and arrival

After preparation is committed, the user must explicitly choose **I'm Ready — Plan My Trip**. The destination, nav link, origin, and Transit planner come from the existing selected job and `JobTransitSection`; there is no second route engine. Navigation failure does not clear preparation. Arrival is a manual **I'm at the Store** action that persists time and exposes the first reviewed on-site task, Original Preview, and Job Details.

## Road Readiness integration

Every actionable job requires a user-reviewed Preview Guide before Ride Mode can start. The Today screen opens the actionable job's Preview Guide directly when review is incomplete. Opening the guide alone does not mark it reviewed. Review completes only after the job's `what-youre-doing`, `questions-youll-answer`, `photos-and-proof`, `warnings`, and `how-to-complete` sections have all been viewed. An unreviewed guide produces `NEEDS ATTENTION`; a failed/unavailable guide produces `BLOCKED`. Extracted pages alone are not sufficient—the summary must have `reviewedByUser: true`.

When an actionable job's review changes from incomplete to complete during the current UI session, the Road Readiness checklist row briefly changes to an explicit green-circle/white-check `Preview Guide reviewed` confirmation, announces completion through an `aria-live` region, then fades, collapses, and is removed. Loading an already-reviewed guide does not replay the feedback. With reduced motion enabled, the accessible completion announcement remains but the row is removed immediately without decorative timing. This feedback state is UI-only; persisted review completion remains owned by the Preview Guide record.

## State and storage

`JobPreviewGuide` is stored separately from `Job`. Its metadata includes the viewed review-section IDs, persisted per job in the existing Preview Guide localStorage record. Completing all five required section IDs sets `reviewedByUser`; partial progress remains unreviewed and isolated from other jobs. Stages cover no preview, processing, summary selection/review, preparation, travel planning/travel, arrival, and job guide. Load-time guards repair ready-without-pages and block preparation from an unreviewed summary. Each guide and media record carries `jobId`; deletion enumerates only that guide's media.

Manage Preview Storage supports removing only the original recording while preserving pages, or removing the full guide after confirmation. Saved pages and preparation state work offline; live route/AI operations still require connectivity.

## Privacy and security

- Recording and extracted pages remain local except selected summary pages.
- The full recording is never accepted by the summary endpoint.
- Summary requests use the existing authenticated API client.
- Server logs record only failure class, never page data or extracted text.
- Reference pages and preparation photos are separate from Proof Vault/on-site proof.

## Failure states

Missing/unsupported/oversized/unreadable video, excessive duration, storage pressure, cancellation, missing media, oversized summary selection, AI failure, missing job address, and unavailable Transit are surfaced without clearing saved work.

## Testing

`tests/previewGuide.test.ts` covers video validation, local signatures/detail scoring, review partial/full completion, review-progress persistence and job isolation, and impossible-state migration guards. `tests/previewSummary.test.ts` proves only selected image pages are uploaded, the body contains no video, source IDs are retained, an explicit selection is required, and large selections are blocked locally. Browser/device validation remains required for real codec seeking, camera capture, pinch zoom, memory pressure, and PWA suspension.

## Known limitations

- Local sampling cannot perfectly reconstruct hidden conditional branches, interactive controls, embedded video, obscured text, or the original form behavior.
- Blur detection is intentionally conservative and may retain extra frames.
- Manually adding a missing frame uses an image selected by the user; frame-accurate video scrubbing is not implemented.
- Preparation photo checks currently validate file presence/type and successful durable save; document correctness is not claimed.
- Driving/walking/biking comparison remains the existing external Maps flow; Transit uses the existing native planner.
- Real iPhone Safari/Home Screen PWA verification requires a real recording and device.

## Related source

- `src/features/previewGuide/` — types, state/media storage, local extraction, summary client, UI
- `src/features/jobs/JobDetailModal.tsx` — job-scoped entry point
- `server.ts` — authenticated selected-page summary endpoint
- `tests/previewGuide.test.ts`, `tests/previewSummary.test.ts`

## Last updated

2026-08-03 (Road Readiness completion feedback and reduced-motion behavior; real-device iPhone verification remains required)
