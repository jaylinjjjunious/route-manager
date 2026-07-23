import { useEffect, useRef } from 'react';
import { Bot, User, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import type { AssistantMessage } from './assistantTypes';
import AssistantActionCard from './AssistantActionCard';

interface Props {
  messages: AssistantMessage[];
  onConfirmAction: (messageId: string) => void;
  onDismissAction: (messageId: string) => void;
  isLoading: boolean;
}

export default function AssistantMessageList({ messages, onConfirmAction, onDismissAction, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <Sparkles size={40} className="text-emerald-400/40" />
        <p className="mt-4 text-lg font-black text-emerald-200/60">AI Operations Assistant</p>
        <p className="mt-2 text-sm text-emerald-300/40">Ask me anything about your route, jobs, or settings.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {messages.map(msg => (
        <div key={msg.id}>
          {msg.type === 'action-card' ? (
            <div className="mr-auto max-w-[92%]">
              <AssistantActionCard
                message={msg}
                onConfirm={() => onConfirmAction(msg.id)}
                onDismiss={() => onDismissAction(msg.id)}
              />
            </div>
          ) : (
            <div
              className={`flex gap-2 ${
                msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  msg.type === 'user'
                    ? 'bg-blue-700 text-white'
                    : msg.type === 'error'
                      ? 'bg-rose-600 text-white'
                      : msg.type === 'tool-progress'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-emerald-700/40 text-emerald-200'
                }`}
              >
                {msg.type === 'user' ? (
                  <User size={16} />
                ) : msg.type === 'error' ? (
                  <AlertCircle size={16} />
                ) : msg.type === 'tool-progress' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Bot size={16} />
                )}
              </div>
              <div
                className={`max-w-[85%] rounded-[8px] border p-3 ${
                  msg.type === 'user'
                    ? 'border-blue-600 bg-blue-700 text-white'
                    : msg.type === 'error'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-100'
                      : msg.type === 'tool-progress'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                        : 'border-emerald-500/20 bg-emerald-900/40 text-emerald-50'
                }`}
              >
                {msg.isStreaming ? (
                  <div className="flex items-center gap-2">
                    <span className="typing-dot h-2 w-2 animate-pulse rounded-full bg-current" />
                    <span className="typing-dot h-2 w-2 animate-pulse rounded-full bg-current" style={{ animationDelay: '0.2s' }} />
                    <span className="typing-dot h-2 w-2 animate-pulse rounded-full bg-current" style={{ animationDelay: '0.4s' }} />
                  </div>
                ) : (
                  <p className="whitespace-pre-line text-sm font-black leading-snug">{msg.text}</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700/40 text-emerald-200">
            <Bot size={16} />
          </div>
          <div className="max-w-[85%] rounded-[8px] border border-emerald-500/20 bg-emerald-900/40 p-3">
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-emerald-400" />
              <p className="text-sm font-black text-emerald-300/70">Thinking...</p>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
