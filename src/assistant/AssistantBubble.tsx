import { Bot, X } from 'lucide-react';
import { useAssistant } from './assistantContext';
import AssistantPanel from './AssistantPanel';

export default function AssistantBubble() {
  const { isOpen, setIsOpen } = useAssistant();

  return (
    <>
      {/* Panel overlay + drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col sm:bottom-24 sm:left-auto sm:right-4 sm:top-auto sm:z-[100] sm:h-[600px] sm:max-h-[80vh] sm:w-[400px] sm:rounded-[16px] sm:border sm:border-slate-200 sm:shadow-2xl dark:sm:border-white/10">
          {/* Backdrop (mobile only) */}
          <div
            className="absolute inset-0 bg-black/40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-10 mt-auto flex h-[85vh] flex-col rounded-t-2xl border-2 border-slate-200 bg-white shadow-2xl sm:mt-0 sm:h-full sm:rounded-[16px] dark:border-white/10 dark:bg-slate-950">
            <AssistantPanel />
          </div>
        </div>
      )}

      {/* Bubble button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-white shadow-2xl transition hover:bg-blue-600 hover:scale-105 active:scale-95 sm:bottom-8"
          style={{
            padding: 0,
            WebkitTapHighlightColor: 'transparent'
          }}
          aria-label="Open AI Assistant"
        >
          <Bot size={26} />
        </button>
      )}
    </>
  );
}
