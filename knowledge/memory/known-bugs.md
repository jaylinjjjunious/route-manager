# Known Bugs

## Active Issues

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| P001 | Medium | Proof images stored as base64 in D1 — not ideal for large files | Open |
| P002 | Medium | Express proof storage on ephemeral filesystem — lost on Railway restart | Open |
| P003 | High | No per-user data isolation — all proofs in single namespace | Open |
| P004 | Medium | No multi-user support — single-user localStorage bound | Open |
| P005 | Low | No automated tests for camera/barcode/upload flows | Open |
| P006 | Low | No error monitoring or alerting | Open |

## No Active Bugs

No currently reported bugs are blocking development or production use.

## Resolved Bugs

| ID | Description | Resolution |
|----|-------------|------------|
| R001 | Stale Supabase token handling for proof uploads | Fixed in c00bef0 |
| R002 | iPhone Safari camera lifecycle issues | Fixed in fed2945 |
| R003 | Shower Gate proof upload authorization failure | Fixed in b56c690 |

---

**Last Updated:** 2026-07-20 (c12bd44)
