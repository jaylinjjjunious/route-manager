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
      className="flex flex-col"
      style={{
        height: '100%',
        maxHeight: '100%'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black/30">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-blue-700 text-white">
            <Bot size={16} />
          </div>
          <div>
            <p className="text-sm font-black uppercase text-slate-950 dark:text-white">Assistant</p>
            <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
              {isLoading ? 'Thinking...' : 'Operations'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearConversation}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
            title="Clear conversation"
          >
            <Trash2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
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
