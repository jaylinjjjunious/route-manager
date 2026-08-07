# Daily Shower Gate Feature

## Description

The Daily Shower Gate is a preserved daily verification system whose access requirement is temporarily bypassed. The scanner, proof upload, cycle management, and history remain available for later reactivation.

## User Value

Ensures the user completes a required daily hygiene habit before starting work. This fulfills an operational requirement for the gig workforce.

## User Interface

- **Dashboard panel** (`ShowerGatePanel` component): Shows locked state (amber) when incomplete, green verified card after completion.
- **Protected tab overlay**: When `showerGateUnlocked` is false, Route/Jobs/Battery/Tracker tabs show a "Daily Verification Required" overlay with "Go to Mission Control" button.
- **Settings tab**: When the gate is unlocked, the panel renders in Settings for proof history access.
- **Habits tab**: Has an integrated barcode scanner and proof attachment section for the "Mandatory Shower" habit.

## User Flow

1. User opens app → sees Shower Gate panel on Dashboard (locked, amber).
2. User taps "Scan Product Barcode" → camera opens.
3. User scans the required barcode (075371003233).
4. If incorrect barcode → "Incorrect product barcode" message, can scan again.
5. If correct barcode → camera captures still image automatically.
6. Image is uploaded via POST `/api/shower-proofs` with cycleId, barcode, capturedAt.
7. On success → panel disappears from Dashboard, protected tabs unlock.
8. On failure → "Upload failed" with retry option.
9. At next 6:00 AM → cycle resets, panel reappears, tabs lock again.

## State Model

### ShowerGatePanel internal states

| Status | Meaning |
|--------|---------|
| `locked` | No proof for current cycle |
| `loading` | Checking backend for existing proof |
| `requesting` | Requesting camera permission |
| `scanning` | Camera active, scanning for barcode |
| `incorrect` | Wrong barcode scanned |
| `verified` | Correct barcode detected, capturing image |
| `capturing` | Capturing proof image |
| `uploading` | Uploading proof to backend |
| `saved` | Proof uploaded and verified |
| `upload_failed` | Upload error, retry available |
| `camera_error` | Camera access failed (permission, hardware, security) |
| `history_loading` | Loading proof history |
| `history_error` | History load failed |

### Views

| View | Render |
|------|--------|
| `current` | Main card (locked or verified) |
| `scanner` | Live camera viewfinder |
| `today` | Full-size proof image |
| `history` | List of past proofs |

### App-level state

| Variable | Type | Description |
|----------|------|-------------|
| `showerGateUnlocked` | boolean | True when current cycle has verified proof |
| `showerCycleKey` | string | Current cycle ID (date of last reset boundary) |
| `showerCycleLabel` | string | Human-readable cycle label |
| `showerProofForCycle` | ShowerProof | Current cycle proof record |
| `missionControlShowerProofRecord` | ShowerProofRecord | Normalized proof for panel |

## Frontend Implementation

**`src/features/showerGate/ShowerGateSection.tsx`**
- Integrated shower gate UI rendered inside the Habits tab.
- Props-driven: receives all shower state and action callbacks from `useShowerGate`.
- Wraps legacy `ShowerGatePanel` (still used for Dashboard Mission Control).

**`src/features/showerGate/useShowerGate.ts`**
- Custom hook that encapsulates all shower gate state, effects, derived values, scanner lifecycle, barcode detection, torch control, backend sync, and proof confirmation.
- Returns read-only state + action methods; no raw setters exposed to App.tsx.
- Key returned values:
  - `showerGateUnlocked`, `showerGateAccessReady`
  - `showerCycleKey`, `showerCycleLabel`
  - `showerProofForCycle`, `showerProofAttachmentForCycle`
  - `barcodeVerifiedForCycle`, `barcodeScanMessage`
  - `barcodeScannerActive`, `barcodePermissionStatus`, `barcodeTorchOn`, `barcodeTorchAvailable`, `barcodeVideoRef`
  - `showerProofSyncStatus`, `showerProofSyncMessage`, `showerProofBackendFolder`
  - `missionControlShowerProofRecord`
