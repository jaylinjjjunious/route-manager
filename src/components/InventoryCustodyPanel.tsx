import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  CircleDot,
  FileText,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
  Wrench,
} from 'lucide-react';
import type { Job } from '../types';
import {
  appendCustodyEvent,
  createCustodyEvent,
  emptyCustodyLedger,
  fileToCustodyEvidence,
  flushCustodySyncQueue,
  getCurrentCoordinates,
  loadCustodyLedger,
  type CustodyEventType,
  type CustodyEvidence,
  type CustodyItem,
  type CustodyLedger,
  verifyCustodyLedger,
  GENESIS_HASH,
} from '../services/inventory/chainOfCustody';

interface InventoryCustodyPanelProps {
  job: Job;
}

type ActionType = Exclude<CustodyEventType, 'receive_in'>;

function makeLocalId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function statusLabel(status: CustodyItem['status']): string {
  return status === 'received' ? 'Received' : status === 'installed' ? 'Installed' : status === 'removed' ? 'Removed' : 'Returned';
}

function eventLabel(type: CustodyEventType): string {
  return type === 'receive_in' ? 'Receive-in' : type === 'install' ? 'Install' : type === 'removal' ? 'Removal' : 'Return';
}

export default function InventoryCustodyPanel({ job }: InventoryCustodyPanelProps) {
  const [ledger, setLedger] = useState<CustodyLedger>(() => loadCustodyLedger(job.id));
  const [partNumber, setPartNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receivePhoto, setReceivePhoto] = useState<CustodyEvidence | null>(null);
  const [receiveDocuments, setReceiveDocuments] = useState<CustodyEvidence[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [returnReceipt, setReturnReceipt] = useState('');
  const [returnTracking, setReturnTracking] = useState('');
  const [actionEvidence, setActionEvidence] = useState<CustodyEvidence | null>(null);
  const [actionDocuments, setActionDocuments] = useState<CustodyEvidence[]>([]);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [ledgerValid, setLedgerValid] = useState(true);
  const receivePhotoInputRef = useRef<HTMLInputElement>(null);

  const activeItems = useMemo(() => ledger.items.filter(item => item.status !== 'returned'), [ledger.items]);
  const activeItem = activeItems.find(item => item.id === activeItemId) || activeItems[0] || null;

  useEffect(() => {
    let mounted = true;
    void verifyCustodyLedger(ledger).then(result => {
      if (mounted) setLedgerValid(result.valid);
    });
    return () => { mounted = false; };
  }, [ledger]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void flushCustodySyncQueue().then(result => {
        if (result.synced > 0) setMessage(`${result.synced} custody event${result.synced === 1 ? '' : 's'} queued for sync.`);
      });
    };
    const handleOffline = () => setIsOnline(false);
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'inventory-custody-sync') handleOnline();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    void flushCustodySyncQueue();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  const handleReceivePhoto = async (file?: File) => {
    if (!file) return;
    try {
      setReceivePhoto(await fileToCustodyEvidence(file, 'photo'));
      setMessage('Item photo ready. Confirm the part and serial to receive it.');
    } catch {
      setMessage('The item photo could not be read. Try the camera again.');
    }
  };

  const handleReceiveDocuments = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      setReceiveDocuments(await Promise.all(Array.from(files).map(file => fileToCustodyEvidence(file, 'document'))));
    } catch {
      setMessage('One or more documents could not be read.');
    }
  };

  const appendAction = async (type: ActionType, item: CustodyItem, options: { receiptNumber?: string; trackingNumber?: string } = {}) => {
    setIsSaving(true);
    const coordinates = await getCurrentCoordinates();
    const evidence = [...(actionEvidence ? [actionEvidence] : []), ...actionDocuments];
    const previousHash = ledger.events[ledger.events.length - 1]?.hash || GENESIS_HASH;
    const event = await createCustodyEvent({
      jobId: job.id,
      itemId: item.id,
      type,
      partNumber: item.partNumber,
      serialNumber: item.serialNumber,
      coordinates,
      evidenceIds: evidence.map(entry => entry.id),
      receiptNumber: options.receiptNumber,
      trackingNumber: options.trackingNumber,
      previousHash,
    });
    const next = appendCustodyEvent(ledger, event, { ...item, evidence: [...item.evidence, ...evidence] });
    setLedger(next);
    setActionEvidence(null);
    setActionDocuments([]);
    setReturnReceipt('');
    setReturnTracking('');
    setMessage(`${eventLabel(type)} saved ${coordinates ? 'with GPS' : 'without GPS'}.`);
    setIsSaving(false);
  };

  const handleReceive = async () => {
    if (!partNumber.trim() || !serialNumber.trim() || !receivePhoto) {
      setMessage('Capture the item photo and enter both the part number and serial number.');
      receivePhotoInputRef.current?.click();
      return;
    }
    setIsSaving(true);
    const itemId = makeLocalId('inventory-item');
    const evidence = [receivePhoto, ...receiveDocuments];
    const coordinates = await getCurrentCoordinates();
    const event = await createCustodyEvent({
      jobId: job.id,
      itemId,
      type: 'receive_in',
      partNumber,
      serialNumber,
      coordinates,
      evidenceIds: evidence.map(entry => entry.id),
      notes: receiveNotes,
      previousHash: ledger.events[ledger.events.length - 1]?.hash || GENESIS_HASH,
    });
    const item: CustodyItem = {
      id: itemId,
      jobId: job.id,
      partNumber: partNumber.trim(),
      serialNumber: serialNumber.trim(),
      status: 'received',
      evidence,
      eventIds: [],
      updatedAt: event.occurredAt,
    };
    const next = appendCustodyEvent(ledger, event, item);
    setLedger(next);
    setActiveItemId(itemId);
    setPartNumber('');
    setSerialNumber('');
    setReceiveNotes('');
    setReceivePhoto(null);
    setReceiveDocuments([]);
    setMessage(`Item received ${coordinates ? 'with GPS' : 'without GPS'} and queued for sync.`);
    setIsSaving(false);
  };

  const handleActionEvidence = async (file?: File) => {
    if (!file) return;
    try {
      setActionEvidence(await fileToCustodyEvidence(file, 'photo'));
    } catch {
      setMessage('The event photo could not be read.');
    }
  };

  return (
    <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-3">
      <div className="flex items-start gap-2">
        <div className="rounded-lg bg-cyan-500/15 p-2 text-cyan-300"><PackageCheck size={16} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-200">Inventory custody</h3>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${isOnline ? 'text-emerald-300' : 'text-amber-300'}`}>
              <CircleDot size={10} /> {isOnline ? 'Online' : 'Offline queue'}
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${ledgerValid ? 'text-emerald-300' : 'text-rose-300'}`}>
              <ShieldCheck size={10} /> {ledgerValid ? 'History verified' : 'History needs review'}
            </span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">Receive, install, remove, and return the same item without losing its evidence trail.</p>
        </div>
      </div>

      <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/10 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Receive-in</p>
          <button type="button" onClick={() => receivePhotoInputRef.current?.click()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-cyan-600 px-2.5 text-[10px] font-black text-white hover:bg-cyan-500">
            <Camera size={13} /> {receivePhoto ? 'Retake item photo' : 'Capture item'}
          </button>
          <input ref={receivePhotoInputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={event => { void handleReceivePhoto(event.target.files?.[0]); event.currentTarget.value = ''; }} />
        </div>
        {receivePhoto && <img src={receivePhoto.dataUrl} alt="Captured inventory item" className="h-24 w-full rounded-lg object-cover" />}
        <div className="grid grid-cols-2 gap-2">
          <input value={partNumber} onChange={event => setPartNumber(event.target.value)} placeholder="Part number" className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
          <input value={serialNumber} onChange={event => setSerialNumber(event.target.value)} placeholder="Serial number" className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
        </div>
        <textarea value={receiveNotes} onChange={event => setReceiveNotes(event.target.value)} placeholder="Optional receiving note" rows={2} className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
        <label className="flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 px-2 text-[10px] font-bold text-slate-400 hover:border-cyan-400 hover:text-cyan-200">
          <FileText size={13} /> Attach receiving document
          <input className="hidden" type="file" multiple accept="image/*,.pdf,.txt,.csv" onChange={event => { void handleReceiveDocuments(event.target.files); event.currentTarget.value = ''; }} />
        </label>
        <button type="button" disabled={isSaving} onClick={() => { void handleReceive(); }} className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-950 hover:bg-cyan-50 disabled:opacity-50">
          <PackageCheck size={14} /> Receive item and start custody history
        </button>
      </div>

      {activeItems.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active items</p>
          {activeItems.map(item => (
            <div key={item.id} className="rounded-lg border border-white/10 bg-black/10 p-2.5">
              <button type="button" onClick={() => setActiveItemId(item.id)} className="flex w-full items-start justify-between gap-2 text-left">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black text-white">{item.partNumber}</span>
                  <span className="block truncate text-[10px] text-slate-400">S/N {item.serialNumber} · {item.eventIds.length} events</span>
                </span>
                <span className="shrink-0 rounded-md border border-cyan-500/20 px-2 py-1 text-[10px] font-black text-cyan-200">{statusLabel(item.status)}</span>
              </button>
              {activeItem?.id === item.id && (
                <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={isSaving || item.status !== 'received'} onClick={() => { void appendAction('install', item); }} className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 text-[10px] font-black text-emerald-200 disabled:opacity-40"><Wrench size={12} /> Install</button>
                    <button type="button" disabled={isSaving || item.status !== 'installed'} onClick={() => { void appendAction('removal', item); }} className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 text-[10px] font-black text-amber-200 disabled:opacity-40"><RefreshCw size={12} /> Remove</button>
                  </div>
                  <label className="flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 text-[10px] font-bold text-slate-400 hover:text-cyan-200">
                    <Camera size={12} /> Add event photo
                    <input className="hidden" type="file" accept="image/*" capture="environment" onChange={event => { void handleActionEvidence(event.target.files?.[0]); event.currentTarget.value = ''; }} />
                  </label>
                  {actionEvidence && <p className="text-[10px] text-emerald-300">Event photo ready.</p>}
                  <label className="flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 text-[10px] font-bold text-slate-400 hover:text-cyan-200">
                    <FileText size={12} /> Add event document
                    <input className="hidden" type="file" multiple accept="image/*,.pdf,.txt,.csv" onChange={async event => { if (event.target.files?.length) setActionDocuments(await Promise.all(Array.from(event.target.files).map(file => fileToCustodyEvidence(file, 'document')))); event.currentTarget.value = ''; }} />
                  </label>
                  {actionDocuments.length > 0 && <p className="text-[10px] text-emerald-300">{actionDocuments.length} event document{actionDocuments.length === 1 ? '' : 's'} ready.</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <input value={returnReceipt} onChange={event => setReturnReceipt(event.target.value)} placeholder="Return receipt" className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[10px] text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
                    <input value={returnTracking} onChange={event => setReturnTracking(event.target.value)} placeholder="Tracking number" className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[10px] text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
                  </div>
                  <button type="button" disabled={isSaving || item.status !== 'removed' || !returnReceipt.trim() || !returnTracking.trim()} onClick={() => { void appendAction('return', item, { receiptNumber: returnReceipt, trackingNumber: returnTracking }); }} className="flex min-h-9 w-full items-center justify-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 text-[10px] font-black text-violet-200 disabled:opacity-40"><Truck size={12} /> Record return and tracking</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {message && <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-cyan-200"><CheckCircle2 size={11} /> {message}</p>}
      <div className="mt-3 space-y-1.5">
        <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500"><MapPin size={11} /> Automatic time and GPS when permitted</p>
        {ledger.events.slice(-5).reverse().map(event => (
          <div key={event.id} className="flex items-start gap-2 text-[10px] text-slate-400">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
            <span><strong className="text-slate-200">{eventLabel(event.type)}</strong> · {new Date(event.occurredAt).toLocaleString()} · {event.coordinates ? 'GPS' : 'No GPS'} · {event.hash.slice(0, 10)}…</span>
          </div>
        ))}
      </div>
    </section>
  );
}
