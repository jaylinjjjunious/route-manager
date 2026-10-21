# All in One

One repository containing independent software apps. Start here when working on the project.

| Workspace | Owns | Entry |
| --- | --- | --- |
| `apps/hallway/` | Main menu, room directory, its own UI/styles/tests/build | `/` |
| `apps/route-manager/` | Route Manager frontend, authentication, Express APIs, data integrations, tests and native wrapper | `/route-manager/` |
| `apps/cleaning/` | Personal cleaning routines, history and device-local backups | `/cleaning/` |
| `gateway/` | Parent hosting and URL routing; starts the room as a separate process | `npm start` |
| `knowledge/` | System documentation, decisions and feature knowledge | `knowledge/README.md` |
| `APP_LIFELINE.md` | Current progress, release evidence and resume notes | Read at session startup |

The hallway never imports Route Manager. It opens the app through a URL. Each app has its own `package.json`, source, tests and build output. Add shared packages only when actual shared code is needed.

## Commands

Use Node 22.16 or newer and run these from the repository root:

```sh
npm ci
npm run dev                 # Parent + all three apps at http://localhost:3000
npm run lint                # All app type checks and gateway syntax
npm test                    # App suites and gateway integration tests
npm run build               # Each app builds its own dist directory
npm start                   # Production parent server + separate room process
```

For independent app work:

```sh
npm run dev:hallway          # Hallway only, http://localhost:5173/hallway/
npm run dev:route-manager    # Room only, http://localhost:3001
npm run dev:cleaning        # Cleaning only, port 5174 at /cleaning/
npm run build:cleaning
npm run start:cleaning      # Cleaning preview, port 4174
npm run build:hallway
npm run build:route-manager
npm run start:hallway        # Preview the independent hallway build, port 4173
npm run start:route-manager  # Room production server only, port 3001
npm run test --workspace @all-in-one/route-manager -- tests/roomLocation.test.ts
```

The independent hallway uses `VITE_ROUTE_MANAGER_URL` for a room hosted elsewhere (for local standalone work, `http://localhost:3001/#dashboard`). Route Manager uses `VITE_HALLWAY_URL` for a hallway hosted elsewhere (for local standalone work, `http://localhost:5173/hallway/`). Set these when building the relevant app. A separate static hallway deployment can set `HALLWAY_BASE=/` at build time. The combined parent needs none of these overrides.

## Environment, storage and deployment

Keep local environment values in the root `.env` (never commit it). The Route Manager example is `apps/route-manager/.env.example`. Route Manager's Vite config reads the root environment; the independent hallway has no authentication or room-data imports and reads only its own URL configuration. Route Manager continues to own login and sign-out. Common cross-app login is future work.

Production remains the existing Render service and domain. `render.yaml` still runs `npm ci && npm run build`, then `npm start`; the root start command now owns hosting. The gateway serves the hallway build and forwards `/route-manager/`, `/api/*` and legacy public asset/auth URLs to the room's separate loopback process. All apps use the existing browser origin, so Route Manager's browser data and Supabase session keys stay intact. No database migration or data copying is part of this move.

The parent launches its child from the repository root, preserving existing server-local file paths. Direct workspace commands use their workspace as the working directory; prefer the root `dev:route-manager` / `start:route-manager` commands when using existing local runtime data. The legacy root service worker retires without clearing records; Route Manager's new worker is scoped to `/route-manager/`.

The existing iOS project/config live inside `apps/route-manager/`. Root `cap:*` commands delegate there and the Apple workflow builds that app only. Native functionality is unchanged; real-device checks remain separate. Untracked `dist-native/` is intentionally preserved at the root.

Rollback baseline: `checkpoint-2026-10-19-before-monorepo` at `50b1f2887a9ea6feb408526aecc1eda714a899c5`. Use a recovery branch or a normal revert; never force-push.

## Personal Cleaning

Cleaning starts with your own spaces and routines: Today, Spaces, History, recurrence, undo and reversible archives. It stores data in this browser only; use Backup to export/import JSON. There is no account sync or business customer workflow yet. Independent hosting overrides: CLEANING_BASE, VITE_HALLWAY_URL; hallway link: VITE_CLEANING_URL. See knowledge/features/cleaning-planner.md.
