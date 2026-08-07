# ADR-2026-08-06: Extract Habit Tracker Logic into useHabits Hook

## Status

Accepted

## Context

The Habits tab in `src/App.tsx` contained a large block of normal habit-tracking logic (state, effects, handlers, derived stats, and backend synchronization) alongside shower-gate-specific code. The previous UI-only extraction (`ed5d961`) moved the presentational component into `src/features/habits/HabitsTab.tsx`, but all state and logic remained in `App.tsx`. This created two problems:

1. **App.tsx bloat**: Habit logic was ~445 lines of state declarations, effects, handlers, and derived values inside the already-large application shell.
2. **Mixing concerns**: Normal habit tracking (daily task logging, streaks, backend sync) was co-located with shower-gate job-unlocking code (barcode scanning, proof upload, `blockJobAccess`), making both harder to reason about independently.

The goal was to extract all normal habit logic into a dedicated hook while keeping shower-gate code in `App.tsx` where it belongs.

## Decision

Extract all normal habit `useState`, `useEffect`, handlers, and derived stats into `src/features/habits/useHabits.ts`. `App.tsx` calls `const habits = useHabits(todayKey)` after `todayKey` is computed and passes the returned values to `HabitsTab` via props.

Shower-gate code in `App.tsx` must no longer mutate habit state directly via `setHabitTasks` or `setHabitLogs`. Instead, it uses typed integration methods exposed by the hook:

- `addHabitTask(task: HabitTask)` — idempotent append
- `addHabitLog(log: HabitLog)` — idempotent prepend
- `ensureHabitTask(task: HabitTask): boolean` — upsert by ID or name, returns whether a change occurred
- `setActiveHabitTaskId(id: string)` — switch active task

`setHabitTasks` and `setHabitLogs` are **not** exposed to `App.tsx`, maintaining a clear boundary.

Supporting files created:
- `src/features/habits/types.ts` — shared `HabitTask` and `HabitLog` interfaces
- `src/utils/safeStorage.ts` — extracted `safeStorage` helper to avoid circular imports

## Alternatives Considered

1. **Context + Provider pattern** — Rejected because the habit state is only needed by `App.tsx` and `HabitsTab`. A custom hook with prop drilling is simpler and avoids unnecessary global context.
2. **State management library (Zustand/Redux)** — Rejected as overkill for a single-user app where localStorage + optional backend sync is sufficient. The existing `useState` + `useEffect` pattern works well.
3. **Move shower-gate logic into the hook** — Rejected because the shower gate owns `showerProofs`, `barcodeScannerActive`, `blockJobAccess`, and other App-level state. Keeping it in `App.tsx` preserves the correct ownership boundary.

## Consequences

**Benefits:**
- `App.tsx` shrank by ~380 lines of habit logic
- Normal habit tracking is independently testable and reusable
- Shower-gate code has a clean, typed interface for habit mutations
- No behavior change for end users

**Tradeoffs:**
- `HabitsTab` still receives ~56 props (32 from `habits.`, 24 shower/other from `App.tsx`). A future refactor could split shower UI into its own component.
- The hook runs all effects unconditionally in `App.tsx` even when the Habits tab is not active. This is acceptable because the effects are lightweight (localStorage writes, debounced backend sync).

**Risks:**
- Shower-gate code must remember to use integration methods; direct `setHabitTasks` usage would cause TypeScript errors (the setters are not exported).

## Related Files

- `src/features/habits/useHabits.ts` — extracted hook
- `src/features/habits/types.ts` — shared types
- `src/utils/safeStorage.ts` — safe localStorage helper
- `src/App.tsx` — shower-gate code + hook consumer
- `src/features/habits/HabitsTab.tsx` — presentational UI

## Date

2026-08-06

---

**Last Updated:** 2026-08-06 (commit TBD) — extracted all habit state, effects, handlers, and derived stats into `useHabits`; shower code uses typed integration methods
