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
type ProofAssetKind = 'photos' | 'screenshots' | 'receipts';

interface ProofAsset {
  id: string;
  name: string;
  dataUrl: string;
  addedAt: string;
  source?: 'manual' | 'procedure_requirement' | 'job_completion' | 'import';
  proofType?: ProcedureProofType;
  requirementId?: string;
  procedureId?: string;
  procedureVersion?: string;
  procedureStepId?: string;
  visitId?: string;
}

interface ProofRecord {
  jobId: string;
  storeName: string;
  address: string;
  completionTime: string;
  arrivalTime: string;
  gps?: Coordinates;
  photos: ProofAsset[];
  screenshots: ProofAsset[];
  receipts: ProofAsset[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}
```

### Storage

- **Location**: localStorage
- **Key**: `proof_vault_records` (object keyed by jobId)
- **Format**: Map<jobId, ProofRecord>
- **Owner**: `src/features/proofVault/useProofVault.ts`

### UI Components

- Proof folder modal for the selected job record
- File inputs with `accept="image/*,.pdf"` and `multiple`
- Images render thumbnails; PDFs/files open through the stored data URL link
- Notes field for annotations

### Procedure Requirement Evidence

Proof assets can optionally carry procedure requirement identity metadata: `requirementId`, `procedureId`, `procedureVersion`, `procedureStepId`, `proofType`, and `visitId`. This metadata is optional so legacy proof records remain readable without migration. Procedure definitions describe what evidence is required; Proof Vault owns the actual evidence. Helpers in `src/features/proofVault/procedureProof.ts` flatten proof records by job, match proof to procedure proof requirements by exact identity, respect `minimumCount`, and enforce visit scope (`any_visit`, `current_visit`, `per_visit`, `final_visit`). Legacy proof without requirement metadata is not matched by fuzzy label/name rules.

## Architecture

### Data Flow

```
Job Completion → Jobs handler → ensureProofForJob(job)
                              ↓
                    File Upload → Base64 Encode → localStorage
                              ↓
                    ProofRecord Updated → Job Card Display
```

### Key Components

- **useProofVault**: Owns proof records, record selection, localStorage persistence, completed-job backfill, folder creation, file asset insertion, notes updates, and sorted/selected derivations.
- **Procedure proof helpers**: `procedureProof.ts` owns exact procedure requirement proof matching and proof-asset stamping for future procedure-driven capture flows.
- **ProofVaultModal**: File upload interface per asset kind and notes editor for the selected record.
- **Completion Flow**: App-level Jobs completion handlers call `ensureProofForJob(job)` when a job becomes completed. The modal opens through explicit Proof Vault navigation from More or the Assistant.

## Design Rationale

- **Per-job organization**: Each job has its own proof record
- **Three asset types**: Photos, screenshots, receipts cover common proof needs
- **localStorage**: Simple, no server needed for proof storage
- **File picker upload**: Supports images and PDFs through the browser file picker
- **Explicit opening**: The Proof Vault opens from More or the Assistant and selects the newest proof record

## Dependencies

- localStorage for persistence
- File API for upload
- Job system for jobId linkage

## Business Rules

1. Completed jobs get a Proof Vault record created or refreshed automatically
2. User can attach any combination of asset types
3. Multiple files per asset kind allowed
4. Notes are optional per proof record
5. Legacy/manual Proof Vault evidence is not required for legacy completion, but procedure-derived proof requirements can block lifecycle closeout until matching proof evidence exists
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
- **Accepted formats**: `image/*` and `.pdf` are selectable; video is not supported

## Failure Modes

- localStorage full → new proof not saved
- File read fails → upload silently fails
- Base64 encoding error → file not stored
- Browser file picker unavailable → user cannot attach new proof assets in the modal

## Testing

- Manual test: Complete job → attach photo → verify stored
- Test with multiple files per kind
- Test image and PDF selection
- Test localStorage persistence across refresh

## Known Limitations

- localStorage only (no server backup)
- No image compression (storage bloat)
- PDF files can be attached, but they are only linked, not preview-rendered inline
- No video support
- No proof verification/OCR
- No bulk proof management

## Future Improvements

- Server-side proof storage
- Image compression before storage
- Inline PDF preview and broader document-management support
- Video proof support
- OCR verification of receipts
- Bulk proof management
- Proof export (zip)
- Integration with job completion verification

## Related Source Files

- `src/App.tsx` — cross-feature proof orchestration: Jobs completion triggers, Assistant/More navigation, and modal composition
- `src/features/proofVault/types.ts` — Proof Vault asset and record types
- `src/features/proofVault/procedureProof.ts` — proof requirement identity, matching, visit-scope evaluation, and procedure proof asset stamping helpers
- `src/features/proofVault/ProofVaultModal.tsx` — selected proof folder modal UI
- `src/features/proofVault/useProofVault.ts` — Proof Vault state, persistence, mutations, selection, and completed-job backfill

## Related Knowledge

- [Job System](./job-system.md) — jobs link to proof vault
- [Shower Gate](./shower-gate.md) — shower proof is separate system

## Last Updated

2026-08-15 (Procedure proof requirement identity and exact proof-backed closeout evaluation added)
