# Bundled iOS frontend and hosted backend

Status: superseded by [live-site iOS wrapper](adr-2026-10-09-live-site-ios-wrapper.md) on 2026-10-09 after the user clarified the intended architecture. The following describes the previous draft, not current wrapper loading.

Use Capacitor's local `capacitor://localhost` origin and frontend-only assets. Keep Express on the existing Render HTTPS origin. Resolve local API/proof asset paths only in the native runtime, preserving browser and third-party URL behavior. The backend accepts exact-origin native CORS while retaining bearer authentication and ownership checks. Do not use a production `server.url` remote website loader or bundle the Node server.

This preserves local UI startup and existing local-first storage while requiring connectivity for cloud APIs. Native password recovery returns to the public web recovery page until a separate deep-link flow is implemented. Mac/Xcode, signed device testing and Apple distribution remain distinct release gates; local Vite success does not establish a working native app. See [implementation/resume guide](../../docs/IOS_WRAP.md).
