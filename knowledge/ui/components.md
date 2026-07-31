# UI Components

**Last Updated:** 2026-07-30 (phase-1-scheduling)
**Related Source Files:** `src/components/*.tsx`, `src/assistant/*.tsx`

---

## Component Reference

### WeeklyStrip

| Field | Value |
|-------|-------|
| **File** | `src/components/WeeklyStrip.tsx` |
| **Props** | `days: ScheduledDaySummary[]`, `today: string`, `selectedDate: string \| null`, `onSelect: (date: string) => void`, `overdueCount: number`, `unscheduledCount: number`, `onReviewOverdue: () => void`, `onReviewUnscheduled: () => void` |
| **Responsibility** | 7-day horizontal snap-scroll scheduling strip on the Mission Control dashboard (desktop `lg:col-span-4`). Cell shows weekday/date/job count/pay plus a `◌` weather placeholder (Phase 2). Today pill (blue), selected ring (amber), Needs Review badge, overdue + unscheduled chips, arrow-key/Home/End navigation, `motion-reduce:transition-none`. |

---

### ExpandedDayPanel

| Field | Value |
|-------|-------|
| **File** | `src/components/ExpandedDayPanel.tsx` |
| **Props** | `day: ScheduledDaySummary`, `today: string`, `todayJobsCount`, `todayPay`, `todayWorkMinutes`, `startCoord`, `avgSpeedMph`, `onMoveToDay(job)`, `onOpenJob(id)`, `onPlanThisDay(day)`, `onAddJob()`, `onMoveExisting()`, `onCollapse()` |
| **Responsibility** | Detail panel shown beneath the strip for the selected day (or today when no day is selected). Stats (Jobs/Pay/Work/Ride), placeholders for Phase 2 weather/transit analysis, Plan This Day (today → re-optimize; future → validation hint), Compare Days table, per-job list with Move actions, Needs Review inline list with Fix/Move, disabled "Hear Summary" (Phase 3), empty-day Add Job / Move Existing Job actions, Collapse. |

---

### MoveToDaySheet

| Field | Value |
|-------|-------|
| **File** | `src/components/MoveToDaySheet.tsx` |
| **Props** | `job: Job \| null`, `today: string`, `onMove(id, date \| null)`, `onClose()` |
| **Responsibility** | Portal bottom-sheet/modal to reschedule a job. Move to Today, Move to Tomorrow, native date input (min today, max today+365), save-state spinner + error message, Remove scheduled date, Escape/tap-outside close. Past dates disallowed; jobs move in place (no duplicates). |

---

### AI Operations Assistant System

The AI Operations Assistant is a floating chat bubble available throughout the authenticated application. It is the primary conversational access point for controlling the app, reading context, and executing approved actions.

**Architecture:**

| Layer | Files | Responsibility |
|-------|-------|----------------|
| **Types** | `src/assistant/assistantTypes.ts` | All assistant-specific type definitions |
| **Context** | `src/assistant/assistantContext.ts` | React context for assistant state |
| **Provider** | `src/assistant/AssistantProvider.tsx` | Main orchestrator — wires tool registry, conversation store, API calls |
| **Conversation** | `src/assistant/conversationStore.ts` | Chat message state with localStorage persistence |
| **Tool Registry** | `src/assistant/toolRegistry.ts` | Tool registration and execution engine |
| **Permission** | `src/assistant/permissionPolicy.ts` | Permission checking for tools |
| **Confirmation** | `src/assistant/confirmationStore.ts` | Confirmation dialog state |
| **API** | `src/assistant/assistantApi.ts` | Client for `POST /api/assistant/chat` |

**UI Components:**

| Component | File | Responsibility |
|-----------|------|----------------|
| **AssistantBubble** | `src/assistant/AssistantBubble.tsx` | Floating chat button + full-screen panel wrapper. On mobile: fills entire viewport (`h-dvh`). On desktop (≥640px): 400×600px floating drawer in bottom-right. When open, renders a dark translucent green backdrop with `backdrop-filter: blur(10px)` behind the panel. |
| **AssistantPanel** | `src/assistant/AssistantPanel.tsx` | Expandable chat panel with header, messages, composer. Uses dark frosted green-glass surface (`linear-gradient(145deg, rgba(8,48,34,0.84), rgba(4,28,22,0.72))` with `backdrop-filter: blur(22px) saturate(135%)`). Header and composer use slightly more opaque green surfaces. |
| **AssistantMessageList** | `src/assistant/AssistantMessageList.tsx` | Message display with typing indicators |
| **AssistantComposer** | `src/assistant/AssistantComposer.tsx` | Text input + quick prompts + send |
| **AssistantActionCard** | `src/assistant/AssistantActionCard.tsx` | Action confirmation/rejection card |

