import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Flashlight, FlashlightOff, History, Image as ImageIcon, Loader2, ScanLine, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { getBarcodeEnding, getLocalDateKey, REQUIRED_SHOWER_BARCODE } from '../utils/showerCycle';
import { getCurrentShowerProof, getShowerProofHistory, ShowerProofRecord, uploadShowerProof } from '../services/showerProofApi';

type ShowerGateView = 'current' | 'scanner' | 'today' | 'history';
type ShowerGateStatus =
  | 'locked'
  | 'loading'
  | 'requesting'
  | 'scanning'
  | 'incorrect'
  | 'verified'
  | 'capturing'
  | 'uploading'
  | 'saved'
  | 'upload_failed'
  | 'camera_error'
  | 'history_loading'
  | 'history_error';

interface ShowerGatePanelProps {
  cycleId: string;
  cycleLabel: string;
  completedProof?: ShowerProofRecord | null;
  onVerifiedProof: (proof: ShowerProofRecord) => void;
}

interface BarcodeDetectorResult {
  rawValue?: string;
  format?: string;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): {
    detect: (source: CanvasImageSource) => Promise<BarcodeDetectorResult[]>;
  };
  getSupportedFormats?: () => Promise<string[]>;
}

interface TorchMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

interface ZxingControls {
  stop(): void;
  switchTorch?: (on: boolean) => Promise<void>;
}

const getBarcodeDetector = () => {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
};

const formatProofDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

const formatProofTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function ShowerGatePanel({ cycleId, cycleLabel, completedProof, onVerifiedProof }: ShowerGatePanelProps) {
  const [view, setView] = useState<ShowerGateView>('current');
  const [status, setStatus] = useState<ShowerGateStatus>(completedProof ? 'saved' : 'loading');
  const [statusMessage, setStatusMessage] = useState(completedProof ? 'Proof saved.' : 'Checking today proof...');
  const [currentProof, setCurrentProof] = useState<ShowerProofRecord | null>(completedProof || null);
  const [history, setHistory] = useState<ShowerProofRecord[]>([]);
  const [previewUrl, setPreviewUrl] = useState('');
  const [proofImageFailed, setProofImageFailed] = useState(false);
  const [historyImageFailures, setHistoryImageFailures] = useState<Record<string, boolean>>({});
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<ZxingControls | null>(null);
  const scanHandledRef = useRef(false);
  const pendingProofRef = useRef<{ blob: Blob; capturedAt: string } | null>(null);

  const isComplete = Boolean(currentProof?.verificationStatus === 'verified' && currentProof.uploadStatus === 'saved');
  const lockedTone = status === 'incorrect' || status === 'upload_failed' || status === 'camera_error'
    ? 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100'
    : isComplete
      ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'
      : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100';

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current !== null) {
      window.cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setTorchAvailable(false);
    setTorchOn(false);
  }, []);

  const releasePreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
  }, [previewUrl]);

  useEffect(() => {
    if (!completedProof) return;
    setCurrentProof(completedProof);
    setStatus('saved');
    setStatusMessage('Proof saved.');
  }, [completedProof]);

  useEffect(() => {
    let isMounted = true;
    setStatus(currentProof ? 'saved' : 'loading');
    setStatusMessage(currentProof ? 'Proof saved.' : 'Checking today proof...');

    getCurrentShowerProof(cycleId)
      .then(proof => {
        if (!isMounted) return;
        if (proof && proof.barcode === REQUIRED_SHOWER_BARCODE && proof.uploadStatus === 'saved' && proof.verificationStatus === 'verified') {
          setCurrentProof(proof);
          setStatus('saved');
          setStatusMessage('Proof saved.');
          onVerifiedProof(proof);
          return;
        }
        setStatus('locked');
        setStatusMessage('Product barcode required.');
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus('locked');
        setStatusMessage('Product barcode required. Backend check failed, so the gate is staying locked.');
      });

    return () => {
      isMounted = false;
    };
  }, [cycleId, onVerifiedProof]);

  useEffect(() => {
    if (view === 'current') return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (view === 'scanner') {
          stopCamera();
        }
        setView('current');
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = (Array.from(panelRef.current.querySelectorAll('button, a, input, video, [tabindex]:not([tabindex="-1"])')) as HTMLElement[])
        .filter(element => !element.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [stopCamera, view]);

  useEffect(() => () => {
    stopCamera();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl, stopCamera]);

  const captureStill = useCallback(async (): Promise<Blob> => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      throw new Error('Automatic image capture failed.');
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width <= 0 || height <= 0) {
      throw new Error('Automatic image capture failed.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Automatic image capture failed.');
    }
    context.drawImage(video, 0, 0, width, height);
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Automatic image capture failed.'));
        }
      }, 'image/jpeg', 0.72);
    });
  }, []);

  const uploadCapturedProof = useCallback(async (blob: Blob, capturedAt: string) => {
    setStatus('uploading');
    setStatusMessage('Uploading proof...');
    const proof = await uploadShowerProof({
      cycleId,
      localDate: getLocalDateKey(new Date(capturedAt)),
      barcode: REQUIRED_SHOWER_BARCODE,
      capturedAt,
      imageBlob: blob,
    });
    pendingProofRef.current = null;
    setCurrentProof(proof);
    setStatus('saved');
    setStatusMessage('Proof saved.');
    onVerifiedProof(proof);
    return proof;
  }, [cycleId, onVerifiedProof]);

  const handleBarcodeValue = useCallback(async (value: string) => {
    if (scanHandledRef.current) return;
    scanHandledRef.current = true;

    if (value !== REQUIRED_SHOWER_BARCODE) {
      stopCamera();
      setStatus('incorrect');
      setStatusMessage('Incorrect product barcode.');
      return;
    }

    try {
      setStatus('verified');
      setStatusMessage('Product verified.');
      setStatus('capturing');
      setStatusMessage('Capturing proof...');
      const capturedAt = new Date().toISOString();
      const blob = await captureStill();
      pendingProofRef.current = { blob, capturedAt };
      releasePreview();
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
      await uploadCapturedProof(blob, capturedAt);
      setView('current');
    } catch (error) {
      stopCamera();
      if (pendingProofRef.current) {
        setStatus('upload_failed');
        setStatusMessage(error instanceof Error ? `Upload failed. ${error.message}` : 'Upload failed.');
      } else {
        setStatus('camera_error');
        setStatusMessage(error instanceof Error ? error.message : 'Automatic image capture failed.');
      }
    }
  }, [captureStill, releasePreview, stopCamera, uploadCapturedProof]);

  const startScanner = useCallback(async () => {
    stopCamera();
    releasePreview();
    pendingProofRef.current = null;
    scanHandledRef.current = false;
    setView('scanner');
    setStatus('requesting');
    setStatusMessage('Opening camera...');

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('camera_error');
      setStatusMessage('Camera API unsupported in this browser.');
      return;
    }

    try {
      const video = videoRef.current;
      if (!video) {
        setStatus('camera_error');
        setStatusMessage('Camera preview is not ready.');
        return;
      }

      const BarcodeDetector = getBarcodeDetector();
      const supportedFormats = BarcodeDetector?.getSupportedFormats
        ? await BarcodeDetector.getSupportedFormats()
        : [];
      const canUseNative = Boolean(BarcodeDetector && supportedFormats.includes('upc_a'));

      if (!canUseNative) {
        const [{ BarcodeFormat, BrowserMultiFormatOneDReader }, { DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        const hints = new globalThis.Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.UPC_A]]]);
        const reader = new BrowserMultiFormatOneDReader(hints);
        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { exact: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          video,
          result => {
            if (!result) return;
            if (result.getBarcodeFormat() !== BarcodeFormat.UPC_A) {
              void handleBarcodeValue('');
              return;
            }
            void handleBarcodeValue(String(result.getText() ?? ''));
          },
        );
        zxingControlsRef.current = controls;
        setTorchAvailable(Boolean(controls.switchTorch));
        setStatus('scanning');
        setStatusMessage('Point the camera at the product barcode.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      const track = stream.getVideoTracks()[0];
      const capabilities = typeof track.getCapabilities === 'function'
        ? track.getCapabilities() as TorchMediaTrackCapabilities
        : undefined;
      setTorchAvailable(Boolean(capabilities?.torch));
      setStatus('scanning');
      setStatusMessage('Point the camera at the product barcode.');

      const detector = new BarcodeDetector({ formats: ['upc_a'] });
      const scanFrame = async () => {
        if (!streamRef.current || !videoRef.current || scanHandledRef.current) return;
        if (videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          scanLoopRef.current = window.requestAnimationFrame(scanFrame);
          return;
        }
        try {
          const codes = await detector.detect(videoRef.current);
          const upc = codes.find(code => code.format === 'upc_a' || code.format === 'upc-a');
          if (upc?.rawValue) {
            await handleBarcodeValue(String(upc.rawValue));
            return;
          }
        } catch {
          setStatus('camera_error');
          setStatusMessage('Barcode scanner failed. Try again.');
          stopCamera();
          return;
        }
        scanLoopRef.current = window.requestAnimationFrame(scanFrame);
      };
      scanLoopRef.current = window.requestAnimationFrame(scanFrame);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      setStatus('camera_error');
      setStatusMessage(name === 'NotAllowedError' || name === 'PermissionDeniedError'
        ? 'Camera permission denied. Allow camera access to scan the product.'
        : name === 'OverconstrainedError' || name === 'NotFoundError'
          ? 'No rear camera available on this device.'
        : 'Could not open the rear camera.');
      stopCamera();
    }
  }, [handleBarcodeValue, releasePreview, stopCamera]);

  const toggleTorch = async () => {
    try {
      const nextTorch = !torchOn;
      if (zxingControlsRef.current?.switchTorch) {
        await zxingControlsRef.current.switchTorch(nextTorch);
      } else {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        await track.applyConstraints({ advanced: [{ torch: nextTorch } as MediaTrackConstraintSet] });
      }
      setTorchOn(nextTorch);
    } catch {
      setTorchAvailable(false);
      setTorchOn(false);
      setStatusMessage('Flashlight is not available on this camera.');
    }
  };

  const cancelScanner = () => {
    stopCamera();
    scanHandledRef.current = false;
    setView('current');
    setStatus(isComplete ? 'saved' : 'locked');
    setStatusMessage(isComplete ? 'Proof saved.' : 'Product barcode required.');
  };

  const retryUpload = async () => {
    const pending = pendingProofRef.current;
    if (!pending) {
      setStatus('locked');
      setStatusMessage('Captured proof was lost. Scan again.');
      return;
    }
    try {
      await uploadCapturedProof(pending.blob, pending.capturedAt);
      setView('current');
    } catch (error) {
      setStatus('upload_failed');
      setStatusMessage(error instanceof Error ? `Upload failed. ${error.message}` : 'Upload failed.');
    }
  };

  const openHistory = async () => {
    setView('history');
    setStatus('history_loading');
    setStatusMessage('Loading proof history...');
    try {
      setHistory(await getShowerProofHistory());
      setStatus(isComplete ? 'saved' : 'locked');
      setStatusMessage(isComplete ? 'Proof saved.' : 'Product barcode required.');
    } catch {
      setHistory([]);
      setStatus('history_error');
      setStatusMessage('History failed to load.');
    }
  };

  const scannerBusy = useMemo(() => status === 'requesting' || status === 'scanning' || status === 'verified' || status === 'capturing' || status === 'uploading', [status]);

  return (
    <section id="daily-shower-gate" className={`rounded-[8px] border-2 p-4 shadow-lg ${lockedTone}`}>
      <div ref={panelRef} tabIndex={-1} className="outline-none">
        {view === 'scanner' ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-widest">Shower Gate</p>
                <h2 className="mt-1 text-3xl font-black leading-none">Scan Product Barcode</h2>
                <p className="mt-2 text-sm font-bold opacity-80">{statusMessage}</p>
              </div>
              <button type="button" aria-label="Close scanner" onClick={cancelScanner} className="flex min-h-12 min-w-12 items-center justify-center rounded-[8px] bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <X size={20} />
              </button>
            </div>
            <div className="relative overflow-hidden rounded-[8px] border border-current/20 bg-slate-950">
              <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted autoPlay />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                <div className="h-24 w-full max-w-sm rounded-[8px] border-4 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={cancelScanner} className="flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-4 text-sm font-black uppercase text-white dark:bg-white dark:text-slate-950">
                <X size={18} />
                <span>Cancel</span>
              </button>
              <button type="button" onClick={toggleTorch} disabled={!torchAvailable || !scannerBusy} className="flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-blue-700 px-4 text-sm font-black uppercase text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
                {torchOn ? <FlashlightOff size={18} /> : <Flashlight size={18} />}
                <span>{torchOn ? 'Flash Off' : 'Flash'}</span>
              </button>
            </div>
          </div>
        ) : view === 'history' ? (
          <div className="space-y-4">
            <button type="button" onClick={() => setView('current')} className="flex min-h-12 items-center gap-2 rounded-[8px] bg-slate-950 px-4 text-sm font-black uppercase text-white dark:bg-white dark:text-slate-950">
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <div>
              <p className="text-sm font-black uppercase tracking-widest">Proof History</p>
              <h2 className="mt-1 text-3xl font-black leading-none">Newest Proofs</h2>
              <p className="mt-2 text-sm font-bold opacity-80">{status === 'history_error' ? 'History failed to load.' : 'Proofs saved by daily cycle.'}</p>
            </div>
            {status === 'history_loading' ? (
              <p className="flex min-h-20 items-center gap-2 rounded-[8px] border border-current/20 bg-white/70 p-4 font-bold dark:bg-black/20"><Loader2 className="animate-spin" size={18} /> Loading history</p>
            ) : history.length === 0 ? (
              <p className="rounded-[8px] border border-current/20 bg-white/70 p-4 font-bold dark:bg-black/20">{status === 'history_error' ? 'History load failed.' : 'No proofs found.'}</p>
            ) : (
              <div className="space-y-3">
                {history.map(proof => (
                  <article key={proof.id} className="rounded-[8px] border border-current/20 bg-white/70 p-3 dark:bg-black/20">
                    <div className="flex gap-3">
                      {historyImageFailures[proof.id] ? (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[8px] bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                          <ImageIcon size={20} />
                        </div>
                      ) : (
                        <img src={proof.imageUrl} alt="Saved shower proof thumbnail" onError={() => setHistoryImageFailures(prev => ({ ...prev, [proof.id]: true }))} className="h-20 w-20 shrink-0 rounded-[8px] object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-black">{formatProofDate(proof.capturedAt)} at {formatProofTime(proof.capturedAt)}</p>
                        <p className="text-sm font-bold opacity-80">Barcode ending {getBarcodeEnding(proof.barcode)}</p>
                        <p className="text-sm font-bold opacity-80">Upload {proof.uploadStatus} · Verification {proof.verificationStatus}</p>
                        <button type="button" onClick={() => { setCurrentProof(proof); setProofImageFailed(false); setView('today'); }} className="mt-2 min-h-12 rounded-[8px] bg-blue-700 px-4 text-sm font-black uppercase text-white">
                          Open Full-Size Proof
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : view === 'today' ? (
          <div className="space-y-4">
            <button type="button" onClick={() => setView('current')} className="flex min-h-12 items-center gap-2 rounded-[8px] bg-slate-950 px-4 text-sm font-black uppercase text-white dark:bg-white dark:text-slate-950">
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <div>
              <p className="text-sm font-black uppercase tracking-widest">Today&apos;s Proof</p>
              <h2 className="mt-1 text-3xl font-black leading-none">{currentProof ? 'Daily Shower Verified' : 'Image unavailable'}</h2>
              {currentProof && <p className="mt-2 text-sm font-bold opacity-80">{formatProofDate(currentProof.capturedAt)} at {formatProofTime(currentProof.capturedAt)} · Verification {currentProof.verificationStatus}</p>}
            </div>
            {currentProof && !proofImageFailed ? (
              <img src={currentProof.imageUrl} alt="Today shower proof" onError={() => setProofImageFailed(true)} className="max-h-[70vh] w-full rounded-[8px] object-contain" />
            ) : (
              <p className="rounded-[8px] border border-current/20 bg-white/70 p-4 font-bold dark:bg-black/20">Image unavailable.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={`rounded-[8px] p-3 ${isComplete ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-slate-950'}`}>
                {isComplete ? <ShieldCheck size={26} /> : <ShieldAlert size={26} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black uppercase tracking-widest">Daily Shower Gate - 6:00 AM Reset</p>
                <h2 className="mt-1 text-3xl font-black leading-none">{isComplete ? 'Daily Shower Verified' : 'Shower Gate Locked'}</h2>
                <p className="mt-2 text-sm font-bold opacity-80">Cycle: {cycleLabel}. {isComplete ? `Completed ${formatProofTime(currentProof!.capturedAt)}.` : 'Product barcode required.'}</p>
              </div>
            </div>

            {previewUrl && status === 'upload_failed' && (
              <img src={previewUrl} alt="Captured shower proof awaiting retry" className="max-h-72 w-full rounded-[8px] object-contain" />
            )}

            {isComplete && currentProof ? (
              <div className="grid gap-3 lg:grid-cols-[120px_1fr]">
                <img src={currentProof.imageUrl} alt="Today shower proof thumbnail" onError={() => setProofImageFailed(true)} className="h-28 w-full rounded-[8px] object-cover lg:h-full" />
                <div className="rounded-[8px] border border-current/20 bg-white/70 p-3 text-sm font-bold dark:bg-black/20">
                  <p>Product barcode matched.</p>
                  <p>Proof saved on file.</p>
                  <p>Completion time: {formatProofTime(currentProof.capturedAt)}</p>
                  <p>Barcode ending {getBarcodeEnding(currentProof.barcode)}.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-[8px] border border-current/20 bg-white/70 p-3 text-sm font-bold dark:bg-black/20">
                <p>{statusMessage}</p>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {status === 'upload_failed' ? (
                <button type="button" onClick={retryUpload} className="flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-blue-700 px-4 text-sm font-black uppercase text-white">
                  <Loader2 size={18} />
                  <span>Retry Upload</span>
                </button>
              ) : isComplete ? (
                <button type="button" onClick={() => { setProofImageFailed(false); setView('today'); }} className="flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-4 text-sm font-black uppercase text-white dark:bg-white dark:text-slate-950">
                  <ImageIcon size={18} />
                  <span>View Today&apos;s Proof</span>
                </button>
              ) : (
                <button type="button" onClick={startScanner} disabled={status === 'loading'} className="flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-4 text-sm font-black uppercase text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:bg-white dark:text-slate-950">
                  <ScanLine size={18} />
                  <span>Scan Product Barcode</span>
                </button>
              )}
              <button type="button" onClick={openHistory} className="flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-blue-700 px-4 text-sm font-black uppercase text-white">
                <History size={18} />
                <span>View Proof History</span>
              </button>
            </div>

            {status === 'incorrect' && (
              <button type="button" onClick={startScanner} className="min-h-12 w-full rounded-[8px] bg-rose-700 px-4 text-sm font-black uppercase text-white">
                Scan Again
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
