export type AssistantPermission = 'read' | 'navigate' | 'modify';
export type AssistantMessageType = 'user' | 'assistant' | 'tool-progress' | 'tool-result' | 'error' | 'action-card';

export interface AssistantMessage {
  id: string;
  type: AssistantMessageType;
  text: string;
  timestamp: number;
  action?: ToolCall;
  actionStatus?: 'pending' | 'confirmed' | 'rejected' | 'executing' | 'done' | 'error';
  actionResult?: string;
  isStreaming?: boolean;
}

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  confirmationText?: string;
}

export interface ToolResult {
  success: boolean;
  output: string;
  data?: unknown;
}

export interface AssistantTool<TOutput = unknown> {
  name: string;
  description: string;
  permission: AssistantPermission;
  requiresConfirmation: boolean;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<ToolResult>;
}

export interface AppContext {
  currentPage: string;
  localTime: string;
  cycleId: string;
  showerGateComplete: boolean;
  showerGateLabel: string;
  nextShowerReset: string;
  protectedPagesLocked: boolean;
  jobCount: number;
  remainingJobCount: number;
  nextJobName: string | null;
  batteryPercent: number;
  estimatedRange: number;
  weatherWind: string;
  terrain: string;
  routeActive: boolean;
  onlineStatus: boolean;
  theme: string;
  dayEarnings: number;
}

export interface AssistantConfig {
  apiEndpoint: string;
  context: AppContext;
  onNavigate: (tab: string) => void;
  onOpenProofHistory: () => void;
  onOpenAddJob: () => void;
  theme: 'light' | 'dark';
}
