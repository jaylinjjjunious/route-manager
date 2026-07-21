# UI Components

**Last Updated:** 2026-07-20 (c12bd44)
**Related Source Files:** `src/components/*.tsx`

---

## Component Reference

### ShowerGatePanel

| Field | Value |
|-------|-------|
| **File** | `src/components/ShowerGatePanel.tsx` |
| **Props** | `cycleId: string`, `cycleLabel: string`, `completedProof: ShowerProofRecord \| null`, `onVerifiedProof: (proof: ShowerProofRecord) => void` |
| **Responsibility** | Camera capture, barcode scanning, proof upload, proof history display. Acts as the primary gate — users must verify a shower proof before accessing protected tabs. |

---

### Header

| Field | Value |
|-------|-------|
| **File** | `src/components/Header.tsx` |
| **Props** | `theme: 'light' \| 'dark'`, `onToggleTheme: () => void` |
| **Responsibility** | App header with title and theme toggle. Hidden on the dashboard tab. |

---

### BottomNav

| Field | Value |
|-------|-------|
| **File** | `src/components/BottomNav.tsx` |
| **Props** | `currentTab: string`, `onTabChange: (tab: string) => void`, `isUnlocked: boolean` |
| **Responsibility** | Floating pill navigation bar with 7 tabs. Locked tabs are visually indicated when `isUnlocked` is false. Touch-friendly horizontal scrolling. |

**Tabs:** Dashboard, Route, Jobs, Battery, Tracker, Habits, Settings

---

### BakersfieldMapPreview

| Field | Value |
|-------|-------|
| **File** | `src/components/BakersfieldMapPreview.tsx` |
| **Props** | `jobs: Job[]`, `routeOrder: number[]`, `selectedJobId: string \| null` |
| **Responsibility** | Google Maps-like route display showing job locations on a map preview. Highlights the selected job and shows the optimized route order. |

---

### JobCard

| Field | Value |
|-------|-------|
| **File** | `src/components/JobCard.tsx` |
| **Props** | `job: Job`, `onClick: (job: Job) => void`, `jobAccessLocked: boolean` |
| **Responsibility** | Individual job display card. Shows job details in a road-card styled container. When `jobAccessLocked` is true, the card is visually locked (amber styling) and click is suppressed. |

---

### JobModal

| Field | Value |
|-------|-------|
| **File** | `src/components/JobModal.tsx` |
| **Props** | `job: Job`, `onSave: (job: Job) => void`, `onClose: () => void` |
| **Responsibility** | Modal dialog for viewing and editing job details. Provides form fields for job attributes and save/cancel actions. |

---

### AIDispatcher

| Field | Value |
|-------|-------|
| **File** | `src/components/AIDispatcher.tsx` |
| **Props** | `onAddJob: (job: Job) => void`, `onRemoveJob: (jobId: string) => void` |
| **Responsibility** | Chat interface powered by Gemini. Allows conversational interaction for job management — adding/removing jobs via natural language. Sends messages to `POST /api/dispatcher/chat`. |

---

### JobImportSystem

| Field | Value |
|-------|-------|
| **File** | `src/components/JobImportSystem.tsx` |
| **Props** | `onJobsImported: (jobs: Job[]) => void` |
| **Responsibility** | Screenshot OCR import. Accepts image uploads, sends them to `POST /api/import/ocr`, and parses extracted job data. Supports batch import of multiple jobs from a single screenshot. |

---

### EndOfDaySummary

| Field | Value |
|-------|-------|
| **File** | `src/components/EndOfDaySummary.tsx` |
| **Props** | `jobs: Job[]`, `routeMetrics: RouteMetrics` |
| **Responsibility** | Daily summary display showing completed jobs, route statistics, and performance metrics. Used at end of shift for review. |

---

### OutlierDetector

| Field | Value |
|-------|-------|
| **File** | `src/components/OutlierDetector.tsx` |
| **Props** | `jobs: Job[]`, `onExcludeJob: (jobId: string) => void` |
| **Responsibility** | Identifies and displays outlier jobs (anomalies in route data, timing, or other metrics). Provides ability to exclude outliers from route optimization. |

---

### DebugCenter

| Field | Value |
|-------|-------|
| **File** | `src/components/DebugCenter.tsx` |
| **Props** | None (internal state only) |
| **Responsibility** | System diagnostics panel. Displays app version, auth state, API connectivity, storage status, and other debug information. Uses internal state to fetch and display diagnostic data. |
