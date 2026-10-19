import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { useAssistant } from './assistantContext';

const QUICK_PROMPTS = [
  'Plan my workday',
  'Check travel risk',
  'Which job should I do next?',
  'Check Shower Gate',
  'Check battery range',
  'Open Proof History',
  'Diagnose an app problem'
];

export default function AssistantComposer() {
  const { sendMessage, isLoading } = useAssistant();
  const [input, setInput] = useState('');
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    setShowQuickPrompts(false);
    sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput('');
    setShowQuickPrompts(false);
    sendMessage(prompt);
  };

  return (
    <div
      className="shrink-0 border-t border-white/[0.06] p-3 sm:p-3"
      style={{
        background: 'rgba(10, 16, 14, 0.60)',
        WebkitBackdropFilter: 'blur(14px)',
        backdropFilter: 'blur(14px)',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      {showQuickPrompts && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={12} className="text-white/30" />
            <p className="text-[10px] font-black uppercase tracking-wider text-white/30">Quick prompts</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleQuickPrompt(prompt)}
                disabled={isLoading}
                className="rounded-[8px] bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-black text-white/60 transition hover:bg-white/10 disabled:opacity-40"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          disabled={isLoading}
          className="min-h-11 flex-1 rounded-[8px] border border-white/[0.08] bg-white/[0.05] px-3 text-sm font-black text-white/90 outline-none transition focus:border-white/20 disabled:opacity-50"
          style={{ WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="flex min-h-11 w-11 items-center justify-center rounded-[8px] bg-white/10 text-white transition hover:bg-white/15 disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
