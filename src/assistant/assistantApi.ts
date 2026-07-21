import { authFetch } from '../services/apiClient';
import type { AppContext } from './assistantTypes';

export interface AssistantApiResponse {
  response: string;
  toolCalls?: Array<{
    tool: string;
    input: Record<string, unknown>;
    confirmationText?: string;
  }>;
}

export async function sendToAssistant(
  message: string,
  context: AppContext,
  history: Array<{ role: 'user' | 'assistant'; text: string }>
): Promise<AssistantApiResponse> {
  const body = {
    message,
    context,
    history: history.slice(-20)
  };

  const res = await authFetch('/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Server error' }));
    throw new Error(err.error || `Request failed with ${res.status}`);
  }

  return res.json();
}