- Action methods:
  - `confirmShower()` — validates barcode + proof, uploads, returns `{ success, proof?, error? }`
  - `handleMissionControlVerified(record)` — normalizes Mission Control proof, returns `ShowerProof | null`
  - `handleShowerProofFile(files, key)` — resizes and stages a proof attachment
  - `startBarcodeScanner()`, `stopBarcodeScanner()`, `toggleBarcodeTorch()`

**`src/components/ShowerGatePanel.tsx`** (646 lines)
- Self-contained component with camera management, barcode detection, proof upload, history.
- Used on Dashboard for Mission Control verification.
- Camera: `navigator.mediaDevices.getUserMedia()` with `facingMode: "environment"`.
- Barcode: `BarcodeDetector` API with `@zxing/browser` fallback.
- Torch: `MediaTrackConstraints.advanced[{ torch: true }]` or `zxingControls.switchTorch()`.
- Upload: `uploadShowerProof()` from `showerProofApi`.
- Focus trapping and Escape key support for accessibility.

**`src/App.tsx`**
- Instantiates `useShowerGate(now)` where `now = new Date(nowTick)`.
- Retains cross-cutting wrappers:
  - `blockJobAccess(action)` — redirects to Dashboard if gate locked.
  - `handleConfirmDailyShower()` — delegates to `showerGate.confirmShower()`, then logs habit task + habit log + dispatcher message.
  - `handleMissionControlShowerVerified(record)` — delegates to `showerGate.handleMissionControlVerified()`, then logs habit task + habit log + dispatcher message.
- Renders `ShowerGatePanel` on Dashboard only when `!showerGate.showerGateUnlocked`.
- Passes `showerGate.*` props into `HabitsTab` and protected tab overlays.

## Backend Implementation

**Express (`server.ts`):**
- `POST /api/shower-proofs` — multer accepts image file, stores to `local-shower-proofs/` directory, saves metadata to local JSON file.
- `GET /api/shower-proofs/current?cycleId=` — Returns current cycle proof.
- `GET /api/shower-proofs/:id` — Returns proof by UUID.
- `GET /api/shower-proofs` — Returns last 50 proofs.

**Worker (`worker/index.ts`):**
- `POST /api/shower-proofs` — FormData with `barcode`, `image` (Blob), `cycleId`, `localDate`, `capturedAt`.
- Stores to D1 `shower_proof_records` table as base64 data URL.
- `GET /api/shower-proofs/current?cycleId=` — Queries D1 for latest verified proof.
- `GET /api/shower-proofs/:id/image` — Serves image from stored data URL.

## Database or Storage

### Express (local filesystem)
- `local-shower-proofs/` — Image files
- In-memory JSON array for proof metadata

### Worker (D1 SQLite)
- `shower_proof_records` table with columns: id, cycle_id, local_date, barcode, captured_at, storage_key, image_data_url, upload_status, verification_status, created_at, updated_at
- Indexes on (cycle_id, captured_at) and (captured_at)

### localStorage
- `daily_shower_gate_proofs` — Legacy storage key
- `showerProofs` state loaded from localStorage on app mount

## API Contract

See `api/endpoints.md` for full contract details.

Key endpoints:
- `POST /api/shower-proofs` — Upload proof (FormData: barcode, image, cycleId, localDate, capturedAt)
- `GET /api/shower-proofs/current?cycleId=X` — Get current cycle proof
- `GET /api/shower-proofs` — List proofs

## Business Rules

