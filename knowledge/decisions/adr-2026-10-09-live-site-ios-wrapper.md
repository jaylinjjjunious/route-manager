# Live website inside the iOS wrapper

Status: user-approved draft implementation, 2026-10-09. Supersedes the bundled-frontend ADR.

The user explicitly wants the complete live Route Manager website inside an iPhone shell, with native abilities added individually later. Set Capacitor `server.url` to the fixed HTTPS Render site with a trailing slash. Do not grant wildcard navigation or cleartext traffic. External sites retain Capacitor's external navigation behavior.

`npm run build:ios` packages only a local connection-error/retry page into `dist-native`; it no longer bundles React or requires public Supabase variables. The live site supplies its existing frontend, authentication and same-origin API requests. The previous draft's native API/CORS helpers remain available but are not required to load this hosted site and are not deployed by this change. Website releases change the wrapper's contents; installing a new native plugin still requires a new native build and website integration.

Capacitor documents `server.url` as a live-reload option not intended for production. This user-requested configuration is a preview, not an App Store readiness claim. Before distribution, review remote-content/native-bridge security, Apple policy, privacy and signing. Website availability/connectivity is required for fresh startup; no offline app guarantee. Browser and wrapper sessions/local storage are separate; cloud data is shared after signing into the same account.

The known hosted simulator first-boot failure is not an application failure. Startup capture is explicitly opt-in through workflow dispatch; regular compilation still builds both simulator and unsigned device artifacts. No native UI, signing or physical-device verification is claimed.

Source: [Capacitor configuration](https://capacitorjs.com/docs/config). Resume: [iOS wrap guide](../../docs/IOS_WRAP.md).
