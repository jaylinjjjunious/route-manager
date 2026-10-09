# iOS wrap — implementation and resume guide

Updated: 2026-10-08. Work branch: `codex/ios-wrap-readiness`.

Pushed implementation: `606abd1416d81994ab8e19e2f4bfd6ac5806a7dc`, [draft PR #9](https://github.com/jaylinjjjunious/route-manager/pull/9). The PR's [Mac run 37864986666](https://github.com/jaylinjjjunious/route-manager/actions/runs/37864986666) also failed before starting with the same account billing lock. No native artifact was produced.

## Current state

The existing Capacitor 8 project is being prepared for a bundled native app, not a remote website loader. App ID remains `com.allinone667.routeoptimizer`; display name remains All in One 667. Native compilation and device behavior are **unverified**.

Implemented on this branch:
- Correct local iOS scheme: `capacitor://localhost` (WKWebView cannot register `https` as its custom scheme).
- Frontend-only `dist-native` build, with real Supabase configuration required and development/public authentication bypasses disabled.
- Native API and proof asset URLs route to the existing HTTPS Render backend. Browser requests retain their existing URLs. Supabase client authentication remains direct to Supabase.
- Exact-origin native CORS for API and proof asset paths; existing bearer authentication and owner checks stay in place. No wildcard origins or cookie credentials are granted.
- Native Browser plugin included in the generated Swift Package Manager project; Windows-generated package paths normalized to forward slashes.
- Camera, microphone and foreground location usage descriptions.
- Service worker registration disabled in the bundled native runtime. Password recovery links use the public website; automatic deep-link return is not implemented.
- Mac workflow builds a simulator `.app` and an **unsigned** device `.xcarchive`, using the App scheme and a unique CI build number. These artifacts are not a signed, installable IPA or a TestFlight release.

## Local preparation (Windows or Mac)

Run `npm ci`, then `npm run ios:prepare`. The script loads local `.env` production settings but does not print their values. Required public client settings: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `VITE_API_ORIGIN` defaults to `https://route-manager-phtj.onrender.com` and must be an HTTPS origin without a path or credentials. No service-role key belongs in the native bundle.

Generated native web assets, Capacitor JSON, build products, and `.env` files are ignored. Swift package changes are tracked. Use `npm run cap:sync` rather than bare `cap sync ios` so Windows paths are normalized.

## Blocker verified on GitHub

[Run 37863439962](https://github.com/jaylinjjjunious/route-manager/actions/runs/37863439962) never started. Its check annotation states: “The job was not started because your account is locked due to a billing issue.” Repeated runs will not resolve this. Windows cannot compile Xcode projects locally. The account owner must resolve Actions billing, or a Mac with Xcode 26+ must run the build directly.

Once Actions is available, ensure repository variables or secrets contain the two public Supabase client settings above. Their presence in GitHub is not verified. Do not upload the local `.env` or any backend secrets. Run the Apple iOS Wrap workflow against this branch; inspect the simulator and archive jobs before merging.

## Remaining work in order

1. Compile on Mac; inspect the simulator login and startup, then verify authenticated Today / Jobs / More, account saving/reload, native CE browser open/close, camera proof, permission denial/retry, and offline/reconnect behavior. Real provider completion must never be fabricated.
2. Deploy this branch's narrow native CORS support to Render after review and passing release checks; verify real native authenticated requests and account isolation. It is not deployed while this branch remains a draft.
3. Verify the native app icon matches the approved AIØ artwork (existing Xcode icon has not been verified), review privacy declarations and device presentation.
4. Configure an Apple developer team and signing profile for this bundle ID on Mac. Produce a signed device build and verify on the actual iPhone. Apple team membership, signing assets and App Store Connect app are not verified or provisioned.
5. Prepare App Store Connect privacy/support metadata, export a signed distribution IPA and upload to TestFlight. No Apple agreements, payments, signing credentials or publishing were performed in this session.

## Validation

Local frontend-only build and Capacitor sync pass. All 25 focused native API/CORS, probation sync, diagnostics, account sync and proof upload tests pass. Type-check and production web/server build pass. Local Express smoke checks verify native OPTIONS 204, unauthenticated native GET 401, and no CORS grant to an unrelated origin. Generated assets contain no Node server; Swift paths are portable. Native compilation, simulator/device interaction and signing remain blocked/unverified; no new checkpoint is justified.

References: [Capacitor environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup), [Capacitor config](https://capacitorjs.com/docs/config), [Apple capture permission descriptions](https://developer.apple.com/documentation/avfoundation/requesting-authorization-to-capture-and-save-media).
