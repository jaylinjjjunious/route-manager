# Naming Conventions

## TypeScript

| Element | Convention | Example |
|---------|-----------|---------|
| Variables | camelCase | `showerCycleReset` |
| Functions | camelCase | `calculateRoute()` |
| Types | PascalCase | `JobType` |
| Interfaces | PascalCase | `ProofAttachment` |
| Enums | PascalCase | `JobStatus` |
| Constants | UPPER_SNAKE_CASE | `SHOWER_PROOF_MANDATORY` |

## React

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `ShowerGate`, `RideMode` |
| Component files | PascalCase | `ShowerGate.tsx` |
| Hooks | camelCase, `use` prefix | `useShowerGate()` |

## Files

| Type | Convention | Example |
|------|-----------|---------|
| Utility files | kebab-case | `route-optimizer.ts` |
| Component files | PascalCase | `ProofVault.tsx` |
| Test files | kebab-case | `habit-ui-check.cjs` |
| Config files | lowercase | `tsconfig.json` |

## CSS and Styling

- Tailwind utility classes: kebab-case (`bg-blue-500`, `text-center`).
- No custom CSS class names needed — use Tailwind utilities.

## Database and API

| Element | Convention | Example |
|---------|-----------|---------|
| Database columns | snake_case | `proof_image_url` |
| API routes | kebab-case | `/api/shower-proofs` |
| localStorage keys | snake_case | `shower_gate_verified` |

## Git

| Element | Convention | Example |
|---------|-----------|---------|
| Feature branches | `feature/description` | `feature/multi-user` |
| Fix branches | `fix/description` | `fix/camera-lifecycle` |
| Checkpoint tags | `checkpoint-YYYY-MM-DD-desc` | `checkpoint-2026-07-19-stable` |

---

**Last Updated:** 2026-07-20 (c12bd44)
