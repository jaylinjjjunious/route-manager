# Route Manager

This is an independent app workspace within All in One. It owns its React frontend, Express APIs, Supabase authentication, route/job features, schemas, public assets, feature docs, tests and iOS wrapper. It imports no hallway implementation.

Start with the [parent project map](../../README.md), [knowledge map](../../knowledge/README.md) and [current progress](../../APP_LIFELINE.md).

Run installation and shared commands from the repository root:

```sh
npm ci
npm run dev:route-manager
npm run build:route-manager
npm run start:route-manager
npm run test --workspace @all-in-one/route-manager
```

Use root `npm run dev` or `npm start` for the composed parent and both apps. The room is available at `/route-manager/` behind the parent, or at `/` on its standalone server. Its authentication and feature hashes work in both configurations. `VITE_HALLWAY_URL` sets the return URL for independent hosting. Keep local secrets in the parent `.env`; the example is this workspace's `.env.example`.

Parent-launched room processes retain the original repository-root runtime-data directory. Existing Supabase/browser storage keys and public API paths are unchanged. The hallway is an ordinary URL destination, not a component or tab in this app. Real-device camera/native validation and existing unfinished features remain documented in the knowledge system.
