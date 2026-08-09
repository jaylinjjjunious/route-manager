import { Camera, FileImage, ReceiptText, StickyNote, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ProofAssetKind, ProofRecord } from './types';

interface ProofVaultModalProps {
  selectedProofRecord: ProofRecord;
  onClose: () => void;
  onAddAssets: (jobId: string, kind: ProofAssetKind, files: FileList | null) => void;
  onUpdateNotes: (jobId: string, notes: string) => void;
}

const proofSections: [ProofAssetKind, string, LucideIcon][] = [
  ['photos', 'Photos', Camera],
  ['screenshots', 'Screenshots', FileImage],
  ['receipts', 'Receipts', ReceiptText],
];

export default function ProofVaultModal({
  selectedProofRecord,
  onClose,
  onAddAssets,
  onUpdateNotes,
}: ProofVaultModalProps) {
  const evidenceCount =
    selectedProofRecord.photos.length +
    selectedProofRecord.screenshots.length +
    selectedProofRecord.receipts.length;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[8px] border-2 border-slate-300 bg-white p-5 shadow-2xl dark:border-white/20 dark:bg-[#17181b]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-white/10">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Proof Folder</p>
            <h3 className="text-4xl font-black text-slate-950 dark:text-white">{selectedProofRecord.storeName}</h3>
            <p className="text-lg font-black text-slate-600 dark:text-slate-300">{selectedProofRecord.address}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-slate-950 text-white dark:bg-white dark:text-slate-950"
            aria-label="Close proof folder"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-[8px] bg-slate-100 p-3 dark:bg-white/10">
            <p className="text-sm font-black uppercase text-slate-500">Completion Time</p>
            <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{new Date(selectedProofRecord.completionTime).toLocaleString()}</p>
          </div>
          <div className="rounded-[8px] bg-slate-100 p-3 dark:bg-white/10">
            <p className="text-sm font-black uppercase text-slate-500">Arrival Time</p>
            <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{new Date(selectedProofRecord.arrivalTime).toLocaleString()}</p>
          </div>
          <div className="rounded-[8px] bg-slate-100 p-3 dark:bg-white/10">
            <p className="text-sm font-black uppercase text-slate-500">GPS</p>
            <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
              {selectedProofRecord.gps ? `${selectedProofRecord.gps.lat.toFixed(4)}, ${selectedProofRecord.gps.lng.toFixed(4)}` : 'Optional'}
            </p>
          </div>
          <div className="rounded-[8px] bg-slate-100 p-3 dark:bg-white/10">
            <p className="text-sm font-black uppercase text-slate-500">Evidence Count</p>
            <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
              {evidenceCount} files
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {proofSections.map(([kind, label, Icon]) => (
            <section key={kind} className="rounded-[8px] border-2 border-slate-200 p-4 dark:border-white/10">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon size={22} className="text-blue-700 dark:text-blue-300" />
                  <h4 className="text-xl font-black text-slate-950 dark:text-white">{label}</h4>
                </div>
                <span className="rounded-[8px] bg-slate-100 px-2 py-1 text-sm font-black dark:bg-white/10">
                  {selectedProofRecord[kind].length}
                </span>
              </div>
              <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center rounded-[8px] bg-blue-700 px-3 text-base font-black uppercase text-white transition hover:bg-blue-600">
                Add {label}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    onAddAssets(selectedProofRecord.jobId, kind, event.target.files);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {selectedProofRecord[kind].map(asset => (
                  <a
                    key={asset.id}
                    href={asset.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[8px] border border-slate-200 bg-slate-50 p-2 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                  >
                    {asset.dataUrl.startsWith('data:image') && (
                      <img src={asset.dataUrl} alt={asset.name} className="mb-2 aspect-square w-full rounded-[8px] object-cover" />
                    )}
                    <span className="block truncate">{asset.name}</span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-5 rounded-[8px] border-2 border-slate-200 p-4 dark:border-white/10">
          <div className="mb-3 flex items-center gap-2">
            <StickyNote size={22} className="text-blue-700 dark:text-blue-300" />
            <h4 className="text-xl font-black text-slate-950 dark:text-white">Notes</h4>
          </div>
          <textarea
            value={selectedProofRecord.notes}
            onChange={(event) => onUpdateNotes(selectedProofRecord.jobId, event.target.value)}
            placeholder="Add details, disputes, manager names, app confirmation notes, or anything you may need later."
            className="min-h-32 w-full rounded-[8px] border-2 border-slate-300 bg-white p-3 text-base font-bold text-slate-950 outline-none focus:border-blue-700 dark:border-white/10 dark:bg-black/20 dark:text-white"
          />
        </section>
      </div>
    </div>
  );
}
