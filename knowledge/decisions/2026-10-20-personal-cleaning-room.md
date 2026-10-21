# Personal Cleaning as an independent room

Accepted 2026-10-20. The user wants personal cleaning now and a future business app, separate from Route Manager and the hallway.

Use a third npm workspace with its own frontend, build, tests and model. Register a URL in the hallway and serve static files through the existing gateway. This fits the existing monorepo while keeping room implementation independent.

Start with disclosed browser-only persistence and validated JSON backups. Do not reuse Route Manager account/data systems or imply account sync. This minimizes the first slice while preserving an explicit path to ownership-confirmed cloud migration. Device data durability and concurrent-tab writes have browser-storage limits; business customer workflows require a later product/data decision.
