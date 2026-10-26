**Superseded 2026-10-25:** User rejected the replacement guest experience and requested their original app back. Guest UI/routing removed; original c09f5c7 login/gating restored. Stored guest data remains untouched. The decision below is historical, not current behavior.

# Isolated Route Manager guest workspace

Accepted 2026-10-25. The user rejected a bypass that only opened the public menu and returned to login on entering Route Manager.

The bypass now explicitly mounts a separate GuestApp within Route Manager. It provides local Today/Jobs planning and directions with a dedicated guest data key and a tab-scoped entry marker that survives reload and hallway navigation. It creates no authenticated or synthetic user. Real sessions take precedence; guest Sign in exits the guest shell. Guest data is never imported into accounts automatically.

The authenticated App has legacy browser storage that is not fully owner-scoped. Mounting it under a fabricated user or globally intercepting storage would risk exposing private caches and coupling every existing feature to guest behavior. A separate small shell preserves that boundary while offering usable planning. Guest code has no imports of account stores, protected API clients or account feature modules. Server authentication and admin guards remain unchanged.

Guests can create/edit/complete/reopen their own browser-local jobs and open Google Maps directions from their own starting address. Cloud sync, account records, proof uploads, inventory and admin tools require sign-in. The UI explains browser-only storage and shared-browser visibility. Extending guest tools requires maintaining this boundary.

Validation: storage-key isolation with private/legacy sentinels; malformed-record preservation; URL encoding; explicit login entry/remount/exit; real-session precedence; local and public browser job workflows, reload and hallway roundtrip; root lint/build.
