import { Bot, X } from 'lucide-react';
import { useAssistant } from './assistantContext';
import AssistantPanel from './AssistantPanel';

export default function AssistantBubble() {
  const { isOpen, setIsOpen } = useAssistant();

  return (
    <>
      {/* Panel overlay + drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex h-dvh flex-col sm:bottom-24 sm:h-[600px] sm:left-auto sm:max-h-[80vh] sm:right-4 sm:top-auto sm:w-[400px] sm:rounded-[16px]"
          style={{
            background: 'rgba(6, 10, 10, 0.40)',
            WebkitBackdropFilter: 'blur(8px)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <AssistantPanel />
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
