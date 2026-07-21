# UI Components

**Last Updated:** 2026-07-21 (assistant-mobile-fullscreen-fix)
**Related Source Files:** `src/components/*.tsx`, `src/assistant/*.tsx`

---

## Component Reference

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
| **AssistantBubble** | `src/assistant/AssistantBubble.tsx` | Floating chat button + full-screen panel wrapper. On mobile: fills entire viewport (`h-dvh`). On desktop (≥640px): 400×600px floating drawer in bottom-right. |
| **AssistantPanel** | `src/assistant/AssistantPanel.tsx` | Expandable chat panel with header, messages, composer |
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
| **Responsibility** | Chat-style operations console rendered in the Route tab. Uses keyword matching (not real AI). Being superseded by the new AI Operations Assistant bubble. |

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
