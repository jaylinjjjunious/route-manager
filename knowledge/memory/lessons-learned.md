# Lessons Learned

## Authentication

- Supabase token refresh must be handled explicitly — implement a 401 retry pattern to catch stale tokens before upload requests fail.

## Camera and Media

- iPhone Safari camera requires the `playsInline` attribute on video elements.
- Camera lifecycle management must account for Safari's aggressive tab recycling.

## Build and Deployment

- Vite 8 requires Node.js >= 20.19. The project pins to Node 22.16 for Railway compatibility.
- nixpacks Node version must match build requirements — mismatches cause silent failures.
- Multipart form parsing needs careful handling. A hand-rolled parser caused issues and was replaced with multer.

## Application Logic

- Shower gate cycle boundary at exactly 6:00:00 requires careful comparison — use `< boundary`, not `<=`.
- Bottom navigation on mobile needs `overflow-x-auto` for small screens to prevent tab overflow.
- Focus trapping improves accessibility for modal-like components.

## Process

- Checkpoint tags enable safe rollback without losing work.
- Always verify deployment after push — never assume it succeeded.
- Documentation must be updated in the same session as code changes, or it will drift.

---

**Last Updated:** 2026-07-20 (c12bd44)
