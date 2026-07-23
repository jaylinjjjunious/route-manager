import { X, Bot, Trash2 } from 'lucide-react';
import AssistantMessageList from './AssistantMessageList';
import AssistantComposer from './AssistantComposer';
import { useAssistant } from './assistantContext';

export default function AssistantPanel() {
  const {
    setIsOpen,
    messages,
    confirmAction,
    dismissAction,
    clearConversation,
    isLoading
  } = useAssistant();

  return (
    <div
      className="flex h-full min-h-0 flex-col sm:rounded-[16px] sm:border sm:border-white/[0.07] sm:shadow-2xl"
      style={{
        background: 'linear-gradient(145deg, rgba(18, 28, 24, 0.58), rgba(10, 18, 16, 0.46))',
        WebkitBackdropFilter: 'blur(18px) saturate(120%)',
        backdropFilter: 'blur(18px) saturate(120%)',
        boxShadow: '0 18px 48px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3"
        style={{
          background: 'rgba(12, 20, 18, 0.55)',
          WebkitBackdropFilter: 'blur(14px)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-white/10 text-emerald-300">
            <Bot size={16} />
          </div>
          <div>
            <p className="text-sm font-black uppercase text-white/90">Assistant</p>
            <p className="text-[10px] font-black uppercase text-white/40">
              {isLoading ? 'Thinking...' : 'Operations'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearConversation}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-white/35 transition hover:bg-white/8 hover:text-white/60"
            title="Clear conversation"
          >
            <Trash2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-white/35 transition hover:bg-white/8 hover:text-white/60"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <AssistantMessageList
        messages={messages}
        onConfirmAction={confirmAction}
        onDismissAction={dismissAction}
        isLoading={isLoading}
      />

      {/* Composer */}
      <AssistantComposer />
    </div>
  );
}