**Tools (`src/assistant/tools/`):**

| Tool File | Tools Provided |
|-----------|----------------|
| `navigationTools.ts` | `navigate`, `get_current_page` |
| `showerGateTools.ts` | `get_shower_gate_status`, `open_shower_gate` |
| `jobTools.ts` | `get_job_list`, `get_next_job`, `get_job_detail`, `open_jobs_page` |
| `batteryTools.ts` | `get_battery_status` |
| `weatherTools.ts` | `get_weather_context` |
| `travelTools.ts` | `get_travel_recommendation` |
| `proofTools.ts` | `open_proof_history` |
| `debugTools.ts` | `run_health_check` |
| `contextBuilder.ts` | Builds safe app context for the AI |

**Provider Props** (`AssistantProviderProps`):

| Prop | Type | Source |
|------|------|--------|
| `jobs` | `Job[]` | App.tsx state |
| `routeAJobs` | `Job[]` | App.tsx computed |
| `routeBJobs` | `Job[]` | App.tsx computed |
| `currentBattery` | `number` | App.tsx state |
| `ebikeConfig` | `EbikeConfig` | App.tsx state |
| `activeMetrics` | `RouteMetrics` | App.tsx computed |
| `showerGateUnlocked` | `boolean` | App.tsx computed |
| `currentTab` | `string` | App.tsx state |
| `theme` | `'light' \| 'dark'` | App.tsx state |
| `weatherWind` | `string` | App.tsx state |
| `terrain` | `string` | App.tsx state |
| `dayEarnings` | `number` | `activeMetrics.totalPay` |
| `onNavigate` | `(tab: string) => void` | `handleTabChange` |
| `onOpenProofHistory` | `() => void` | Sets `selectedProofJobId` |
| `onOpenAddJob` | `() => void` | `handleOpenAddModal` |
| `onOptimizeRoute` | `() => void` | `handleOptimizeRouteSequence` |

**Context Value** (from `useAssistant()`):

| Field | Type |
|-------|------|
| `isOpen` | `boolean` |
| `setIsOpen` | `(open: boolean) => void` |
| `messages` | `AssistantMessage[]` |
| `sendMessage` | `(text: string) => Promise<void>` |
| `confirmAction` | `(messageId: string) => void` |
| `dismissAction` | `(messageId: string) => void` |
| `clearConversation` | `() => void` |
| `isLoading` | `boolean` |
| `tools` | `AssistantTool[]` |
| `appContext` | `AppContext \| null` |

---

### AIDispatcher (Legacy)

| Field | Value |
|-------|-------|
| **File** | `src/components/AIDispatcher.tsx` |
| **Props** | 15 props including all job/route data and action callbacks |
| **Responsibility** | Retired legacy route chat component. No longer mounted after the standalone Route tab was removed; route assistance now goes through the AI Operations Assistant bubble and Dashboard route context. |

---

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
| **Responsibility** | App header with official logo image, title, e-bike status, user email, and theme toggle. Hidden on the dashboard tab. |

---

### Bottom Navigation

| Field | Value |
|-------|-------|
| **File** | `src/App.tsx` |
| **State** | `currentTab`, `activateTabFromTap`, `showerGateUnlocked` |
| **Responsibility** | Inline floating pill navigation bar with 6 tabs. Battery and Tracker are locked until shower verification. Touch-friendly horizontal scrolling. |

**Tabs:** Dashboard, Battery, Tracker, Habits, Tools, Settings

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
| **Props** | `job: Job`, `isOutlier: boolean`, `onToggleComplete`, `onEdit`, `onDelete`, `onDuplicate`, `onToggleRoute`, `onUpdateStatus`, `jobAccessLocked` |
| **Responsibility** | Shared job-detail card component. Single source of truth for visual design — used on both the Jobs tab list and the Dashboard detail sheet. Renders status badges, type badge, pay, deadline, notes, process-serve info, revision info, smart-merge explanation, quick status controls, and administrative actions (edit/duplicate/delete). |

---

### DashboardJobDetailSheet

