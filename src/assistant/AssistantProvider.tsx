import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { AssistantContext } from './assistantContext';
import { useConversationStore } from './conversationStore';
import { ToolRegistry } from './toolRegistry';
import { buildAppContext, type BuildContextInput } from './tools/contextBuilder';
import { createNavigationTools } from './tools/navigationTools';
import { createShowerGateTools } from './tools/showerGateTools';
import { createJobTools } from './tools/jobTools';
import { createBatteryTools } from './tools/batteryTools';
import { createWeatherTools } from './tools/weatherTools';
import { createTravelTools } from './tools/travelTools';
import { createProofTools } from './tools/proofTools';
import { createDebugTools } from './tools/debugTools';
import { sendToAssistant } from './assistantApi';
import { DEFAULT_ALLOWED_PERMISSIONS, CONFIRMED_ALLOWED_PERMISSIONS, checkPermission } from './permissionPolicy';
import type { AppContext, AssistantTool, ToolResult } from './assistantTypes';
import type { Job, EbikeConfig, RouteMetrics } from '../types';
import { isJobCompleted } from '../utils/jobState';

export interface AssistantProviderProps {
  children: ReactNode;
  jobs: Job[];
  routeAJobs: Job[];
  routeBJobs: Job[];
  currentBattery: number;
  ebikeConfig: EbikeConfig;
  activeMetrics: RouteMetrics;
  showerGateUnlocked: boolean;
  currentTab: string;
  theme: 'light' | 'dark';
  weatherWind: string;
  terrain: string;
  dayEarnings: number;
  onNavigate: (tab: string) => void;
  onOpenProofHistory: () => void;
  onOpenAddJob: () => void;
  onOptimizeRoute: () => void;
}

