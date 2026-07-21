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
        <Sparkles size={40} className="text-slate-300 dark:text-slate-600" />
        <p className="mt-4 text-lg font-black text-slate-400 dark:text-slate-500">AI Operations Assistant</p>
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">Ask me anything about your route, jobs, or settings.</p>
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
                        : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200'
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
                className={`max-w-[85%] rounded-[8px] border-2 p-3 ${
                  msg.type === 'user'
                    ? 'border-blue-700 bg-blue-700 text-white'
                    : msg.type === 'error'
                      ? 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100'
                      : msg.type === 'tool-progress'
                        ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'
                        : 'border-slate-200 bg-slate-50 text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white'
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
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200">
            <Bot size={16} />
          </div>
          <div className="max-w-[85%] rounded-[8px] border-2 border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-slate-500" />
              <p className="text-sm font-black text-slate-500 dark:text-slate-400">Thinking...</p>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
