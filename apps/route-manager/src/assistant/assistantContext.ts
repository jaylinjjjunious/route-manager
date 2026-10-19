import { createContext, useContext } from 'react';
import type { AssistantMessage, AssistantTool, AppContext, ToolCall } from './assistantTypes';

export interface AssistantContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: AssistantMessage[];
  sendMessage: (text: string) => Promise<void>;
  confirmAction: (messageId: string) => void;
  dismissAction: (messageId: string) => void;
  clearConversation: () => void;
  isLoading: boolean;
  tools: AssistantTool[];
  appContext: AppContext | null;
}

export const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return ctx;
}