export default function AssistantProvider({
  children,
  jobs,
  routeAJobs,
  currentBattery,
  ebikeConfig,
  activeMetrics,
  showerGateUnlocked,
  currentTab,
  theme,
  weatherWind,
  terrain,
  dayEarnings,
  onNavigate,
  onOpenProofHistory,
  onOpenAddJob,
}: AssistantProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { messages, addUserMessage, addAssistantMessage, addToolProgress, addToolResult, addErrorMessage, addActionCard, updateMessage, clearMessages } = useConversationStore();
  const toolRegistryRef = useRef<ToolRegistry | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Store dynamic app state in refs so tool closures always read latest values
  const stateRef = useRef({
    jobs, routeAJobs, currentBattery, ebikeConfig, activeMetrics,
    showerGateUnlocked, currentTab, theme, weatherWind, terrain,
    dayEarnings, onNavigate, onOpenProofHistory, onOpenAddJob
  });
  stateRef.current = {
    jobs, routeAJobs, currentBattery, ebikeConfig, activeMetrics,
    showerGateUnlocked, currentTab, theme, weatherWind, terrain,
    dayEarnings, onNavigate, onOpenProofHistory, onOpenAddJob
  };

  // Build tool registry once — tool execute() reads from stateRef
  useEffect(() => {
    const registry = new ToolRegistry();
    const s = () => stateRef.current;

    const getCurrentStopName = () => {
      const next = s().routeAJobs.find(j => !isJobCompleted(j));
      return next?.storeName || null;
    };

    const getEstimatedRange = () =>
      Math.round((s().currentBattery / 100) * s().ebikeConfig.maxRangeMiles);

    const navigate: (tab: string) => void = (tab) => s().onNavigate(tab);
    const openProof: () => void = () => s().onOpenProofHistory();

    const navTools = createNavigationTools(navigate);
    const showerTools = createShowerGateTools(
      () => s().showerGateUnlocked,
      navigate
    );
    const jobTools = createJobTools(
      () => s().jobs,
      () => s().routeAJobs,
      () => getCurrentStopName(),
      navigate
    );
    const batteryTools = createBatteryTools(
      () => s().currentBattery,
      () => s().ebikeConfig,
      () => getEstimatedRange()
    );
    const weatherTools = createWeatherTools(
      () => s().weatherWind,
      () => s().terrain
    );
    const travelTools = createTravelTools(
      () => s().currentBattery,
      () => s().weatherWind,
      () => s().terrain,
      () => s().activeMetrics.totalTime,
      () => getEstimatedRange()
    );
    const proofTools = createProofTools(openProof);
    const debugTools = createDebugTools(
      () => navigator.onLine,
      () => s().currentTab
    );

    [...navTools, ...showerTools, ...jobTools, ...batteryTools,
     ...weatherTools, ...travelTools, ...proofTools, ...debugTools]
      .forEach(t => registry.register(t));

    toolRegistryRef.current = registry;
  }, []); // only once

  const buildContext = useCallback((): AppContext => {
    const s = stateRef.current;
    const next = s.routeAJobs.find(j => !isJobCompleted(j));
    return buildAppContext({
      jobs: s.jobs,
      routeAJobs: s.routeAJobs,
      currentBattery: s.currentBattery,
      showerGateUnlocked: s.showerGateUnlocked,
      currentTab: s.currentTab,
      theme: s.theme,
      weatherWind: s.weatherWind,
      terrain: s.terrain,
      ebikeConfig: s.ebikeConfig,
      activeMetrics: s.activeMetrics,
      onlineStatus: navigator.onLine,
      dayEarnings: s.dayEarnings,
      currentStopName: next?.storeName || null
    });
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (isLoading) return;
    setIsLoading(true);

    const userMsg = addUserMessage(text);

    try {
      const context = buildContext();
      const history = messages
        .filter(m => m.type === 'user' || m.type === 'assistant')
        .slice(-10)
        .map(m => ({
          role: m.type as 'user' | 'assistant',
          text: m.text
        }));

      const progressMsg = addToolProgress('Processing your request...');

      abortRef.current = new AbortController();

      const result = await sendToAssistant(text, context, history);

      updateMessage(progressMsg.id, { type: 'tool-result', text: '' });

      if (result.toolCalls && result.toolCalls.length > 0) {
        const toolCall = result.toolCalls[0];
        const tool = toolRegistryRef.current?.get(toolCall.tool);

        if (!tool) {
          addAssistantMessage(result.response || `I understood, but "${toolCall.tool}" is not available.`);
        } else if (!checkPermission(tool, DEFAULT_ALLOWED_PERMISSIONS) || tool.requiresConfirmation) {
          addActionCard(
            result.response || `Would you like me to ${tool.description.toLowerCase()}?`,
            { tool: toolCall.tool, input: toolCall.input, confirmationText: toolCall.confirmationText }
          );
        } else {
          addAssistantMessage(result.response || '');
          await executeTool(tool, toolCall.input);
        }
      } else {
        addAssistantMessage(result.response || 'I processed your request.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      addErrorMessage(message);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [isLoading, addUserMessage, addAssistantMessage, addToolProgress, addToolResult, addErrorMessage, addActionCard, updateMessage, buildContext, messages]);

  const executeTool = useCallback(async (tool: AssistantTool, input: Record<string, unknown>) => {
    const progressMsg = addToolProgress(`Running: ${tool.name}...`);
    const result = await tool.execute(input);
    updateMessage(progressMsg.id, {
      type: result.success ? 'tool-result' : 'error',
      text: result.output
    });
  }, [addToolProgress, addToolResult, updateMessage]);

  const confirmAction = useCallback(async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg?.action) return;

    updateMessage(messageId, { actionStatus: 'executing' });

    const tool = toolRegistryRef.current?.get(msg.action.tool);
    if (!tool) {
      updateMessage(messageId, {
        actionStatus: 'error',
        actionResult: `Tool "${msg.action.tool}" not available.`
      });
      return;
    }

    if (!checkPermission(tool, CONFIRMED_ALLOWED_PERMISSIONS)) {
      updateMessage(messageId, {
        actionStatus: 'error',
        actionResult: 'This action requires modify permission which is not available.'
      });
      return;
    }

    const result = await tool.execute(msg.action.input);
    updateMessage(messageId, {
      actionStatus: result.success ? 'done' : 'error',
      actionResult: result.output
    });
  }, [messages, updateMessage]);

  const dismissAction = useCallback((messageId: string) => {
    updateMessage(messageId, { actionStatus: 'rejected' });
  }, [updateMessage]);

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        setIsOpen,
        messages,
        sendMessage,
        confirmAction,
        dismissAction,
        clearConversation: clearMessages,
        isLoading,
        tools: toolRegistryRef.current?.getAll() || [],
        appContext: buildContext()
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}
