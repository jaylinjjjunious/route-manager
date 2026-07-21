# Proof Vault

## Purpose

Per-job proof attachment system for completion verification and documentation.

## Current Implementation

### Asset Kinds

| Kind | Description |
|------|-------------|
| `photos` | Job location/evidence photos |
| `screenshots` | App screenshots for verification |
| `receipts` | Purchase/expense receipts |

### Data Model

```typescript
interface ProofRecord {
  jobId: string;
  photos: string[]; // base64 or file references
  screenshots: string[];
  receipts: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}
```

### Storage

- **Location**: localStorage
- **Key**: `proofVault` (object keyed by jobId)
- **Format**: Map<jobId, ProofRecord>

### UI Components

- Proof attachment UI in job cards
- File inputs with `accept="image/*"` and `capture` attributes
- Camera capture for mobile devices
- Notes field for annotations

## Architecture

### Data Flow

```
Job Completion → markComplete → ProofVault UI Opens
                              ↓
                    File Upload → Base64 Encode → localStorage
                              ↓
                    ProofRecord Updated → Job Card Display
```

### Key Components

- **ProofAttachment UI**: File upload interface per asset kind
- **Job Card Integration**: Shows proof count/icons
- **Completion Flow**: markComplete opens proof vault automatically

## Design Rationale

- **Per-job organization**: Each job has its own proof record
- **Three asset types**: Photos, screenshots, receipts cover common proof needs
- **localStorage**: Simple, no server needed for proof storage
- **Camera capture**: Mobile-first design for field workers
- **Automatic opening**: Encourages proof attachment at completion time

## Dependencies

- localStorage for persistence
- File API for upload
- Camera API (via capture attribute)
- Job system for jobId linkage

## Business Rules

1. Proof vault opens automatically after marking job complete
2. User can attach any combination of asset types
3. Multiple files per asset kind allowed
4. Notes are optional per proof record
5. Proof is not required for completion (but encouraged)
6. Existing proof can be edited after completion

## Security

- Files stored locally (no server upload)
- Base64 encoding may expose image data in localStorage
- No encryption of proof data
- User responsible for sensitive content

## Edge Cases

- **No proof attached**: Job still completes, proof is optional
- **Large images**: Base64 encoding increases storage usage
- **localStorage quota**: Proof data may exceed limits
- **Image format**: Only image/* accepted (no PDF, no video)
- **Camera unavailable**: Manual file selection fallback

## Failure Modes

- localStorage full → new proof not saved
- File read fails → upload silently fails
- Base64 encoding error → file not stored
- Camera permission denied → falls back to file picker

## Testing

- Manual test: Complete job → attach photo → verify stored
- Test with multiple files per kind
- Test camera capture on mobile
- Test localStorage persistence across refresh

## Known Limitations

- localStorage only (no server backup)
- No image compression (storage bloat)
- No PDF/document support
- No video support
- No proof verification/OCR
- No bulk proof management

## Future Improvements

- Server-side proof storage
- Image compression before storage
- PDF/document support
- Video proof support
- OCR verification of receipts
- Bulk proof management
- Proof export (zip)
- Integration with job completion verification

## Related Source Files

- `src/App.tsx` — proof state and handlers

## Related Knowledge

- [Job System](./job-system.md) — jobs link to proof vault
- [Shower Gate](./shower-gate.md) — shower proof is separate system

## Last Updated

2026-07-20 (commit c12bd44)
