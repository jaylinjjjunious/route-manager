import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import type { Job } from '../types';
import { getInventoryDomain, inventoryDomainLabel } from '../services/inventory/domain';
import {
  findInventoryCatalogMatch,
  type InventoryCatalogEntry,
} from '../services/inventory/referenceCatalog';
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

interface InventoryBarcodeResult {
  rawValue?: string;
}

interface InventoryBarcodeDetector {
  new (options?: { formats?: string[] }): {
    detect: (source: ImageBitmap) => Promise<InventoryBarcodeResult[]>;
  };
}

const inventoryBarcodeHost = globalThis as typeof globalThis & {
  BarcodeDetector?: InventoryBarcodeDetector;
};

function makeLocalId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function statusLabel(status: CustodyItem['status'], isPackageDomain: boolean): string {
  if (isPackageDomain && status === 'installed') return 'Delivered';
  if (isPackageDomain && status === 'removed') return 'Exception';
  return status === 'received' ? 'Received' : status === 'installed' ? 'Installed' : status === 'removed' ? 'Removed' : 'Returned';
}

function eventLabel(type: CustodyEventType, isPackageDomain: boolean): string {
  if (isPackageDomain) return type === 'receive_in' ? 'Package received' : type === 'install' ? 'Delivered' : type === 'removal' ? 'Exception' : 'Package return';
  return type === 'receive_in' ? 'Receive-in' : type === 'install' ? 'Install' : type === 'removal' ? 'Removal' : 'Return';
}

type EvidenceCalendarMode = 'week' | 'month' | 'year';

function dateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function startOfWeek(value: Date): Date {
  const result = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  result.setDate(result.getDate() - result.getDay());
  return result;
}

function calendarDays(anchor: Date, mode: EvidenceCalendarMode): Date[] {
  if (mode === 'week') return Array.from({ length: 7 }, (_, index) => { const day = startOfWeek(anchor); day.setDate(day.getDate() + index); return day; });
  if (mode === 'year') return [];
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
}

function moveCalendarAnchor(anchor: Date, mode: EvidenceCalendarMode, direction: number): Date {
  const next = new Date(anchor);
  next.setMonth(next.getMonth() + (mode === 'year' ? direction * 12 : mode === 'month' ? direction : 0));
  if (mode === 'week') next.setDate(next.getDate() + direction * 7);
  return next;
}