- `REQUIRED_SHOWER_BARCODE = '075371003233'` — Only this barcode unlocks the gate.
- `SHOWER_PROOF_MANDATORY = true` — Gate is always enforced.
- Cycle resets at 6:00 AM local time (configurable in `showerCycle.ts:SHOWER_CYCLE_RESET`).
- At exactly the reset boundary (e.g., 6:00:00), a new cycle begins.
- When SHOWER_GATE_REQUIRED is true, Dashboard route controls and the Battery/Tracker surfaces enforce current-cycle shower access. When false, they remain available.
- Proof must have `uploadStatus === 'saved'` and `verificationStatus === 'verified'` to unlock.

## Error Handling

| Issue | Behavior |
|-------|----------|
| Camera permission denied | Show specific error, link to browser settings |
| Camera in use | "Close other camera apps" message |
| No rear camera | "Front camera not supported" message |
| HTTP (not HTTPS) | Show cloudflared tunnel instructions |
| Incorrect barcode | "Incorrect product barcode", scan again button |
| Upload network error | "Upload failed" with retry button |
| Backend unavailable | "Backend check failed, gate staying locked" |

## Edge Cases

- **Midnight boundary for non-6AM reset**: `getCurrentCycleId` uses the configured hour/minute, not midnight.
- **Dumping clock adjustment**: The `nowTick` state in App.tsx refreshes periodically, causing cycle recalculation.
- **Multiple scans**: `scanHandledRef` prevents duplicate processing.
- **Tab switch during scan**: `stopCamera()` is called on unmount via cleanup effect.
- **History while completing**: History can be viewed without interrupting the gate flow.

## Mobile Behavior

- Camera requires HTTPS on mobile (cloudflared tunnel for dev testing).
- `playsInline` attribute on video element for iOS Safari compatibility.
- Touch targets minimum 48px for scanner controls.
- Bottom navigation is hidden during ride mode.

## Accessibility

- Focus trapping within scanner and history views.
- Escape key returns to previous view.
- ARIA labels on close and action buttons.
- Color-coded borders (amber=locked, green=verified, red=error) with text labels.

## Testing

No automated tests exist for the Shower Gate feature. Manual testing covers:
- Barcode scan on iOS Safari
- Barcode scan on Android Chrome
- Camera permission flow
- Upload success/failure
- Cycle reset at 6:00 AM

## Deployment Considerations

- Shower proof images stored as base64 in D1 on Worker variant.
- On Express variant, images stored on local filesystem (ephemeral — lost on Railway restart).
- The two backend variants have different proof storage but the same API contract.

## Known Limitations

- Proof images stored as base64 data URLs in D1 (not ideal for large files).
- Express variant stores proofs on ephemeral disk.
- No image compression before upload (raw JPEG from camera).
- Backend stores all user proofs in a single namespace (no per-user isolation on Express variant — Worker variant has no auth isolation for proof listing).

## Related Source Files

- `src/features/showerGate/useShowerGate.ts` — Shower gate state/effects/scanner hook
- `src/features/showerGate/ShowerGateSection.tsx` — Shower gate UI rendered in Habits tab
- `src/features/showerGate/types.ts` — Shared shower gate types (`ShowerProof`, `BarcodePermissionStatus`, `ShowerProofSyncStatus`)
- `src/components/ShowerGatePanel.tsx` — Panel component (646 lines)
- `src/App.tsx` — Orchestrates `useShowerGate`, cross-cutting habit/dispatcher wiring, protected tab overlays
- `src/utils/showerCycle.ts` — Cycle calculation (56 lines)
- `src/services/showerProofApi.ts` — API client (117 lines)
- `server.ts` — Express proof endpoints
- `worker/index.ts` — Worker proof endpoints
- `drizzle/0003_shower_proofs.sql` — Legacy schema

## Related Knowledge

- `architecture/backend.md` — Backend architecture
- `api/endpoints.md` — API contracts
- `database/schema.md` — Database schema
- `business/business-rules.md` — Business rules

## Last Updated

2026-08-06 (refactor/shower-gate-extraction — Step 3: `useShowerGate` hook extraction)
