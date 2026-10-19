import { useState, useCallback, useRef } from 'react';
import type { AssistantMessage, ToolCall } from './assistantTypes';

import { getStorageOwner, readOwnedStorage, writeOwnedStorage, removeOwnedStorage } from '../utils/ownerStorage';

const STORAGE_KEY = 'assistant_conversation';
const MAX_MESSAGES = 100;

function loadMessages(): AssistantMessage[] {
  try {
    const raw = readOwnedStorage(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveMessages(messages: AssistantMessage[]): void {
  try {
    writeOwnedStorage(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
  } catch {}
}

export function useConversationStore() {
  const [messages, setMessages] = useState<AssistantMessage[]>(() => loadMessages());
  const idCounter = useRef(0);
  const owner = useRef(getStorageOwner());

  const addMessage = useCallback((msg: Omit<AssistantMessage, 'id' | 'timestamp'>) => {
    if (owner.current !== getStorageOwner()) return { ...msg, id: "discarded", timestamp: Date.now() } as AssistantMessage;
    idCounter.current += 1;
    const message: AssistantMessage = {
      ...msg,
      id: `msg-${Date.now()}-${idCounter.current}`,
      timestamp: Date.now()
    };
    setMessages(prev => {
      const next = [...prev, message];
      saveMessages(next);
      return next;
    });
    return message;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<AssistantMessage>) => {
    if (owner.current !== getStorageOwner()) return;
    setMessages(prev => {
      const next = prev.map(m => m.id === id ? { ...m, ...updates } : m);
      saveMessages(next);
      return next;
    });
  }, []);

  const clearMessages = useCallback(() => {
    if (owner.current !== getStorageOwner()) return;
    setMessages([]);
    removeOwnedStorage(STORAGE_KEY);
  }, []);

  const addUserMessage = useCallback((text: string) => {
    return addMessage({ type: 'user', text });
  }, [addMessage]);

  const addAssistantMessage = useCallback((text: string) => {
    return addMessage({ type: 'assistant', text });
  }, [addMessage]);

  const addToolProgress = useCallback((text: string) => {
    return addMessage({ type: 'tool-progress', text });
  }, [addMessage]);

  const addToolResult = useCallback((text: string) => {
    return addMessage({ type: 'tool-result', text });
  }, [addMessage]);

  const addErrorMessage = useCallback((text: string) => {
    return addMessage({ type: 'error', text });
  }, [addMessage]);

  const addActionCard = useCallback((text: string, action: ToolCall) => {
    return addMessage({
      type: 'action-card',
      text,
      action,
      actionStatus: 'pending'
    });
  }, [addMessage]);

  return {
    messages,
    addMessage,
    updateMessage,
    clearMessages,
    addUserMessage,
    addAssistantMessage,
    addToolProgress,
    addToolResult,
    addErrorMessage,
    addActionCard
  };
}
