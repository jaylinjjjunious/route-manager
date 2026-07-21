# Coding Standards

## Language

- TypeScript throughout — no plain JavaScript in `src/`.
- Strict type checking enabled via `tsc --noEmit`.

## React Patterns

- Functional components only — no class components.
- Hooks for state and lifecycle (`useState`, `useEffect`, `useCallback`, `useMemo`).
- No external state management library — React `useState` and `useContext` only.

## Styling

- Tailwind CSS for all styling.
- No separate CSS files except `index.css` (Tailwind directives and global styles).
- CSS class names follow Tailwind conventions (kebab-case utility classes).
- Inline styles are acceptable for dynamic values that Tailwind cannot handle.

## Icons

- `lucide-react` is the icon library.
- Use the corresponding PascalCase component for each icon.

## Component Architecture

- Single-module `App.tsx` convention — no router library.
- Components are defined inline within `App.tsx` or as separate files in `src/components/`.
- Barrel pattern (`index.ts`) for `utils/` exports.

## Naming Conventions

See `knowledge/rules/naming-conventions.md` for full details.

- TypeScript: `camelCase` variables and functions, `PascalCase` types and interfaces.
- React components: `PascalCase`.
- Files: `kebab-case` for utilities, `PascalCase` for components.
- Constants: `UPPER_SNAKE_CASE`.

## Comments

- JSDoc comments only for complex logic.
- No commented-out code — delete it; Git preserves history.

## Imports

- Prefer absolute imports where configured, otherwise relative.
- Group imports: external libraries first, then local modules.

---

**Last Updated:** 2026-07-20 (c12bd44)
