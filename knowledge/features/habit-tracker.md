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

### Backend Sync

| Endpoint | Method | Storage |
|----------|--------|---------|
| `/api/habits` | GET | D1 habit_state table (Worker) or local JSON (Express) |
| `/api/habits` | PUT | D1 habit_state table (Worker) or local JSON (Express) |

### Same-Day Entry Rules

- Can log multiple entries per day for same task
- Existing entry for same date+taskId is replaced (upsert behavior)

## Architecture

### Data Flow

```
User Input → Habit Log → localStorage + Backend Sync
                ↓
          Habit Dashboard → Progress Tracking
```

### Key Components

- **Mandatory Shower Section**: Barcode scanner, proof attachment, confirm button
- **Custom Task List**: Task cards with sliders for minutes
- **Date Picker**: Select date for logging
- **Notes Input**: Free-text notes per log entry

## Design Rationale

- **Dual storage**: localStorage for instant UI, backend for persistence
- **Same-day replace**: Prevents duplicate entries for same task/day
- **Mandatory shower**: Enforced by shower gate system, not optional
- **Minutes-based tracking**: Simple quantitative habit measurement

## Dependencies

- localStorage for client-side state
- Backend API for persistence (Worker D1 or Express local JSON)
- Shower gate system for mandatory shower enforcement
- Barcode scanner for shower verification

## Business Rules

1. Shower habit is mandatory — must be completed to unlock protected tabs
2. Custom habits are optional but encouraged
3. Multiple log entries allowed per day per task
4. Same date+taskId replaces existing entry (upsert)
5. Target minutes set per task, actual minutes logged daily
6. Notes are optional per entry
7. Habit state synced to backend on changes

## Security

- Habit data is user-specific (single-user app)
- No sensitive data in habit logs
- Backend sync uses authenticated endpoints

## Edge Cases

- **No tasks defined**: Empty state, prompt to create
- **Future date logging**: Allowed for pre-logging
- **Past date editing**: Can edit historical entries
- **Backend unavailable**: Falls back to localStorage only
- **Schema migration**: habit_state table handles version changes

## Failure Modes

- Backend sync fails → data retained in localStorage
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

- `src/App.tsx` — habit state and handlers
- `worker/index.ts` — backend API for habit sync
- `server.ts` — Express backend for habit sync

## Related Knowledge

- [Shower Gate](./shower-gate.md) — mandatory shower enforcement
- [Job System](./job-system.md) — jobs are daily work tasks
- [Dashboard](./dashboard.md) — daily overview includes habits

## Last Updated

2026-07-20 (commit c12bd44)
