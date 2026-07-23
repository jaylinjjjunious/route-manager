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
      className="flex h-full min-h-0 flex-col sm:rounded-[16px] sm:border sm:border-emerald-500/20 sm:shadow-2xl"
      style={{
        background: 'linear-gradient(145deg, rgba(8, 48, 34, 0.84), rgba(4, 28, 22, 0.72))',
        WebkitBackdropFilter: 'blur(22px) saturate(135%)',
        backdropFilter: 'blur(22px) saturate(135%)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(185, 255, 218, 0.08)',
      }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between border-b border-emerald-500/15 px-4 py-3"
        style={{
          background: 'rgba(6, 36, 26, 0.7)',
          WebkitBackdropFilter: 'blur(16px)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-emerald-600 text-white">
            <Bot size={16} />
          </div>
          <div>
            <p className="text-sm font-black uppercase text-emerald-50">Assistant</p>
            <p className="text-[10px] font-black uppercase text-emerald-300/60">
              {isLoading ? 'Thinking...' : 'Operations'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearConversation}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-emerald-300/60 transition hover:bg-white/10 hover:text-emerald-200"
            title="Clear conversation"
          >
            <Trash2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-emerald-300/60 transition hover:bg-white/10 hover:text-emerald-200"
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
