# Screenshot Import

## Purpose

Import job data from screenshots using OCR via Gemini 2 vision capabilities.

## Current Implementation

### OCR Pipeline

| Step | Description |
|------|-------------|
| 1 | User uploads screenshot image |
| 2 | Image sent to POST /api/import/ocr |
| 3 | Backend sends to Gemini 2 with structured prompt |
| 4 | Gemini extracts job details from image |
| 5 | Returns parsed JSON with job fields |

**Endpoint**: POST /api/import/ocr

### Parsed Fields

- Store name
- Address
- Pay amount
- Estimated minutes
- Job type
- Any other visible job metadata

### Component

**JobImportSystem** (src/components/JobImportSystem.tsx):
- File upload interface (image input)
- Image preview
- Parsed data review
- Import confirmation

## Architecture

### Data Flow

```
Screenshot Upload → POST /api/import/ocr → Gemini 2 Vision
                                              ↓
                                    Structured Prompt → JSON Response
                                              ↓
                                    JobImportSystem Review → Import to Jobs
```

### Key Components

- **JobImportSystem**: Upload, preview, review, import
- **Backend OCR endpoint**: Image processing and Gemini integration
- **Structured prompt**: Ensures consistent JSON output format

## Design Rationale

- **Gemini 2 vision**: Best available free OCR with structured output
- **Structured prompt**: Ensures consistent field extraction
- **Review step**: User verifies parsed data before import
- **No auto-import**: Prevents incorrect data entry

## Dependencies

- Gemini 2 API with vision capabilities
- Backend API endpoint
- File upload API
- Job system for import target

## Business Rules

1. Only image files accepted (image/*)
2. User must review parsed data before importing
3. Import creates new job with `ready` status
4. No duplicate detection (user responsible for dedup)
5. OCR accuracy depends on image quality/clarity
6. No batch import (one screenshot at a time)

## Security

- Images processed server-side, not stored
- No image data persisted after OCR
- API key stored server-side
- User upload limited to image types

## Edge Cases

- **Poor image quality**: OCR may fail or return partial data
- **Non-job screenshot**: Returns error or empty fields
- **Ambiguous text**: User must correct during review
- **Multiple jobs in one image**: Only first job extracted
- **Handwriting**: Not supported, OCR expects typed text

## Failure Modes

- Gemini API error → user notified, can retry
- Image too large → server rejects upload
- OCR returns invalid JSON → fallback error message
- Network timeout → user prompted to retry

## Testing

- Manual test: Take screenshot of job listing → import → verify fields
- Test with poor quality image → verify error handling
- Test review step → verify user can correct fields
- Test import → verify job created in job list

## Known Limitations

- OCR accuracy varies with image quality
- No batch import support
- No image storage after processing
- Limited to English text
- No handwritten text support

## Future Improvements

- Batch screenshot import
- Image enhancement preprocessing
- Multi-language OCR support
- Confidence score display
- Automatic job type detection
- History of imports

## Related Source Files

- `src/components/JobImportSystem.tsx` — import UI
- `server.ts` — OCR endpoint

## Related Knowledge

- [Job System](./job-system.md) — imported jobs added here
- [AI Dispatcher](./ai-dispatcher.md) — uses same Gemini model

## Last Updated

2026-07-20 (commit c12bd44)
