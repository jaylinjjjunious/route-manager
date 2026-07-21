# Accessibility

**Last Updated:** 2026-07-20 (c12bd44)
**Related Source Files:** `src/components/ShowerGatePanel.tsx`, `src/components/BottomNav.tsx`, `src/components/*.tsx`

---

## Focus Management

### Focus Trapping

The `ShowerGatePanel` component implements **focus trapping** in two contexts:

1. **Scanner view** — when the camera/barcode scanner is active, keyboard focus is trapped within the scanner controls to prevent accidental navigation away from the active scan.
2. **History view** — when viewing proof history, focus is trapped within the history panel for consistent keyboard navigation.

### Escape Key Navigation

- The `Escape` key closes modals, panels, and overlays.
- `JobModal` responds to Escape to close.
- `ShowerGatePanel` scanner exits on Escape.
- Focus returns to the triggering element after closing.

---

## ARIA Labels

Interactive elements use `aria-label` attributes for screen reader compatibility:

- Buttons have descriptive `aria-label` values
- Navigation tabs are labeled for assistive technology
- Action buttons describe their purpose beyond visual icons

---

## Color & Status Communication

Status indicators use **both color and text** — not color alone:

| Status | Color | Text Label |
|--------|-------|------------|
| Verified | Green | "Verified" / checkmark with text |
| Locked | Amber | "Locked" / lock icon with text |
| Error | Red | Error message displayed |
| Neutral | Slate | Default state with label |

This ensures users with color vision deficiencies can still understand the status.

---

## Keyboard Navigation

The bottom navigation bar is **keyboard-navigable**:

- Tab key moves focus between tabs
- Enter/Space activates the focused tab
- Arrow keys may navigate between tabs (depending on implementation)

---

## Limitations

| Area | Status |
|------|--------|
| Semantic heading hierarchy | Not documented — heading levels (h1–h6) may not follow a strict hierarchy |
| Skip navigation link | Not implemented |
| Reduced motion preference | Not explicitly handled (fadeIn animation runs regardless) |
| High contrast mode | Not explicitly tested |
| Screen reader testing | Not documented |
| Form labels | Some inputs may lack associated `<label>` elements |

---

## Recommendations

- Add `prefers-reduced-motion` media query to disable or reduce the `fadeIn` animation.
- Ensure all form inputs have explicit `<label>` elements or `aria-label` attributes.
- Consider adding a skip-to-content link for keyboard users.
- Test with VoiceOver (iOS) and TalkBack (Android) for mobile screen reader compatibility.
