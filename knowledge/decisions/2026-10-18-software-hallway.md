# Independent software hallway

Date: 2026-10-18. Status: accepted.

The user requested a hallway separate from the software rooms it opens, and selected Route Manager as one room with more software to be added later.

Use an authenticated SoftwareShell outside App.tsx. Bare `/` and `/#home` open the main menu; Route Manager opens at `/#dashboard`, retaining its existing feature hashes and navigation. Only Route Manager is implemented as a room. The main menu owns no route/jobs/inventory/check-in hooks. Load the room lazily and unmount it on exit; its persisted data stays in existing stores, while transient UI state is discarded. The in-room Main menu control is hidden during Ride Mode. Browser-level navigation has the same interruption limitations as leaving/reloading the app.

Shared authentication and account ownership stay in ProtectedApp/AuthProvider. This introduces UI and lifecycle separation, not independent deployments, security sandboxes, or new storage ownership. Future software can add its own component and navigation under this boundary without becoming Route Manager tabs.

Validation: focused shell tests cover no initial room mount, entry, complete unmount on return, return focus, existing deep links and browser navigation. Lint/build and local/public interaction verification are tracked in APP_LIFELINE.md.