export default function InventoryCustodyPanel({ job }: InventoryCustodyPanelProps) {
  const domain = getInventoryDomain(job);
  const isPackageDomain = domain === 'merchandising';
  const [ledger, setLedger] = useState<CustodyLedger>(() => loadCustodyLedger(job.id, domain));
  const [partNumber, setPartNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [packageId, setPackageId] = useState('');
  const [packageContents, setPackageContents] = useState('');
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receivePhoto, setReceivePhoto] = useState<CustodyEvidence | null>(null);
  const [catalogMatch, setCatalogMatch] = useState<InventoryCatalogEntry | null>(null);
  const [receiveDraft, setReceiveDraft] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState('Catalog match is optional; manual correction is always available.');
  const [receiveDocuments, setReceiveDocuments] = useState<CustodyEvidence[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [returnReceipt, setReturnReceipt] = useState('');
  const [returnTracking, setReturnTracking] = useState('');
  const [exceptionNote, setExceptionNote] = useState('');
  const [actionEvidence, setActionEvidence] = useState<CustodyEvidence | null>(null);
  const [actionDocuments, setActionDocuments] = useState<CustodyEvidence[]>([]);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState<EvidenceCalendarMode>('month');
  const [calendarAnchor, setCalendarAnchor] = useState(() => new Date());
  const [selectedEvidenceDate, setSelectedEvidenceDate] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [ledgerValid, setLedgerValid] = useState(true);
  const receivePhotoInputRef = useRef<HTMLInputElement>(null);

  const activeItems = useMemo(() => ledger.items.filter(item => item.status !== 'returned'), [ledger.items]);
  const activeItem = activeItems.find(item => item.id === activeItemId) || activeItems[0] || null;
  const evidencePhotos = useMemo(() => ledger.events.flatMap(event => {
    const item = ledger.items.find(candidate => candidate.id === event.itemId);
    return (item?.evidence || [])
      .filter(evidence => evidence.kind === 'photo' && event.evidenceIds.includes(evidence.id))
      .map(evidence => ({ evidence, event, item }));
  }), [ledger.events, ledger.items]);
  const visibleEvidence = useMemo(() => evidencePhotos.filter(record => {
    const captured = new Date(record.evidence.capturedAt);
    if (selectedEvidenceDate && dateKey(captured) !== selectedEvidenceDate) return false;
    if (calendarMode === 'year') return captured.getFullYear() === calendarAnchor.getFullYear();
    if (calendarMode === 'month') return captured.getFullYear() === calendarAnchor.getFullYear() && captured.getMonth() === calendarAnchor.getMonth();
    const start = startOfWeek(calendarAnchor);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return captured >= start && captured < end;
  }), [calendarAnchor, calendarMode, evidencePhotos, selectedEvidenceDate]);
  const evidenceByDate = useMemo(() => evidencePhotos.reduce<Record<string, typeof evidencePhotos>>((groups, record) => {
    const key = dateKey(new Date(record.evidence.capturedAt));
    groups[key] = groups[key] || [];
    groups[key].push(record);
    return groups;
  }, {}), [evidencePhotos]);

  useEffect(() => {
    setLedger(loadCustodyLedger(job.id, domain));
    setActiveItemId(null);
    setIsSaving(false);
    setEvidenceOpen(false);
    setSelectedEvidenceDate(null);
  }, [job.id, domain]);

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
      const BarcodeDetector = inventoryBarcodeHost.BarcodeDetector;
      if (BarcodeDetector && globalThis.createImageBitmap) {
        try {
          const image = await createImageBitmap(file);
          const detector = new BarcodeDetector({ formats: ['code_128', 'code_39', 'data_matrix', 'qr_code', 'ean_13', 'upc_a'] });
          const detectedValues = (await detector.detect(image)).map(result => result.rawValue?.trim()).filter((value): value is string => Boolean(value));
          image.close();
          const match = detectedValues.map(findInventoryCatalogMatch).find(Boolean) || null;
          const detectedValue = detectedValues[0] || '';
          const serialCandidate = detectedValues.find(value => !findInventoryCatalogMatch(value));
          if (match) {
            setPartNumber(match.partNumber);
            setCatalogMatch(match);
            if (serialCandidate) setSerialNumber(serialCandidate);
            setReceiveDraft(false);
            setCatalogMessage(`Barcode matched ${match.partNumber}. Confirm or correct before receiving.`);
          } else if (detectedValue) {
            setCatalogMatch(null);
            setReceiveDraft(true);
            setSerialNumber(detectedValue);
            setCatalogMessage(`Barcode ${detectedValue} was not in the reference catalog. Correct the part number manually.`);
          } else {
            setReceiveDraft(true);
            setCatalogMessage('No supported part barcode detected. Enter the part number manually.');
          }
        } catch {
          setReceiveDraft(true);
          setCatalogMessage('Barcode scan was unavailable for this image. Enter the part number manually.');
        }
      }
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

  const appendAction = async (type: ActionType, item: CustodyItem, options: { receiptNumber?: string; trackingNumber?: string; notes?: string } = {}) => {
    if (isPackageDomain && type === 'install' && !actionEvidence) {
      setMessage('Capture delivery evidence before recording package delivery.');
      return;
    }
    setIsSaving(true);
    const coordinates = await getCurrentCoordinates();
    const evidence = [...(actionEvidence ? [actionEvidence] : []), ...actionDocuments];
    const previousHash = ledger.events[ledger.events.length - 1]?.hash || GENESIS_HASH;
    const event = await createCustodyEvent({
      jobId: job.id,
      itemId: item.id,
      type,
      domain,
      partNumber: item.partNumber,
      serialNumber: item.serialNumber,
      coordinates,
      evidenceIds: evidence.map(entry => entry.id),
      receiptNumber: options.receiptNumber,
      trackingNumber: options.trackingNumber,
      notes: options.notes,
      packageId: item.packageId,
      packageContents: item.packageContents,
      previousHash,
    });
    const next = appendCustodyEvent(ledger, event, { ...item, evidence: [...item.evidence, ...evidence] });
    setLedger(next);
    setActionEvidence(null);
    setActionDocuments([]);
    setReturnReceipt('');
    setReturnTracking('');
    setExceptionNote('');
    setMessage(`${eventLabel(type, isPackageDomain)} saved ${coordinates ? 'with GPS' : 'without GPS'}.`);
    setIsSaving(false);
  };

  const handleReceive = async () => {
    if (isPackageDomain ? !packageId.trim() : (!partNumber.trim() || !serialNumber.trim() || !receivePhoto)) {
      setMessage(isPackageDomain ? 'Enter a package identifier before receiving it.' : 'Capture the item photo and enter both the part number and serial number.');
      receivePhotoInputRef.current?.click();
      return;
    }
    if (!isPackageDomain && (!catalogMatch || receiveDraft)) {
      setMessage('Draft receive: correct the part number to a catalog match before finalizing.');
      return;
    }
    setIsSaving(true);
    const itemId = makeLocalId('inventory-item');
    const evidence = [...(receivePhoto ? [receivePhoto] : []), ...receiveDocuments];
    const coordinates = await getCurrentCoordinates();
    const event = await createCustodyEvent({
      jobId: job.id,
      itemId,
      type: 'receive_in',
      domain,
      partNumber,
      serialNumber,
      coordinates,
      evidenceIds: evidence.map(entry => entry.id),
      notes: receiveNotes,
      packageId: isPackageDomain ? packageId : undefined,
      packageContents: isPackageDomain ? packageContents : undefined,
      equipmentLabel: catalogMatch?.description,
      sourceContext: catalogMatch?.source,
      previousHash: ledger.events[ledger.events.length - 1]?.hash || GENESIS_HASH,
    });
    const item: CustodyItem = {
      domain,
      id: itemId,
      jobId: job.id,
      partNumber: partNumber.trim(),
      serialNumber: serialNumber.trim(),
      packageId: isPackageDomain ? packageId.trim() : undefined,
      packageContents: isPackageDomain ? packageContents.trim() : undefined,
      equipmentLabel: catalogMatch?.description,
      sourceContext: catalogMatch?.source,
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
    setPackageId('');
    setPackageContents('');
    setReceiveNotes('');
    setReceivePhoto(null);
    setReceiveDocuments([]);
    setCatalogMatch(null);
    setReceiveDraft(false);
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
          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{isPackageDomain ? 'Receive packages, prove store delivery, and record return or exception.' : 'Receive, install, remove, and return the same item without losing its evidence trail.'}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-cyan-300">{inventoryDomainLabel(domain)}</p>
        </div>
      </div>

      <button type="button" onClick={() => { setEvidenceOpen(true); setSelectedEvidenceDate(null); }} className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-[10px] font-black text-cyan-100 hover:bg-cyan-400/20">
        <CalendarDays size={13} /> Evidence photos ({evidencePhotos.length})
      </button>

      {evidenceOpen && <div className="mt-3 rounded-lg border border-cyan-400/30 bg-slate-950/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-cyan-200">Evidence calendar</p>
            <p className="text-[10px] text-slate-400">{inventoryDomainLabel(domain)} · {job.storeName}</p>
          </div>
          <button type="button" aria-label="Close evidence calendar" onClick={() => setEvidenceOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><X size={14} /></button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous evidence period" onClick={() => { setCalendarAnchor(moveCalendarAnchor(calendarAnchor, calendarMode, -1)); setSelectedEvidenceDate(null); }} className="rounded-md p-1.5 text-slate-300 hover:bg-white/10"><ChevronLeft size={14} /></button>
            <strong className="min-w-32 text-center text-[10px] text-white">{calendarMode === 'year' ? calendarAnchor.getFullYear() : calendarMode === 'month' ? calendarAnchor.toLocaleString(undefined, { month: 'long', year: 'numeric' }) : `Week of ${startOfWeek(calendarAnchor).toLocaleDateString()}`}</strong>
            <button type="button" aria-label="Next evidence period" onClick={() => { setCalendarAnchor(moveCalendarAnchor(calendarAnchor, calendarMode, 1)); setSelectedEvidenceDate(null); }} className="rounded-md p-1.5 text-slate-300 hover:bg-white/10"><ChevronRight size={14} /></button>
          </div>
          <div className="flex rounded-md border border-white/10 p-0.5">
            {(['week', 'month', 'year'] as const).map(mode => <button key={mode} type="button" onClick={() => { setCalendarMode(mode); setSelectedEvidenceDate(null); }} className={`rounded px-2 py-1 text-[9px] font-black uppercase ${calendarMode === mode ? 'bg-cyan-400 text-slate-950' : 'text-slate-400'}`}>{mode}</button>)}
          </div>
        </div>
        {calendarMode === 'year' ? <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {Array.from({ length: 12 }, (_, month) => { const monthPhotos = evidencePhotos.filter(record => { const date = new Date(record.evidence.capturedAt); return date.getFullYear() === calendarAnchor.getFullYear() && date.getMonth() === month; }); return <button key={month} type="button" onClick={() => { setCalendarMode('month'); setCalendarAnchor(new Date(calendarAnchor.getFullYear(), month, 1)); setSelectedEvidenceDate(null); }} className="rounded-md border border-white/10 p-2 text-left hover:border-cyan-400/50"><span className="block text-[9px] font-black text-white">{new Date(calendarAnchor.getFullYear(), month, 1).toLocaleString(undefined, { month: 'short' })}</span><span className="text-[9px] text-slate-400">{monthPhotos.length} photo{monthPhotos.length === 1 ? '' : 's'}</span></button>; })}
        </div> : <div className="mt-3 grid grid-cols-7 gap-1">
          {calendarDays(calendarAnchor, calendarMode).map(day => { const key = dateKey(day); const photos = evidenceByDate[key] || []; const inMonth = calendarMode === 'week' || day.getMonth() === calendarAnchor.getMonth(); return <button key={key} type="button" onClick={() => setSelectedEvidenceDate(selectedEvidenceDate === key ? null : key)} className={`min-h-12 rounded-md border p-1 text-left ${selectedEvidenceDate === key ? 'border-cyan-300 bg-cyan-400/20' : 'border-white/10'} ${inMonth ? 'text-white' : 'text-slate-600'}`}><span className="block text-[9px] font-black">{day.getDate()}</span>{photos.length > 0 && <span className="mt-1 block text-[8px] font-black text-cyan-200">{photos.length} photo{photos.length === 1 ? '' : 's'}</span>}</button>; })}
        </div>}
        <div className="mt-3 space-y-2">
          {visibleEvidence.length === 0 ? <p className="rounded-md border border-dashed border-white/10 p-3 text-[10px] font-bold text-slate-500">No evidence photos in this period.</p> : visibleEvidence.map(record => <div key={`${record.event.id}-${record.evidence.id}`} className="flex items-center gap-2 rounded-md border border-white/10 p-2"><img src={record.evidence.dataUrl} alt={`${eventLabel(record.event.type, isPackageDomain)} evidence`} className="h-12 w-12 rounded object-cover" /><div className="min-w-0"><p className="truncate text-[10px] font-black text-white">{eventLabel(record.event.type, isPackageDomain)} · {new Date(record.evidence.capturedAt).toLocaleString()}</p><p className="truncate text-[9px] text-cyan-200">{isPackageDomain ? record.item?.packageId : record.item?.equipmentLabel || findInventoryCatalogMatch(record.item?.partNumber || '')?.description || record.item?.partNumber} · {job.storeName}</p><p className="truncate text-[9px] text-slate-400">{record.item?.sourceContext || inventoryDomainLabel(domain)} · {record.evidence.name}</p></div></div>)}
        </div>
      </div>}

      <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/10 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{isPackageDomain ? 'Receive package' : 'Receive-in'}</p>
          <button type="button" onClick={() => receivePhotoInputRef.current?.click()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-cyan-600 px-2.5 text-[10px] font-black text-white hover:bg-cyan-500">
            <Camera size={13} /> {receivePhoto ? 'Retake package photo' : 'Capture package'}
          </button>
          <input ref={receivePhotoInputRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={event => { void handleReceivePhoto(event.target.files?.[0]); event.currentTarget.value = ''; }} />
        </div>
        {receivePhoto && <img src={receivePhoto.dataUrl} alt="Captured inventory item" className="h-24 w-full rounded-lg object-cover" />}
        {isPackageDomain ? <div className="grid grid-cols-2 gap-2">
          <input value={packageId} onChange={event => setPackageId(event.target.value)} placeholder="Package identifier" className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
          <input value={packageContents} onChange={event => setPackageContents(event.target.value)} placeholder="Contents" className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
        </div> : <div className="grid grid-cols-2 gap-2">
          <input value={partNumber} onChange={event => { const value = event.target.value; const match = findInventoryCatalogMatch(value); setPartNumber(value); setCatalogMatch(match); setReceiveDraft(!match); }} placeholder="Part number" className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
          <input value={serialNumber} onChange={event => setSerialNumber(event.target.value)} placeholder="Serial number" className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
        </div>}
        <textarea value={receiveNotes} onChange={event => setReceiveNotes(event.target.value)} placeholder="Optional receiving note" rows={2} className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
        <label className="flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 px-2 text-[10px] font-bold text-slate-400 hover:border-cyan-400 hover:text-cyan-200">
          <FileText size={13} /> Attach receiving document
          <input className="hidden" type="file" multiple accept="image/*,.pdf,.txt,.csv" onChange={event => { void handleReceiveDocuments(event.target.files); event.currentTarget.value = ''; }} />
        </label>
        {receiveDraft && !isPackageDomain && <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-2 text-[10px] font-black text-amber-200">Draft receive: correct the part number before it becomes custody history.</p>}
        <button type="button" disabled={isSaving} onClick={() => { void handleReceive(); }} className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-950 hover:bg-cyan-50 disabled:opacity-50">
          <PackageCheck size={14} /> {isPackageDomain ? 'Receive package for this store job' : receiveDraft ? 'Finalize matched receive' : 'Receive item and start custody history'}
        </button>
        {!isPackageDomain && <><p className="text-[10px] font-bold text-cyan-200">{catalogMessage}</p>{catalogMatch && <p className="text-[10px] text-emerald-300">Matched: {catalogMatch.description}</p>}</>}
      </div>

      {activeItems.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active items</p>
          {activeItems.map(item => (
            <div key={item.id} className="rounded-lg border border-white/10 bg-black/10 p-2.5">
              <button type="button" onClick={() => setActiveItemId(item.id)} className="flex w-full items-start justify-between gap-2 text-left">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black text-white">{isPackageDomain ? item.packageId : item.partNumber}</span>
                  {isPackageDomain ? <span className="block truncate text-[10px] font-bold text-cyan-200">{item.packageContents || 'Package contents not specified'}</span> : findInventoryCatalogMatch(item.partNumber) && <span className="block truncate text-[10px] font-bold text-cyan-200">{findInventoryCatalogMatch(item.partNumber)!.description}</span>}
                  <span className="block truncate text-[10px] text-slate-400">{isPackageDomain ? `Store job · ${item.eventIds.length} events` : `S/N ${item.serialNumber} · ${item.eventIds.length} events`}</span>
                </span>
                <span className="shrink-0 rounded-md border border-cyan-500/20 px-2 py-1 text-[10px] font-black text-cyan-200">{statusLabel(item.status, isPackageDomain)}</span>
              </button>
              {activeItem?.id === item.id && (
                <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={isSaving || item.status !== 'received'} onClick={() => { void appendAction('install', item); }} className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 text-[10px] font-black text-emerald-200 disabled:opacity-40">{isPackageDomain ? <Truck size={12} /> : <Wrench size={12} />} {isPackageDomain ? 'Record delivery' : 'Install'}</button>
                    <button type="button" disabled={isSaving || item.status !== 'installed'} onClick={() => { void appendAction('removal', item, { notes: exceptionNote }); }} className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 text-[10px] font-black text-amber-200 disabled:opacity-40"><RefreshCw size={12} /> {isPackageDomain ? 'Record exception' : 'Remove'}</button>
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
                  {isPackageDomain && <input value={exceptionNote} onChange={event => setExceptionNote(event.target.value)} placeholder="Exception note (optional)" className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[10px] text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />}
                  <div className="grid grid-cols-2 gap-2">
                    <input value={returnReceipt} onChange={event => setReturnReceipt(event.target.value)} placeholder="Return receipt" className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[10px] text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
                    <input value={returnTracking} onChange={event => setReturnTracking(event.target.value)} placeholder="Tracking number" className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[10px] text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
                  </div>
                  <button type="button" disabled={isSaving || item.status !== 'removed' || !returnReceipt.trim() || !returnTracking.trim()} onClick={() => { void appendAction('return', item, { receiptNumber: returnReceipt, trackingNumber: returnTracking }); }} className="flex min-h-9 w-full items-center justify-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 text-[10px] font-black text-violet-200 disabled:opacity-40"><Truck size={12} /> {isPackageDomain ? 'Record package return' : 'Record return and tracking'}</button>
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
            <span><strong className="text-slate-200">{eventLabel(event.type, isPackageDomain)}</strong> · {new Date(event.occurredAt).toLocaleString()} · {event.coordinates ? 'GPS' : 'No GPS'} · {event.hash.slice(0, 10)}…</span>
          </div>
        ))}
      </div>
    </section>
  );
}
