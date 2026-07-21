# Knowledge System Protocol

Before every coding session:

1. Read `knowledge/README.md` for the document map.
2. Identify the relevant knowledge documents for the feature or system being changed.
3. Load those documents.
4. Inspect the related source files listed in those documents.
5. Compare documented intent with current implementation.
6. Report any conflict or outdated documentation **before** editing code.

After every implementation change:

- Update all affected knowledge documents to reflect the change.
- Update `memory/known-bugs.md`, `memory/current-priorities.md`, and `memory/lessons-learned.md` as needed.
- Record new Architectural Decision Records in `knowledge/decisions/` when applicable.

# Production Change Workflow

For every finished application change:

1. Follow the Knowledge System Protocol above first.
2. Inspect the relevant files.
3. Make the smallest correct change.
4. Run:
   npm run lint
   npm run build
5. If checks fail, do not commit or push.
6. Review:
   git diff
   git status
7. Update all affected knowledge documents.
8. Commit with a descriptive message.
9. Push to the GitHub production branch.
10. Verify the remote commit exists.
11. Check whether Railway started a deployment from that commit.
12. Do not claim the update is live until the public domain reflects it.

Never leave completed production work only in the local working tree.

Never use git push --force.

Never commit .env files, secrets, tokens, private proof images, local databases, or upload folders.

# Checkpoint Workflow

Create a checkpoint only after:

- lint passes
- build passes
- the important feature works locally
- the commit has been pushed
- the deployed public website works when deployment is available

Use annotated Git tags.

Checkpoint tag format:

checkpoint-YYYY-MM-DD-short-description

Example:

checkpoint-2026-07-19-auth-login-stable

Create checkpoints using:

git tag -a checkpoint-YYYY-MM-DD-description -m "Stable checkpoint: description"
git push origin checkpoint-YYYY-MM-DD-description

Before creating a checkpoint, record:

- commit SHA
- feature state
- build result
- deployment result
- known limitations

Do not move or overwrite an existing checkpoint tag.

# Rollback Safety

Before any large or risky change:

1. Confirm the working tree is clean.
2. Create or identify the most recent stable checkpoint.
3. Show the checkpoint tag and commit SHA.
4. Make the risky change on a separate branch when practical.

For risky work, create a branch such as:

feature/shower-gate-fix
fix/auth-session-loop
feature/mobile-login

Do not make large experimental changes directly on main unless the user explicitly requests it.

# Deployment

Production branch: main
GitHub remote: github → https://github.com/jaylinjjjunious/route-manager.git
Railway project: route-optimizer-app
Railway service: route-optimizer-app
Railway environment: production

Fallback deploy (when Autodeploy is unavailable):

railway up

Do not use railway redeploy for new source-code changes.
railway redeploy only redeploys the last uploaded code.
