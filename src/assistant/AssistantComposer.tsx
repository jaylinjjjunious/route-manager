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
      className="border-t border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-black/20 sm:p-3"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
    >
      {showQuickPrompts && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={12} className="text-blue-600 dark:text-blue-400" />
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Quick prompts</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleQuickPrompt(prompt)}
                disabled={isLoading}
                className="rounded-[8px] bg-slate-100 px-2.5 py-1.5 text-[11px] font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-40 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
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
          className="min-h-11 flex-1 rounded-[8px] border-2 border-slate-300 bg-white px-3 text-sm font-black text-slate-950 outline-none transition focus:border-blue-700 disabled:opacity-50 dark:border-white/10 dark:bg-black/30 dark:text-white"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="flex min-h-11 w-11 items-center justify-center rounded-[8px] bg-blue-700 text-white transition hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
