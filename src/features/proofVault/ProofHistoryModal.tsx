import { useEffect, useRef } from 'react';
import { FolderOpen, X } from 'lucide-react';
import type { ProofRecord } from './types';

interface ProofHistoryModalProps {
  records: ProofRecord[];
  onSelect: (jobId: string) => void;
  onClose: () => void;
}

export default function ProofHistoryModal({ records, onSelect, onClose }: ProofHistoryModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', handleKey);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby="proof-history-title">
      <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/20 dark:bg-[#17181b]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="proof-history-title" className="text-2xl font-black text-slate-950 dark:text-white">Proof Vault</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{records.length} job {records.length === 1 ? 'folder' : 'folders'} · Saved on this device</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close proof vault"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10 dark:text-white"><X size={22} /></button>
        </div>
        {records.length === 0 ? (
          <div className="mt-5 rounded-lg bg-slate-100 p-5 dark:bg-white/5">
            <p className="font-bold text-slate-950 dark:text-white">No proof folders yet</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Folders appear when a job is completed or job evidence is saved. Your photos, screenshots, receipts, and notes will be available here.</p>
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {records.map(record => (
              <li key={record.jobId}>
                <button type="button" onClick={() => onSelect(record.jobId)}
                  className="flex min-h-20 w-full items-center gap-3 rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5">
                  <FolderOpen className="shrink-0 text-blue-600 dark:text-blue-300" size={24} />
                  <span className="min-w-0">
                    <span className="block font-bold text-slate-950 dark:text-white">{record.storeName}</span>
                    <span className="block break-words text-sm text-slate-600 dark:text-slate-300">{record.address}</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{record.photos.length + record.screenshots.length + record.receipts.length} files · Updated {new Date(record.updatedAt).toLocaleDateString()}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
