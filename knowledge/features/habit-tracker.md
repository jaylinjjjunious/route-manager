# Habit Tracker

## Purpose

Daily habit tracking with mandatory shower enforcement (via shower gate) and custom task logging.

## Current Implementation

### Two Sections

1. **Mandatory Shower Habit** — enforced by shower gate, requires barcode scan and proof
2. **Custom Habit Tasks** — user-defined habits with daily logging

### Data Models

**HabitTask**:
```typescript
{
  id: string;
  name: string;
  targetMinutes: number;
  lastMinutes: number;
  createdAt: string;
}
```

**HabitLog**:
```typescript
{
  id: string;
  taskId: string;
  taskName: string;
  minutes: number;
  date: string; // YYYY-MM-DD
  note: string;
  createdAt: string;
}
```

### State

- `habitTasks`: Array of HabitTask definitions
- `habitLogs`: Array of HabitLog entries

### Browser-only persistence (2026-10-25)

Habits retain the existing browser task/log keys and no longer call the nonexistent Express /api/habits endpoint. The Worker legacy endpoint remains retired. The UI explicitly says This browser only and that account sync is unavailable. Existing records are preserved; no ownership migration or backend import occurs. GuestApp never mounts this hook. Browser clearing removes these records; storage quota failures remain a limitation.

### Same-Day Entry Rules

- Can log multiple entries per day for same task
- Each explicit Log Time appends a session; same-day sessions accumulate

## Architecture

### Data Flow

```
User Input → Habit Log → localStorage
                ↓
          Habit Dashboard → Progress Tracking
```

### Key Components

All habit UI elements are rendered by `src/features/habits/HabitsTab.tsx`, a presentational component extracted from `src/App.tsx`:

- **Mandatory Shower Section**: Barcode scanner, proof attachment, confirm button
- **Custom Task List**: Task cards with session counts
- **Add To Today Panel**: Quick-add task with minutes and note
- **Log Time Section**: Minutes done, note, and log button
- **Progress Cards**: Streak, 7-day hit rate, total time, sessions
- **7-Day Consistency Chart**: Daily bar chart against target minutes
- **Log History**: All logged sessions with delete actions

Habit state, effects, handlers, derived stats, and browser persistence live into `src/features/habits/useHabits.ts`. `src/App.tsx` calls `useHabits(todayKey)` and passes the returned values to `HabitsTab`. Shower-gate code in `App.tsx` mutates habit state only through typed integration methods (`addHabitTask`, `addHabitLog`, `ensureHabitTask`, `setActiveHabitTaskId`) exposed by the hook. This was a UI-only extraction followed by a full state/effect extraction with no intended behavior change.

## Design Rationale

- **Local storage**: browser-only task/log persistence; no cloud sync
- **Same-day sessions**: Explicit sessions accumulate minutes
- **Mandatory shower**: Enforced by shower gate system, not optional
- **Minutes-based tracking**: Simple quantitative habit measurement

## Dependencies

- localStorage for client-side state
- Existing localStorage task/log keys, preserved without migration
- Shower gate system for mandatory shower enforcement
- Barcode scanner for shower verification

## Business Rules

1. Shower habit is mandatory — must be completed to unlock protected tabs
2. Custom habits are optional but encouraged
3. Multiple log entries allowed per day per task
4. Explicit same-day sessions add to daily totals
5. Target minutes set per task, actual minutes logged daily
6. Notes are optional per entry
7. Habit state persists only in this browser

## Security

- Habit data is user-specific (single-user app)
- No sensitive data in habit logs
- No backend requests or automatic account migration

## Edge Cases

- **No tasks defined**: Empty state, prompt to create
- **Future date logging**: Allowed for pre-logging
- **Past date editing**: Can edit historical entries
- **Cloud sync**: Unavailable; UI explicitly identifies browser-only storage
- **Legacy data**: Existing local task/log records remain unchanged

## Failure Modes

- No server/cloud recovery: browser clearing removes local records
- localStorage quota exceeded → state not persisted
- Barcode scan fails → shower completion blocked
- Clock skew → date-based logic may be incorrect

## Testing

- Manual test: Add custom task → log entry → verify persistence
- Test same-date replacement (log twice, verify second replaces first)
- Test backend sync (check D1/local JSON)
- Test shower gate integration (barcode scan → unlock)

## Known Limitations

- Single-user localStorage with optional backend sync
- No habit streak tracking or analytics
- No export/import of habit data
- No reminders or notifications

## Future Improvements

- Habit streak tracking
- Analytics dashboard (weekly/monthly trends)
- Export/import habit data
- Push notifications for habit reminders
- Gamification (badges, streaks)
- Multi-user support

## Related Source Files

- `src/App.tsx` — habit state, effects, handlers, and browser persistence
- `src/features/habits/HabitsTab.tsx` — presentational Habits tab UI (extracted from App.tsx)
- `worker/index.ts` — backend API for habit sync
- `server.ts` — Express backend for habit sync

## Related Knowledge

- [Shower Gate](./shower-gate.md) — mandatory shower enforcement
- [Job System](./job-system.md) — jobs are daily work tasks
- [Dashboard](./dashboard.md) — daily overview includes habits

## Last Updated

2026-08-06 (commit ed5d961) — extracted Habits tab UI into `src/features/habits/HabitsTab.tsx`; state, effects, handlers, and backend sync remain in `src/App.tsx`.
