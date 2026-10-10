# Security Rules

## Secrets and Environment Variables

- **Never commit `.env` files** — they are in `.gitignore`.
- **Never log or expose secrets** in source code or console output.
- The Supabase anon key is safe for client-side use (it is public by design).
- The `JWT_SECRET` is server-only and must never appear in client code.

## Authentication

- BlueAI POST is a machine endpoint with a dedicated server-only bearer secret,
  constant-time digest comparison, fixed owner mapping, 16 KiB body limit and
  60 authenticated writes/minute. Its GET feed still requires Supabase auth.
  Never expose the machine secret in VITE variables, UI, source or logs.

- Express protected application endpoints require authentication. Public
  operational routes include `GET /api/health`, `GET /api/build-info`, and
  `GET /api/debug/auth-check`; the development verification handshake is also
  unauthenticated but requires a non-production server, an explicit server flag,
  and a loopback request.
- Authentication uses Supabase JWT tokens passed in the `Authorization` header.
- Tokens are refreshed by the Supabase client SDK — the app handles 401 retries.
- The local sign-in bypass is client-shell access only. It requires Vite
  development mode, `VITE_LOCAL_AUTH_BYPASS=true`, and a loopback hostname. It
  must never create a session, relax backend authentication, or work in a
  production build/shared environment.

## Data Isolation

- BlueAI is owner-scoped on the server and imported browser records carry that
  owner. The legacy storage limitations below still apply to other app data.

- Express proof records/images, Supabase records, scan sessions/photos and assistant conversations enforce account ownership.
- Other legacy browser job/habit namespaces still require a separate owner-confirmed migration (see `knowledge/memory/known-bugs.md`). Unowned history is preserved, not assigned silently.

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

**Last Updated:** 2026-08-03 (local sign-in bypass safeguards)

## 2026-10-10 security hardening

Superseding security contracts, limits, data-preservation decisions and release status are recorded in [Security Cloud remediation](../../docs/SECURITY_SCAN_2026_10_10.md). Public proof URLs, unrestricted production workspace bypass, global trip-coordinate cache reuse and unauthenticated legacy Worker APIs described in older sections are superseded by that document.
