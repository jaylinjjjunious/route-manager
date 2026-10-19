import { AlertTriangle, Check, X } from 'lucide-react';
import type { AssistantMessage } from './assistantTypes';

interface Props {
  message: AssistantMessage;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function AssistantActionCard({ message, onConfirm, onDismiss }: Props) {
  const isDone = message.actionStatus === 'done' || message.actionStatus === 'error';

  if (isDone) {
    const isError = message.actionStatus === 'error';
    return (
      <div className={`rounded-[8px] border-2 p-3 ${
        isError
          ? 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100'
          : 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'
      }`}>
        <p className="whitespace-pre-line text-sm font-black leading-snug">{message.actionResult}</p>
      </div>
    );
  }

  if (message.actionStatus === 'executing') {
    return (
      <div className="rounded-[8px] border-2 border-blue-200 bg-blue-50 p-3 text-blue-950 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
        <p className="text-sm font-black">Executing action...</p>
      </div>
    );
  }

  if (message.actionStatus === 'rejected') {
    return (
      <div className="rounded-[8px] border border-white/[0.08] bg-white/[0.04] p-3 text-white/40">
        <p className="text-sm font-black">Action dismissed.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[8px] border-2 border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex items-start gap-2">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-200">Action Required</p>
          {message.text && (
            <p className="mt-1 text-sm font-black text-amber-950 dark:text-amber-50">{message.text}</p>
          )}
          {message.action?.confirmationText && (
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200/80">{message.action.confirmationText}</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="flex min-h-9 items-center gap-1.5 rounded-[8px] bg-amber-600 px-4 text-xs font-black uppercase text-white transition hover:bg-amber-500"
        >
          <Check size={14} />
          <span>Confirm</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex min-h-9 items-center gap-1.5 rounded-[8px] border border-white/[0.10] bg-white/[0.06] px-4 text-xs font-black uppercase text-white/60 transition hover:bg-white/10"
        >
          <X size={14} />
          <span>Dismiss</span>
        </button>
      </div>
    </div>
  );
}