| Field | Value |
|-------|-------|
| **File** | `src/components/DashboardJobDetailSheet.tsx` |
| **Props** | `job: Job`, `routeIndex: number \| null`, `legDistance: number`, `rideMinutes: number`, `navLink: string`, `isOutlier: boolean`, `jobAccessLocked: boolean`, `onToggleComplete`, `onEdit`, `onDelete`, `onDuplicate`, `onToggleRoute`, `onUpdateStatus`, `onOpenInJobs`, `onClose` |
| **Responsibility** | Mobile-friendly bottom-sheet modal that opens when a Dashboard "Today's Route" card is tapped. Wraps `JobCard` as the shared detail component with a compact route-info header (stop number, leg distance, ride time) and footer actions (Navigate, Open in Jobs). Does not duplicate JobCard's design. Displays a Scheduled row and a "Move to a different day" action (opens MoveToDaySheet) when present. |

---

### JobModal

| Field | Value |
|-------|-------|
| **File** | `src/components/JobModal.tsx` |
| **Props** | `job: Job`, `onSave: (job: Job) => void`, `onClose: () => void` |
| **Responsibility** | Modal dialog for viewing and editing job details. Provides form fields for job attributes and save/cancel actions. Includes an optional "Schedule For" native date input (min today; future dates go to standby Route B). |

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

---

### SmartAisleScan

| Field | Value |
|-------|-------|
| **File** | `src/components/SmartAisleScan.tsx` |
| **Props** | `jobId: string`, `jobName: string`, `isOpen: boolean`, `onClose: () => void`, `onComplete: (sessionId: string) => void` |
| **Responsibility** | Camera-guided retail aisle photography system. Full capture workflow: setup (direction/side selection), full-screen camera capture with alignment overlay, camera-readiness guarded capture controls, 0.5x/1x zoom toggle (native applyConstraints + CSS fallback), animated start photo into a top-left proof tray, removable active-photo thumbnails with translucent X controls (immediate removal, no confirmation dialog), thumbnail review viewer, press-and-hold burst section capture, release-to-pause Burst Complete feedback, separate Reached the End action, ending capture, automatic sequence recalculation/restitch after removal, immediate canvas panorama stitching, stitched review, and stitched-photo submission. Capture buttons disable text selection and touch callout behavior during long press. The shared quality gate rejects dark, blurry, moving, or tilted frames before active-sequence acceptance, and the visual level guide can be shown/hidden without disabling level validation. **Undo protection**: after immediate removal, a temporary "Photo removed / Undo" toast appears for ~6 seconds. Undo restores the exact photo by stable ID, its original sequence position, recalculates overlaps, and rebuilds the stitched preview. **Lens cleanliness detection**: rolling-frame analysis detects persistent haze, smudge, or obstruction using global contrast, center-edge sharpness ratio, and local block-contrast analysis. High-confidence persistent lens issues block photo acceptance. Check Lens and Recheck Lens controls allow manual analysis. Uses localStorage for session persistence with resume-on-reopen. |

**Primary phases:** setup → capturing → stitching → stitch_review → submitting. Legacy review/checklist phases remain typed for persisted-session compatibility, and the normal camera path now stitches only after the user taps Reached the End.

**Compatible job types:** `retail_audit`, `mystery_shop`, `merchandising`

**Entry point:** `JobDetailModal` — "Smart Aisle Scan" button appears above admin row for compatible job types.


### RealDeviceVerification

| Field | Value |
|-------|-------|
| **File** | `src/components/RealDeviceVerification.tsx` |
| **Route** | `/real-device-verification?access=fuckyouleavemelone` |
| **Responsibility** | Protected tester-assisted real-iPhone verification panel for Smart Aisle Scan. Bypasses auth, uses the existing `SmartAisleScan` component with isolated `test_lab_real_device_iphone_verification` data, records privacy-safe event evidence, displays build commit/deployment info, provides the exact Safari/PWA test script, supports repeated hold/removal/stitch checks without clearing the whole session, captures manual checklist results, and exports a report without photo contents. |
### SmartAisleScanTestLab

| Field | Value |
|-------|-------|
| **File** | `src/components/SmartAisleScanTestLab.tsx` |
| **Props** | `isOpen: boolean`, `onClose: () => void` |
| **Responsibility** | Development/testing feature for Smart Aisle Scan. Home screen with Live Camera Practice, Imported Test Sequence, Controlled Test Scenarios, Test Markers, Sensor Diagnostics, Test Results/Scorecard, and Test Data Cleanup. Wraps real SmartAisleScan in test_lab mode, and the browser harness validates start capture, hold-for-burst long-press no-selection behavior, pointer cancel/lost-capture interruption paths, release-to-pause Burst Complete feedback plus Reached the End stitching, and stitched-photo acceptance. Feature-gated via `VITE_ENABLE_SMART_AISLE_TEST_LAB` in dev builds only; production builds ignore the flag. |
| **Entry** | Settings > Developer Tools (only when flag enabled) |

