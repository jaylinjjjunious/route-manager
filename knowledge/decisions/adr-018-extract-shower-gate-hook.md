# ADR-018: Extract Shower Gate State into `useShowerGate` Hook

## Status

Accepted

## Context

The shower gate feature originally had all its state, effects, scanner lifecycle, barcode detection, and proof sync logic co-located in `src/App.tsx`. As the feature grew, it ballooned App.tsx with shower-specific concerns that were tightly coupled to the rest of the application. This made the shower gate hard to reason about, test, and maintain independently.

The broader goal is to isolate each major feature under a dedicated `src/features/<feature>/` directory with its own types, UI components, and state hooks, following the pattern already established by `useHabits` (`src/features/habits/useHabits.ts`).

## Decision

Extract all shower gate mechanics from `src/App.tsx` into a single custom hook:

- **Hook**: `src/features/showerGate/useShowerGate.ts`
- **UI section**: `src/features/showerGate/ShowerGateSection.tsx`
- **Shared types**: `src/features/showerGate/types.ts`

The hook owns:
- All `useState` and `useRef` declarations related to shower gate
- Cycle computation and derived values (`showerGateUnlocked`, `showerGateAccessReady`, `showerCycleKey`, `showerCycleLabel`)
- Barcode scanner lifecycle (`startBarcodeScanner`, `stopBarcodeScanner`, `toggleBarcodeTorch`)
- Barcode detection and permission state
- Proof attachment staging (`handleShowerProofFile`)
- Backend sync (`loadShowerProofFromBackend`, `saveShowerProofToBackend`)
- `confirmShower()` — validates barcode + proof, uploads, returns `{ success, proof?, error? }`
- `handleMissionControlVerified(record)` — normalizes Mission Control proof, returns `ShowerProof | null`

`src/App.tsx` retains only cross-cutting orchestration:
- Instantiates `const showerGate = useShowerGate(now)`
- `blockJobAccess(action)` — redirects to Dashboard if gate locked
- `handleConfirmDailyShower()` — delegates to `showerGate.confirmShower()`, then logs habit task + habit log + dispatcher message
- `handleMissionControlShowerVerified(record)` — delegates to `showerGate.handleMissionControlVerified()`, then logs habit task + habit log + dispatcher message
- Ride-mode kill effect when gate resets at 6:00 AM
- Protected tab overlays (Battery, Tracker) using `showerGate.showerGateAccessReady`
- Passing `showerGate.*` props into `HabitsTab` and `TodayScreen`

## Alternatives Considered

1. **Context + Provider**: Would add boilerplate and is overkill for a single-owner feature. The hook pattern is simpler and already proven by `useHabits`.
2. **Zustand store**: Would decouple state but adds a new dependency. The project currently uses plain React hooks for feature state; staying consistent avoids fragmentation.
3. **Keep in App.tsx**: Rejected because App.tsx is already large and the shower gate is a self-contained domain that benefits from isolation.

## Consequences

- **Benefits**: Shower gate logic is now centralized, readable, and can be tested independently. App.tsx shrinks. Feature boundaries are clearer.
- **Tradeoffs**: The hook is ~350 lines, which is substantial, but it is cohesive and all shower-related. Cross-cutting concerns (habit logging, dispatcher messages) remain in App.tsx by design.
- **Risks**: The hook returns many fields (~20); consumers must reference `showerGate.xxx`. This is mitigated by TypeScript and clear naming.
- **Future impact**: If additional daily gates are added (e.g., sleep gate, meal gate), the same hook pattern can be replicated under `src/features/<gate>/`.

## Related Files

- `src/features/showerGate/useShowerGate.ts`
- `src/features/showerGate/ShowerGateSection.tsx`
- `src/features/showerGate/types.ts`
- `src/App.tsx`
- `knowledge/features/shower-gate.md`
- `knowledge/architecture/frontend.md`

## Date

2026-08-06

---

**Last Updated:** 2026-08-06 (refactor/shower-gate-extraction)
