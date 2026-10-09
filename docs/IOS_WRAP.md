# iOS live-site wrapper — implementation and resume guide

Updated: 2026-10-09. Work branch: codex/ios-wrap-readiness. [Draft wrapper pull request](https://github.com/jaylinjjjunious/route-manager/pull/9).

## Current architecture

The user clarified and approved showing the entire live website inside an iPhone shell. Capacitor loads https://route-manager-phtj.onrender.com/ through server.url. The fixed HTTPS root includes a trailing slash; cleartext is disabled and no wildcard navigation is granted. External destinations retain Capacitor's external navigation behavior. App ID is com.allinone667.routeoptimizer; display name remains All in One 667.

Local assets include a connection-error/retry page and the restricted native navigation bridge script. The wrapper obtains the app, authentication configuration and same-origin APIs from the live website. Website releases update what the wrapper loads. New native plugins require a new native package and corresponding website integration; wrapping alone does not enable new Apple features. Browser access on Android/computers remains available. Sign into the same account for cloud data; wrapper and browser sessions/local storage are separate.

Capacitor documents server.url as a development/live-reload setting not intended for production. This is the requested preview architecture, not a claim of App Store readiness. Review remote-content/native-bridge security, Apple policy, privacy and signing before distribution. Fresh startup requires connectivity and a working website; no offline app guarantee.

Earlier native API routing/CORS helpers remain on the draft branch but are not required for this hosted loading mode. They are not deployed by the wrapper change. Browser plugin is synced through Swift Package Manager, and camera/microphone/foreground-location usage descriptions remain configured. The native Today/Jobs/More bar now uses UIKit UIGlassEffect on iOS 26+, with a systemMaterial fallback for older versions. Native controls reuse the deployed website click handlers; selection, count, theme and ride/modal visibility are mirrored. Jobs count is included in the native label. Web controls hide only after native acknowledgement. Native icon branding is still unverified. Production website source is unchanged by this draft.

## Preparation and builds

Run npm ci, then npm run ios:prepare. build:ios replaces generated dist-native content with the local startup/error screen; cap:sync copies it and normalizes Windows SPM paths. Public Supabase variables are no longer needed for the shell build. Generated assets, Capacitor JSON, build outputs and .env files remain ignored.

Apple iOS Wrap runs on macos-latest / Xcode 26+ and builds simulator and unsigned device archive artifacts. Normal CI skips startup capture; manual workflow dispatch with simulator_smoke=true enables it on a working runtime. Markdown-only pushes skip the native job. Unsigned archives cannot be installed on an iPhone or uploaded to TestFlight.

## Established results and blockers

Local lint, web/server build and shell preparation/sync pass for the live-site change. Generated config points to the fixed live HTTPS root with the local error path; generated assets contain no bundled React app or Node server. New Mac compilation and both artifact uploads passed in [run 37954581365](https://github.com/jaylinjjjunious/route-manager/actions/runs/37954581365) at source 8031d9e; startup smoke was intentionally skipped. No live-site wrapper startup or retry behavior has been verified on native iOS.

Historical bundled build: GitHub billing cleared, existing public client variables configured, and run 37864986666 attempt 3 passed simulator compilation and unsigned device archive/upload on Xcode 26.6. Its simulator artifact ID is 11625493181 and archive ID is 11625078613. These older artifacts contain the superseded bundled frontend, not the live-site shell.

Run 37951706894 compiled the old simulator app but timed out after four minutes in Apple first-boot CoreLocationMigrator, before install/launch. Startup artifact 11625913965 contains metadata only; no screenshot exists. No documented fix for that exact runner failure was found. Do not repeat unchanged smoke runs. The user has no Apple Developer membership and no device available. No Apple enrollment, payment, signing credentials or publishing was performed.

## Resume in order

1. Download the new live-site simulator/unsigned archive artifacts from successful run 37954581365 (older artifacts contain bundled loading).
2. On a working simulator, verify live website startup/login and the actual native Liquid Glass Today/Jobs/More bar: taps, saving/reload, selected state/count/theme, modal/ride hiding, safe areas, Dynamic Type and VoiceOver. Verify external provider navigation and return. Verify offline startup offers the local screen and Try again reconnects. Never fabricate provider completion.
3. Verify native bridge behavior with the actual deployed website before adding features. Changes on this draft do not automatically alter the hosted frontend. No native-CORS release is required solely for same-origin hosted loading.
4. Review icon, privacy, remote-content security and Apple distribution policy.
5. User completes Apple enrollment; configure signing and verify physical iPhone behavior before TestFlight. Simulator compilation alone is insufficient.

References: [Capacitor configuration](https://capacitorjs.com/docs/config), [environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup), [live-site decision](../knowledge/decisions/adr-2026-10-09-live-site-ios-wrapper.md).

Native Liquid Glass local validation: all five focused website-bridge tests, lint, web/server build and shell sync pass. New Swift/Mac compilation pending. Earlier successful shell artifacts do not yet contain this native controller.
