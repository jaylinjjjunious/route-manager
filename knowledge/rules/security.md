# Security Rules

## Secrets and Environment Variables

- **Never commit `.env` files** — they are in `.gitignore`.
- **Never log or expose secrets** in source code or console output.
- The Supabase anon key is safe for client-side use (it is public by design).
- The `JWT_SECRET` is server-only and must never appear in client code.

## Authentication

- All API endpoints except `GET /api/health` and `GET /api/auth-check` require authentication.
- Authentication uses Supabase JWT tokens passed in the `Authorization` header.
- Tokens are refreshed by the Supabase client SDK — the app handles 401 retries.

## Data Isolation

- There is **no per-user data isolation** — all users share the same storage namespace.
- This is a known limitation (see `knowledge/memory/known-bugs.md`).
- Proof images and job data are not partitioned by user.

## Input Validation

- No input sanitization for job data — the app assumes trusted users.
- File uploads are limited to images only.
- multer handles multipart uploads on the Express backend.
- FormData handles uploads on the Cloudflare Worker backend.

## Camera and Media

- Camera access requires HTTPS on mobile browsers (iOS Safari enforced).
- Browser permission prompts are handled by the device OS.

## Password Reset

- Uses the Supabase built-in password reset flow.
- No custom reset logic is implemented.

## Deployment Security

- Railway environment variables hold all secrets.
- No secrets are baked into the Docker image or nixpacks build.
- The `railway up` fallback uploads code only, not secrets.

---

**Last Updated:** 2026-07-20 (c12bd44)
