# Workspace Migration Rollback Point

- Annotated tag: `checkpoint-2026-10-19-before-monorepo`
- Commit: `50b1f2887a9ea6feb408526aecc1eda714a899c5`
- State: working Route Manager with the first embedded hallway implementation, before independent workspace migration.
- Validation: lint/build and shell tests passed; implementation `2bce1ca` was signed-in/public verified, followed only by release notes at `50b1f28` (also publicly confirmed before migration).
- Limitations: this baseline shares the hallway within Route Manager; existing physical-device/native and unrelated feature checks remain open.

The tag is pushed to the GitHub remote. Inspect it on a new branch after preserving any local work:

```sh
git switch -c recovery/pre-monorepo checkpoint-2026-10-19-before-monorepo
```

For a production rollback, use a normal reviewed revert of the migration and push the resulting commit. Never force-push or move the checkpoint tag. Keep `.env`, private runtime files and untracked `dist-native/` in place.
