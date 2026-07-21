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
          <div
            className="relative z-10 mt-auto flex flex-col rounded-t-2xl border-2 border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:mt-0 sm:h-full sm:rounded-[16px]"
            style={{
              height: 'max(75vh, calc(100vh - 120px - env(safe-area-inset-bottom, 0px)))',
              maxHeight: '85vh',
            }}
          >
            <AssistantPanel />
          </div>
        </div>
      )}

      {/* Bubble button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed right-4 z-[95] flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-white shadow-2xl transition hover:bg-blue-600 hover:scale-105 active:scale-95 sm:bottom-8"
          style={{
            bottom: 'max(5.5rem, calc(5.5rem + env(safe-area-inset-bottom, 0px)))',
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
