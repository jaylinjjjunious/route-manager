import { useState, useCallback } from 'react';
import type { ToolCall } from './assistantTypes';

export interface ConfirmationRequest {
  id: string;
  toolCall: ToolCall;
  message: string;
  resolve: (confirmed: boolean) => void;
}

export function useConfirmationStore() {
  const [pending, setPending] = useState<ConfirmationRequest | null>(null);

  const requestConfirmation = useCallback(
    (toolCall: ToolCall, message: string): Promise<boolean> => {
      return new Promise(resolve => {
        setPending({
          id: `confirm-${Date.now()}`,
          toolCall,
          message,
          resolve
        });
      });
    },
    []
  );

  const confirm = useCallback(() => {
    const req = pending;
    if (!req) return;
    setPending(null);
    req.resolve(true);
  }, [pending]);

  const dismiss = useCallback(() => {
    const req = pending;
    if (!req) return;
    setPending(null);
    req.resolve(false);
  }, [pending]);

  return { pending, requestConfirmation, confirm, dismiss };
}
