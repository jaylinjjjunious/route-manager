import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Upload, Clipboard, Image, Trash2, AlertTriangle,
  CheckCircle2, Eye, ArrowLeft, Sparkles,
  ShieldCheck, FileWarning, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { Job, ExtractedJob, ScreenshotImage } from '../types';
import {
  IMPORT_LIMITS, validateImageFile, extractJobFromScreenshot,
  detectDuplicate, detectMergeCandidates, extractedJobToJob,
} from '../services/screenshotImportService';

interface ScreenshotImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportJobs: (jobs: Omit<Job, 'id'>[]) => void;
  existingJobs: Job[];
}

type Step = 'select' | 'processing' | 'review' | 'importing' | 'complete';

export default function ScreenshotImportModal({
  isOpen,
  onClose,
  onImportJobs,
  existingJobs,
}: ScreenshotImportModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [isOpenAnim, setIsOpenAnim] = useState(false);
  const [images, setImages] = useState<ScreenshotImage[]>([]);
  const [extractedJobs, setExtractedJobs] = useState<ExtractedJob[]>([]);
  const [processLog, setProcessLog] = useState<string[]>([]);
  const [currentProcessLabel, setCurrentProcessLabel] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [expandedWarnings, setExpandedWarnings] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const scrollPosRef = useRef(0);

  // Lock body scroll + animate open
  useEffect(() => {
    if (!isOpen) return;
    scrollPosRef.current = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const prevBody = body.style.overflow;
    const prevHtml = html.style.overflow;
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    requestAnimationFrame(() => setIsOpenAnim(true));
    closeButtonRef.current?.focus();
    return () => {
      body.style.overflow = prevBody;
      html.style.overflow = prevHtml;
      setIsOpenAnim(false);
    };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'importing') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, step]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const addLog = useCallback((msg: string) => {
    setProcessLog(prev => [...prev, msg]);
    setCurrentProcessLabel(msg);
  }, []);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const remaining = IMPORT_LIMITS.maxFiles - images.length;
    const toAdd = Array.from(files).slice(0, remaining);
    const newImages: ScreenshotImage[] = [];
    for (const file of toAdd) {
      const err = validateImageFile(file);
      if (err) {
        newImages.push({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          status: 'error',
          error: err,
        });
      } else {
        newImages.push({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          status: 'pending',
        });
      }
    }
    setImages(prev => [...prev, ...newImages]);
  }, [images.length]);

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const clearAllImages = useCallback(() => {
    images.forEach(i => URL.revokeObjectURL(i.previewUrl));
    setImages([]);
  }, [images]);

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const ext = type.split('/')[1] || 'png';
            const file = new File([blob], `paste-${Date.now()}.${ext}`, { type });
            handleFileSelect({ length: 1, 0: file } as unknown as FileList);
            return;
          }
        }
      }
    } catch {
      // Clipboard API may not be available
    }
  }, [handleFileSelect]);

  const handleStartExtraction = async () => {
    const validImages = images.filter(i => i.status !== 'error');
    if (validImages.length === 0) return;
    setStep('processing');
    setProcessLog([]);
    setExtractedJobs([]);

    addLog('Preparing screenshots...');
    await new Promise(r => setTimeout(r, 300));

    const results: ExtractedJob[] = [];
    for (let idx = 0; idx < validImages.length; idx++) {
      const img = validImages[idx];
      addLog(`Reading screenshot ${idx + 1} of ${validImages.length}...`);
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'processing' } : i));

      try {
        const extracted = await extractJobFromScreenshot(img.file, img.id, (step) => addLog(step));
        results.push(extracted);
        setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'done' } : i));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Extraction failed';
        setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'error', error: msg } : i));
        addLog(`Screenshot ${idx + 1}: ${msg}`);
      }
    }

    addLog('Matching related screenshots...');
    await new Promise(r => setTimeout(r, 200));
    const mergeCandidates = detectMergeCandidates(results);
    for (const mc of mergeCandidates) {
      const primary = results.find(r => r.temporaryId === mc.primary.temporaryId);
      if (primary) {
        primary.warnings.push(`Possible merge: ${mc.reason}`);
        primary.sourceImageIds = [...new Set([...primary.sourceImageIds, ...mc.secondary.sourceImageIds])];
      }
    }

    addLog('Checking for duplicates...');
    await new Promise(r => setTimeout(r, 200));
    for (const ej of results) {
      const dupId = detectDuplicate(ej, existingJobs);
      if (dupId) {
        ej.duplicateOf = dupId;
        ej.warnings.push('Possible duplicate of existing job');
        ej.selected = false;
      }
      if (!ej.companyName && !ej.address.formatted) {
        ej.warnings.push('No job information detected');
        ej.selected = false;
      }
    }

    setExtractedJobs(results);
    addLog('Ready for review');
    setStep('review');
  };

  const updateExtractedJob = (tempId: string, updates: Partial<ExtractedJob>) => {
    setExtractedJobs(prev => prev.map(ej =>
      ej.temporaryId === tempId ? { ...ej, ...updates } : ej
    ));
  };

  const updateExtractedJobAddress = (tempId: string, field: keyof ExtractedJob['address'], value: string) => {
    setExtractedJobs(prev => prev.map(ej =>
      ej.temporaryId === tempId
        ? { ...ej, address: { ...ej.address, [field]: value || null } }
        : ej
    ));
  };

  const toggleJobSelected = (tempId: string) => {
    setExtractedJobs(prev => prev.map(ej =>
      ej.temporaryId === tempId ? { ...ej, selected: !ej.selected } : ej
    ));
  };

  const removeExtractedJob = (tempId: string) => {
    setExtractedJobs(prev => prev.filter(ej => ej.temporaryId !== tempId));
  };

  const selectAll = () => setExtractedJobs(prev => prev.map(ej => ({ ...ej, selected: true })));
  const deselectAll = () => setExtractedJobs(prev => prev.map(ej => ({ ...ej, selected: false })));

  const handleImport = async () => {
    const selected = extractedJobs.filter(ej => ej.selected);
    if (selected.length === 0) return;
    setStep('importing');
    addLog('Importing jobs...');
    await new Promise(r => setTimeout(r, 300));
    const jobData = selected.map(ej => extractedJobToJob(ej));
    onImportJobs(jobData);
    setImportResult({ imported: jobData.length, skipped: extractedJobs.length - selected.length });
    addLog(`${jobData.length} jobs imported into Today's Route`);
    setStep('complete');
  };

  const handleClose = () => {
    images.forEach(i => URL.revokeObjectURL(i.previewUrl));
    setImages([]);
    setExtractedJobs([]);
    setProcessLog([]);
    setCurrentProcessLabel('');
    setImportResult(null);
    setPrivacyAccepted(false);
    setEditingJob(null);
    setStep('select');
    onClose();
  };

  const selectedCount = images.filter(i => i.status !== 'error').length;
  const extractedSelectedCount = extractedJobs.filter(ej => ej.selected).length;
  const needsReviewCount = extractedJobs.filter(ej => ej.warnings.length > 0 && ej.selected).length;
  const duplicateCount = extractedJobs.filter(ej => ej.duplicateOf && ej.selected).length;

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 backdrop-blur-[10px] [-webkit-backdrop-filter:blur(10px)] transition-opacity duration-200 ease-out ${isOpenAnim ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="screenshot-import-title"
    >
      <div
        className={`flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111214] shadow-2xl transition-all duration-200 ease-out ${isOpenAnim ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0'}`}
        style={{ maxHeight: 'min(88dvh, 640px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600">
            <Image size={16} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="screenshot-import-title" className="text-sm font-black text-white">
              Import Job Screenshots
            </h3>
            <p className="text-[10px] font-bold text-slate-400">
              {step === 'select' && `${selectedCount} image(s) selected`}
              {step === 'processing' && 'Processing...'}
              {step === 'review' && `${extractedJobs.length} job(s) extracted`}
              {step === 'importing' && 'Importing...'}
              {step === 'complete' && `${importResult?.imported ?? 0} imported`}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            disabled={step === 'importing'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-400 transition hover:bg-white/15 hover:text-white disabled:opacity-40"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-4"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          {/* STEP: SELECT */}
          {step === 'select' && (
            <div className="space-y-4">
              {/* Privacy disclosure */}
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-violet-400" />
                  <div className="space-y-1.5 text-[11px] font-semibold leading-relaxed text-violet-200">
                    <p className="font-black text-violet-300">Privacy Notice</p>
                    <p>Screenshots are sent to our AI service for extraction. Images are processed to extract job details only and are not stored long-term. Crop out any personal information before uploading.</p>
                    <p>You will review all extracted information before any jobs are added to your route.</p>
                  </div>
                </div>
                <label className="mt-2 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="h-4 w-4 rounded border-violet-500/30 bg-white/10 text-violet-500 focus:ring-violet-500/30"
                  />
                  <span className="text-[11px] font-bold text-violet-300">I understand and consent to screenshot processing</span>
                </label>
              </div>

              {/* Upload area */}
              <div
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                  privacyAccepted
                    ? 'border-white/20 bg-white/[0.03] hover:border-violet-500/40 hover:bg-violet-500/5'
                    : 'border-white/10 bg-white/[0.01] opacity-50'
                }`}
              >
                <Upload size={28} className="mb-2 text-slate-500" />
                <p className="text-sm font-black text-slate-300">Drop screenshots here or tap to browse</p>
                <p className="mt-1 text-[10px] font-bold text-slate-500">
                  PNG, JPEG, WebP, HEIC — up to {IMPORT_LIMITS.maxFileSizeMB}MB each — max {IMPORT_LIMITS.maxFiles} images
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={IMPORT_LIMITS.acceptedExtensions}
                  multiple
                  className="hidden"
                  disabled={!privacyAccepted}
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={!privacyAccepted}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-black text-white transition hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Image size={13} />
                    Choose Screenshots
                  </button>
                  <button
                    type="button"
                    disabled={!privacyAccepted}
                    onClick={handlePaste}
                    className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Clipboard size={13} />
                    Paste
                  </button>
                </div>
              </div>

              {/* Thumbnails */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-slate-500">
                      {images.length} image(s) — {images.filter(i => i.status === 'error').length} with errors
                    </p>
                    <button
                      type="button"
                      onClick={clearAllImages}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {images.map(img => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.previewUrl}
                          alt="Screenshot preview"
                          className="h-20 w-full rounded-lg border border-white/10 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove image"
                        >
                          <X size={10} />
                        </button>
                        {img.status === 'error' && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
                            <FileWarning size={16} className="text-rose-400" />
                          </div>
                        )}
                        {img.status === 'done' && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                            <CheckCircle2 size={16} className="text-emerald-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {images.some(i => i.status === 'error') && (
                    <div className="space-y-1">
                      {images.filter(i => i.status === 'error').map(img => (
                        <p key={img.id} className="text-[10px] font-bold text-rose-400">{img.error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP: PROCESSING */}
          {step === 'processing' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6">
                <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-500/30 border-t-violet-500" />
                <p className="text-sm font-black text-white">{currentProcessLabel || 'Processing...'}</p>
              </div>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-white/[0.03] p-3">
                {processLog.map((log, i) => (
                  <p key={i} className="text-[10px] font-bold text-slate-400">{log}</p>
                ))}
              </div>
              {/* Image progress */}
              <div className="grid grid-cols-4 gap-2">
                {images.filter(i => i.status !== 'error').map(img => (
                  <div key={img.id} className="relative">
                    <img src={img.previewUrl} alt="" className="h-14 w-full rounded-lg object-cover" />
                    {img.status === 'processing' && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                        <RefreshCw size={14} className="animate-spin text-violet-400" />
                      </div>
                    )}
                    {img.status === 'done' && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP: REVIEW */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-400">
                  {extractedJobs.filter(ej => ej.selected).length} selected
                </span>
                {needsReviewCount > 0 && (
                  <span className="rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-black text-amber-400">
                    {needsReviewCount} needs review
                  </span>
                )}
                {duplicateCount > 0 && (
                  <span className="rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-black text-rose-400">
                    {duplicateCount} possible duplicate(s)
                  </span>
                )}
                <div className="flex-1" />
                <button type="button" onClick={selectAll} className="text-[10px] font-bold text-violet-400 hover:text-violet-300">Select All</button>
                <span className="text-slate-600">|</span>
                <button type="button" onClick={deselectAll} className="text-[10px] font-bold text-slate-400 hover:text-slate-300">Deselect All</button>
              </div>

              {/* Job cards */}
              {extractedJobs.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <FileWarning size={28} className="mb-2 text-slate-500" />
                  <p className="text-sm font-black text-slate-400">No job information detected</p>
                  <p className="text-[10px] font-bold text-slate-500">Try different screenshots or add jobs manually</p>
                </div>
              ) : (
                extractedJobs.map(ej => {
                  const isEditing = editingJob === ej.temporaryId;
                  const warningsExpanded = expandedWarnings[ej.temporaryId];
                  return (
                    <div
                      key={ej.temporaryId}
                      className={`rounded-xl border transition-colors ${
                        ej.selected
                          ? ej.duplicateOf
                            ? 'border-rose-500/30 bg-rose-500/5'
                            : ej.warnings.length > 0
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : 'border-emerald-500/20 bg-emerald-500/5'
                          : 'border-white/10 bg-white/[0.02] opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={ej.selected}
                          onChange={() => toggleJobSelected(ej.temporaryId)}
                          className="h-4 w-4 shrink-0 rounded border-white/20 bg-white/10 text-violet-500 focus:ring-violet-500/30"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-black text-white">
                              {ej.companyName || 'Unknown Company'}
                            </p>
                            {ej.duplicateOf && (
                              <span className="shrink-0 rounded bg-rose-500/20 px-1.5 py-0.5 text-[8px] font-black text-rose-400">DUP</span>
                            )}
                            {ej.warnings.length > 0 && !ej.duplicateOf && (
                              <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-black text-amber-400">REVIEW</span>
                            )}
                          </div>
                          <p className="truncate text-[10px] font-bold text-slate-400">
                            {ej.address.formatted || 'No address'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="text-xs font-black text-emerald-400">
                            {ej.pay.amount != null ? `$${ej.pay.amount.toFixed(2)}` : '—'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingJob(isEditing ? null : ej.temporaryId)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                            aria-label={isEditing ? 'Collapse' : 'Edit'}
                          >
                            {isEditing ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeExtractedJob(ej.temporaryId)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-950/30 hover:text-rose-400"
                            aria-label="Remove"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Warnings */}
                      {ej.warnings.length > 0 && ej.selected && (
                        <div className="border-t border-white/5 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setExpandedWarnings(prev => ({ ...prev, [ej.temporaryId]: !prev[ej.temporaryId] }))}
                            className="flex items-center gap-1 text-[10px] font-bold text-amber-400"
                          >
                            <AlertTriangle size={10} />
                            {ej.warnings.length} warning(s)
                            {warningsExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          </button>
                          {warningsExpanded && (
                            <ul className="mt-1 space-y-0.5">
                              {ej.warnings.map((w, i) => (
                                <li key={i} className="text-[10px] font-bold text-amber-300/70">• {w}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* Editable fields */}
                      {isEditing && (
                        <div className="border-t border-white/5 px-3 py-3 space-y-2.5">
                          <div>
                            <label className="mb-0.5 block text-[9px] font-black uppercase text-slate-500">Company / Store</label>
                            <input
                              type="text"
                              value={ej.companyName || ''}
                              onChange={(e) => updateExtractedJob(ej.temporaryId, { companyName: e.target.value || null })}
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-white placeholder-slate-500 focus:border-violet-500/50 focus:outline-none"
                              placeholder="Company name"
                            />
                          </div>
                          <div>
                            <label className="mb-0.5 block text-[9px] font-black uppercase text-slate-500">Address</label>
                            <input
                              type="text"
                              value={ej.address.formatted || ''}
                              onChange={(e) => updateExtractedJobAddress(ej.temporaryId, 'formatted', e.target.value)}
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-white placeholder-slate-500 focus:border-violet-500/50 focus:outline-none"
                              placeholder="Full address"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-0.5 block text-[9px] font-black uppercase text-slate-500">Pay ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={ej.pay.amount ?? ''}
                                onChange={(e) => updateExtractedJob(ej.temporaryId, { pay: { ...ej.pay, amount: e.target.value ? Number(e.target.value) : null } })}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-white placeholder-slate-500 focus:border-violet-500/50 focus:outline-none"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="mb-0.5 block text-[9px] font-black uppercase text-slate-500">Duration (min)</label>
                              <input
                                type="number"
                                value={ej.estimatedDurationMinutes ?? ''}
                                onChange={(e) => updateExtractedJob(ej.temporaryId, { estimatedDurationMinutes: e.target.value ? Number(e.target.value) : null })}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-white placeholder-slate-500 focus:border-violet-500/50 focus:outline-none"
                                placeholder="20"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-0.5 block text-[9px] font-black uppercase text-slate-500">Due Time</label>
                              <input
                                type="text"
                                value={ej.dueAt || ''}
                                onChange={(e) => updateExtractedJob(ej.temporaryId, { dueAt: e.target.value || null })}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-white placeholder-slate-500 focus:border-violet-500/50 focus:outline-none"
                                placeholder="17:00"
                              />
                            </div>
                            <div>
                              <label className="mb-0.5 block text-[9px] font-black uppercase text-slate-500">Job Type</label>
                              <select
                                value={ej.jobType || 'field_task'}
                                onChange={(e) => updateExtractedJob(ej.temporaryId, { jobType: e.target.value })}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-white focus:border-violet-500/50 focus:outline-none"
                              >
                                <option value="retail_audit">Retail Audit</option>
                                <option value="merchandising">Merchandising</option>
                                <option value="mystery_shop">Mystery Shop</option>
                                <option value="field_task">Field Task</option>
                                <option value="process_serve">Process Serve</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="mb-0.5 block text-[9px] font-black uppercase text-slate-500">Notes</label>
                            <textarea
                              value={ej.notes || ''}
                              onChange={(e) => updateExtractedJob(ej.temporaryId, { notes: e.target.value || null })}
                              rows={2}
                              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-white placeholder-slate-500 focus:border-violet-500/50 focus:outline-none"
                              placeholder="Instructions or notes"
                            />
                          </div>
                          {/* Source images */}
                          <div className="flex items-center gap-1.5">
                            <Eye size={10} className="text-slate-500" />
                            <span className="text-[9px] font-bold text-slate-500">
                              Source: {ej.sourceImageIds.length} image(s)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* STEP: IMPORTING */}
          {step === 'importing' && (
            <div className="flex flex-col items-center py-8">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-violet-500/30 border-t-violet-500" />
              <p className="text-sm font-black text-white">Importing jobs into Today&apos;s Route...</p>
              <p className="mt-1 text-[10px] font-bold text-slate-400">{currentProcessLabel}</p>
            </div>
          )}

          {/* STEP: COMPLETE */}
          {step === 'complete' && (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle2 size={40} className="mb-3 text-emerald-400" />
              <p className="text-lg font-black text-white">Import Complete</p>
              <p className="mt-1 text-sm font-bold text-slate-400">
                {importResult?.imported} job(s) added to Today&apos;s Route
                {importResult?.skipped ? `, ${importResult.skipped} skipped` : ''}
              </p>
              <p className="mt-3 text-[10px] font-bold text-slate-500">
                Screenshots are processed and not stored long-term.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-2 border-t border-white/10 px-4 py-3">
          {step === 'select' && (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg bg-white/10 py-2.5 text-xs font-black text-slate-300 transition hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartExtraction}
                disabled={selectedCount === 0 || !privacyAccepted}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 py-2.5 text-xs font-black text-white transition hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles size={13} />
                Extract Jobs ({selectedCount})
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <button
                type="button"
                onClick={() => { setStep('select'); setExtractedJobs([]); }}
                className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2.5 text-xs font-black text-slate-300 transition hover:bg-white/15"
              >
                <ArrowLeft size={13} />
                Back
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={extractedSelectedCount === 0}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-black text-white transition hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={13} />
                Import {extractedSelectedCount} Job(s)
              </button>
            </>
          )}

          {step === 'complete' && (
            <button
              type="button"
              onClick={handleClose}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 py-2.5 text-xs font-black text-white transition hover:bg-violet-500"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
