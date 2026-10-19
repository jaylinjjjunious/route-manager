# Independent apps in one managed repository

Date: 2026-10-19. Status: accepted. Supersedes the 2026-10-18 embedded SoftwareShell decision.

The user clarified that the hallway must belong to a parent application, and Route Manager must be its own software room. Separate repositories would be burdensome, so the approved direction is one repository with independent app workspaces.

Use npm workspaces: `apps/hallway` and `apps/route-manager`. Each owns its package, entry point, UI, tests and output. The hallway contains a URL-based software directory and imports no Route Manager code or auth. The embedded SoftwareShell is removed. Route Manager owns its authentication and existing business logic; no shared packages are invented yet.

The root gateway is parent hosting infrastructure, not part of the room. It serves the hallway, launches Route Manager as a separate process bound to loopback and forwards room/API/public-asset traffic. Standalone workspace builds/runs remain available, with URL environment overrides for separate hosts. The current deployment composes the apps under the existing domain, preserving browser data, account/session keys, API URLs and runtime-data working directory. No database or ownership migration is introduced. Root hash bookmarks redirect through the hallway to the room, and auth paths work with the room prefix and legacy root URLs.

The hallway is a public directory with no account records. Login/sign-out stays inside Route Manager; a shared identity layer is deferred. Service workers are room-scoped, with a retirement script for the previous root worker. The native wrapper stays owned by Route Manager and its workflow gets directory updates only.

Root commands coordinate installation, development, lint, builds, tests and production startup. Root README is the project map; knowledge and lifeline stay at the repository root. Earlier feature documentation paths such as `src/`, `server/`, `tests/` and `docs/` are relative to `apps/route-manager/` unless explicitly stated otherwise.

Rollback: annotated checkpoint `checkpoint-2026-10-19-before-monorepo`, commit `50b1f2887a9ea6feb408526aecc1eda714a899c5`; previous source checks and signed-in production evidence recorded in its annotation/lifeline. Preserve existing `dist-native/` and private runtime files. Validation/release progress belongs in APP_LIFELINE.md.
