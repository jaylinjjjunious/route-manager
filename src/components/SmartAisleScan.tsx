import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Camera, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle,
  RefreshCw, Eye, Upload, ChevronRight,
  MapPin, ShieldCheck, Info, ZoomIn,
} from 'lucide-react';
import type {
  AisleScanSession,
  AisleScanPhoto,
  SmartAisleScanPhase,
  CaptureDirection,
  AisleSide,
  PhotoRole,
  ScanChecklist,
} from '../types';
import {
  createSession, getSession, updateSession, savePhoto, getPhoto,
  getActivePhotos, createAnalysisCopy, createThumbnail, validatePhoto,
  captureFrameFromVideo, analyzeCoveragePairwise, stitchPhotos,
  SCAN_CONFIG, defaultChecklist, deleteSession, getActiveSessionForJob,
} from '../services/scan/sessionService';

interface SmartAisleScanProps {
  jobId: string;
  jobName: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (sessionId: string) => void;
}

export default function SmartAisleScan({ jobId, jobName, isOpen, onClose, onComplete }: SmartAisleScanProps) {
  const [phase, setPhase] = useState<SmartAisleScanPhase>('setup');
  const [session, setSession] = useState<AisleScanSession | null>(null);
  const [direction, setDirection] = useState<CaptureDirection>('left_to_right');
  const [aisleSide, setAisleSide] = useState<AisleSide>('both');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [lastAnalysisUrl, setLastAnalysisUrl] = useState<string | null>(null);
  const [holdTimer, setHoldTimer] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [captureCooldown, setCaptureCooldown] = useState(false);
  const [currentWarnings, setCurrentWarnings] = useState<string[]>([]);
  const [stitchProgress, setStitchProgress] = useState('');
  const [checklist, setChecklist] = useState<ScanChecklist>(defaultChecklist());
  const [confirmStitch, setConfirmStitch] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'1' | '0.5'>('1');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanLoopRef = useRef<number>(0);

  // Restore existing session
  useEffect(() => {
    if (!isOpen) return;
    const existing = getActiveSessionForJob(jobId);
    if (existing) {
      setSession(existing);
      setDirection(existing.captureDirection);
      setAisleSide(existing.aisleSide);
      setChecklist(existing.checklist);
      if (existing.status === 'capturing') {
        setPhase('capturing');
        startCamera();
      } else if (existing.status === 'coverage_review') {
        setPhase('coverage_review');
      } else if (existing.status === 'stitch_review') {
        setPhase('stitch_review');
      } else if (existing.status === 'ready_to_submit') {
        setPhase('final_checklist');
      } else {
        setPhase('setup');
      }
    }
    return () => stopCamera();
  }, [isOpen, jobId]);

  // Camera
  const startCamera = useCallback(async (zoom?: '1' | '0.5') => {
    setCameraError(null);
    const z = zoom || zoomLevel;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = s;
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      // Apply zoom
      const track = s.getVideoTracks()[0];
      if (track) {
        const capabilities = typeof track.getCapabilities === 'function' ? (track.getCapabilities() as any) : null;
        if (capabilities?.zoom) {
          const maxZoom = capabilities.zoom.max || 1;
          const minZoom = capabilities.zoom.min || 1;
          const targetZoom = z === '0.5' ? Math.max(minZoom, 0.5) : Math.min(maxZoom, 1);
          try {
            await track.applyConstraints({ advanced: [{ zoom: targetZoom } as any] });
          } catch {
            // Fallback: CSS scale on the video element
            if (videoRef.current) {
              videoRef.current.style.transform = z === '0.5' ? 'scale(1.8)' : 'scale(1)';
              videoRef.current.style.transformOrigin = 'center center';
            }
          }
        } else {
          // No zoom capability — use CSS scale fallback
          if (videoRef.current) {
            videoRef.current.style.transform = z === '0.5' ? 'scale(1.8)' : 'scale(1)';
            videoRef.current.style.transformOrigin = 'center center';
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(`Camera error: ${err.message}`);
      }
    }
  }, [zoomLevel]);

  const toggleZoom = useCallback(async () => {
    const next = zoomLevel === '1' ? '0.5' : '1';
    setZoomLevel(next);
    // Apply zoom to existing stream
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        const capabilities = typeof track.getCapabilities === 'function' ? (track.getCapabilities() as any) : null;
        if (capabilities?.zoom) {
          const maxZoom = capabilities.zoom.max || 1;
          const minZoom = capabilities.zoom.min || 1;
          const targetZoom = next === '0.5' ? Math.max(minZoom, 0.5) : Math.min(maxZoom, 1);
          try {
            await track.applyConstraints({ advanced: [{ zoom: targetZoom } as any] });
          } catch {
            if (videoRef.current) {
              videoRef.current.style.transform = next === '0.5' ? 'scale(1.8)' : 'scale(1)';
              videoRef.current.style.transformOrigin = 'center center';
            }
          }
        } else {
          if (videoRef.current) {
            videoRef.current.style.transform = next === '0.5' ? 'scale(1.8)' : 'scale(1)';
            videoRef.current.style.transformOrigin = 'center center';
          }
        }
      }
    }
  }, [zoomLevel]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.style.transform = '';
      videoRef.current.style.transformOrigin = '';
    }
    setStream(null);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
  }, []);

  // Begin scan
  const handleBeginScan = async () => {
    const s = createSession(jobId, direction, aisleSide);
    setSession(s);
    setPhase('capturing');
    await startCamera();
  };

  // Capture photo
  const handleCapture = useCallback(async (role: PhotoRole) => {
    if (!videoRef.current || !session) return;
    setCaptureCooldown(true);

    const dataUrl = captureFrameFromVideo(videoRef.current);
    const { dataUrl: analysisUrl, width, height } = await createAnalysisCopy(dataUrl);
    const prevSession = getSession(session.id);
    const prevPhotoId = prevSession?.photoSequence[prevSession.photoSequence.length - 1];
    const prevPhoto = prevPhotoId ? getPhoto(prevPhotoId) : null;
    const validation = await validatePhoto(analysisUrl, prevPhoto?.analysisDataUrl || null, role as any);

    const photo: AisleScanPhoto = {
      id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sessionId: session.id,
      sequenceNumber: (prevSession?.photoSequence.length || 0) + 1,
      role,
      dataUrl,
      analysisDataUrl: analysisUrl,
      capturedAt: new Date().toISOString(),
      captureDirection: direction,
      aisleSide,
      captureMethod: 'automatic',
      width,
      height,
      validation,
      overlapWithPrevious: null,
      retakeOfPhotoId: null,
      isActive: true,
    };

    savePhoto(photo);
    const updated = updateSession(session.id, {
      photoSequence: [...(prevSession?.photoSequence || []), photo.id],
      checklist: {
        ...checklist,
        beginningCaptured: checklist.beginningCaptured || role === 'beginning',
        endingCaptured: checklist.endingCaptured || role === 'ending',
        contextPhotoCaptured: checklist.contextPhotoCaptured || role === 'context',
      },
    });
    if (updated) setSession(updated);
    setLastAnalysisUrl(analysisUrl);
    setCurrentWarnings(validation.warnings);

    if (role === 'beginning') {
      // nothing special
    } else if (role === 'ending') {
      setPhase('context');
    } else if (role === 'context') {
      setPhase('coverage_review');
      stopCamera();
    }

    setTimeout(() => setCaptureCooldown(false), SCAN_CONFIG.autoCaptureCooldownMs);
  }, [session, direction, aisleSide, checklist, stopCamera]);

  // Auto-capture loop
  useEffect(() => {
    if (phase !== 'capturing' || !stream || captureCooldown || !session) return;

    const runLoop = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        scanLoopRef.current = requestAnimationFrame(runLoop);
        return;
      }
      scanLoopRef.current = requestAnimationFrame(runLoop);
    };
    scanLoopRef.current = requestAnimationFrame(runLoop);
    return () => { if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current); };
  }, [phase, stream, captureCooldown, session]);

  // Hold timer for auto-capture
  useEffect(() => {
    if (!isHolding || captureCooldown) {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      setHoldTimer(0);
      return;
    }
    let elapsed = 0;
    holdIntervalRef.current = setInterval(() => {
      elapsed += 100;
      setHoldTimer(elapsed);
      if (elapsed >= SCAN_CONFIG.steadyHoldMs) {
        handleCapture('section');
        setIsHolding(false);
      }
    }, 100);
    return () => { if (holdIntervalRef.current) clearInterval(holdIntervalRef.current); };
  }, [isHolding, captureCooldown, handleCapture]);

  // Coverage review
  const photos = session ? getActivePhotos(session.id) : [];
  const warnings = session ? analyzeCoveragePairwise(photos) : [];

  // Stitch
  const handleStitch = async () => {
    if (!session) return;
    setPhase('stitching');
    setStitchProgress('Preparing images...');
    await new Promise(r => setTimeout(r, 300));

    const activePhotos = getActivePhotos(session.id);
    setStitchProgress(`Matching ${activePhotos.length} sections...`);
    await new Promise(r => setTimeout(r, 200));

    setStitchProgress('Aligning photos...');
    const preview = await stitchPhotos(activePhotos);
    setStitchProgress('Building aisle preview...');
    await new Promise(r => setTimeout(r, 200));

    const updated = updateSession(session.id, {
      stitchStatus: preview ? 'successful' : 'failed',
      stitchedPreviewDataUrl: preview,
      stitchVersion: (session.stitchVersion || 0) + 1,
      status: 'stitch_review',
    });
    if (updated) setSession(updated);
    setPhase('stitch_review');
    setStitchProgress('');
  };

  // Final submit
  const handleSubmit = () => {
    if (!session) return;
    const allChecked = checklist.beginningCaptured && checklist.endingCaptured &&
      checklist.contextPhotoCaptured && checklist.stitchReviewed &&
      (checklist.criticalFailuresResolved || warnings.filter(w => w.severity === 'critical').length === 0);

    if (!allChecked && !showOverride) {
      setShowOverride(true);
      return;
    }

    updateSession(session.id, {
      status: 'submitted',
      completedAt: new Date().toISOString(),
      checklist,
      override: showOverride ? {
        reason: overrideReason,
        note: overrideNote || null,
        confirmedAt: new Date().toISOString(),
      } : null,
    });
    onComplete(session.id);
    onClose();
  };

  // Toggle checklist
  const toggleCheck = (key: keyof ScanChecklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Modal
  if (!isOpen) return null;

  const isCapturing = phase === 'capturing' || phase === 'ending' || phase === 'context';

  const modal = (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md ${isCapturing ? 'p-0' : 'p-2'}`} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className={`relative flex flex-col overflow-hidden border border-white/10 bg-[#111214] shadow-2xl ${
          isCapturing
            ? 'w-full h-full rounded-none max-w-none'
            : 'w-full max-w-[430px] rounded-2xl'
        }`}
        style={isCapturing ? { maxHeight: '100dvh' } : { maxHeight: 'min(92dvh, 700px)' }}
      >
        {/* Header — hidden during full-screen capture */}
        {!isCapturing && (
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="text-sm font-black text-white">Smart Aisle Scan</h2>
            <p className="text-[10px] text-white/40">{jobName}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-slate-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>
        )}

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
          {/* ─── SETUP ─── */}
          {phase === 'setup' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold text-white/70 mb-3">Capture Direction</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['left_to_right', 'Left → Right', ArrowRight],
                    ['right_to_left', 'Right → Left', ArrowLeft],
                  ] as const).map(([val, label, Icon]) => (
                    <button key={val} onClick={() => setDirection(val)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition ${direction === val ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300' : 'border-white/10 bg-white/5 text-white/50 hover:text-white/70'}`}>
                      <Icon size={14} />{label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold text-white/70 mb-3">Category Location</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['left', 'Left Side'],
                    ['right', 'Right Side'],
                    ['both', 'Both Sides'],
                    ['endcap', 'Endcap'],
                  ] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setAisleSide(val)}
                      className={`rounded-xl border px-3 py-3 text-xs font-bold transition ${aisleSide === val ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300' : 'border-white/10 bg-white/5 text-white/50 hover:text-white/70'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                <div className="flex items-start gap-2">
                  <Info size={14} className="mt-0.5 text-cyan-400 shrink-0" />
                  <p className="text-[11px] text-cyan-300/80">
                    Begin at the very first edge of the required category.
                    Keep the camera straight and include the top shelf, bottom shelf, and category boundaries.
                    Move slowly in the selected direction. The app will guide each section.
                  </p>
                </div>
              </div>

              <button onClick={handleBeginScan}
                className="w-full rounded-xl bg-cyan-600 py-3.5 text-sm font-black text-white hover:bg-cyan-500 transition flex items-center justify-center gap-2">
                <Camera size={16} /> Begin Capture
              </button>
            </div>
          )}

          {/* ─── CAPTURING (full-screen camera) ─── */}
          {phase === 'capturing' && (
            <div className="relative flex-1 min-h-0 bg-black">
              {cameraError ? (
                <div className="flex flex-col items-center justify-center h-full p-6">
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 max-w-sm text-center">
                    <p className="text-xs text-red-300">{cameraError}</p>
                    <button onClick={() => startCamera()} className="mt-3 text-xs text-cyan-400 hover:text-cyan-300">Retry</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Camera feed fills entire area */}
                  <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Gradient overlays for readability */}
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

                  {/* Top-left: Close + direction */}
                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                    <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white transition">
                      <X size={18} />
                    </button>
                    <div className="flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1.5 text-[11px] font-bold text-white/90">
                      {direction === 'left_to_right' ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
                      {photos.length} sections
                    </div>
                  </div>

                  {/* Top-right: Zoom toggle + quality warnings */}
                  <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
                    <button onClick={toggleZoom}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white transition">
                      <span className="text-[11px] font-black">{zoomLevel === '0.5' ? '0.5' : '1x'}</span>
                    </button>
                    {currentWarnings.map((w, i) => (
                      <div key={i} className="flex items-center gap-1 rounded-lg bg-amber-500/90 px-2 py-1 text-[10px] font-bold text-black">
                        <AlertTriangle size={10} />{w}
                      </div>
                    ))}
                  </div>

                  {/* Alignment guide lines */}
                  <div className="absolute inset-0 pointer-events-none z-[5]">
                    <div className="absolute left-1/4 top-0 bottom-0 w-px bg-cyan-400/25" />
                    <div className="absolute right-1/4 top-0 bottom-0 w-px bg-cyan-400/25" />
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-cyan-400/25" />
                    <div className="absolute bottom-1/3 left-0 right-0 h-px bg-cyan-400/25" />
                  </div>

                  {/* Hold progress indicator */}
                  {isHolding && (
                    <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-10">
                      <div className="h-2 w-40 rounded-full bg-black/60 overflow-hidden">
                        <div className="h-full bg-cyan-400 transition-all" style={{ width: `${(holdTimer / SCAN_CONFIG.steadyHoldMs) * 100}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Bottom controls */}
                  <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-2 space-y-2">
                    {/* Capture buttons */}
                    {photos.length === 0 ? (
                      <button onClick={() => handleCapture('beginning')}
                        className="w-full rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white hover:bg-emerald-500 transition flex items-center justify-center gap-2">
                        <Camera size={18} /> Capture Beginning
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onMouseDown={() => setIsHolding(true)}
                          onMouseUp={() => setIsHolding(false)}
                          onMouseLeave={() => setIsHolding(false)}
                          onTouchStart={() => setIsHolding(true)}
                          onTouchEnd={() => setIsHolding(false)}
                          disabled={captureCooldown}
                          className="flex-1 rounded-2xl bg-cyan-600 py-4 text-sm font-black text-white hover:bg-cyan-500 transition flex items-center justify-center gap-2 disabled:opacity-50">
                          <Camera size={18} /> Hold to Capture
                        </button>
                        <button onClick={() => handleCapture('section')}
                          disabled={captureCooldown}
                          className="rounded-2xl border-2 border-white/20 bg-white/10 px-5 py-4 text-sm font-bold text-white/80 hover:text-white transition disabled:opacity-50">
                          Snap
                        </button>
                      </div>
                    )}

                    {/* I Reached the End */}
                    {photos.length > 0 && (
                      <button onClick={() => { setPhase('ending'); }}
                        className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/15 py-3 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition flex items-center justify-center gap-2">
                        <CheckCircle2 size={14} /> I Reached the End
                      </button>
                    )}

                    {/* Progress strip */}
                    <div className="flex items-center gap-1 overflow-x-auto py-1 justify-center">
                      {photos.map((p) => (
                        <div key={p.id} className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-bold ${
                          p.role === 'beginning' ? 'bg-emerald-500/30 text-emerald-300' :
                          p.role === 'ending' ? 'bg-amber-500/30 text-amber-300' :
                          'bg-white/15 text-white/60'
                        }`}>
                          {p.role === 'beginning' ? 'Start' : `S${p.sequenceNumber}`}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── ENDING (full-screen camera) ─── */}
          {phase === 'ending' && (
            <div className="relative flex-1 min-h-0 bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

              <div className="absolute top-3 left-3 z-10">
                <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white transition">
                  <X size={18} />
                </button>
              </div>

              <div className="absolute top-3 left-16 z-10 max-w-xs rounded-xl border border-amber-500/30 bg-black/50 px-3 py-2">
                <p className="text-[11px] text-amber-200/90">
                  Capture the far end of the category. Include neighboring shelving, top shelf, bottom shelf, and ending boundary.
                </p>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
                <button onClick={() => handleCapture('ending')}
                  className="w-full rounded-2xl bg-amber-600 py-4 text-sm font-black text-white hover:bg-amber-500 transition flex items-center justify-center gap-2">
                  <Camera size={18} /> Capture Ending
                </button>
              </div>
            </div>
          )}

          {/* ─── CONTEXT (full-screen camera) ─── */}
          {phase === 'context' && (
            <div className="relative flex-1 min-h-0 bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

              <div className="absolute top-3 left-3 z-10">
                <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white transition">
                  <X size={18} />
                </button>
              </div>

              <div className="absolute top-3 left-16 z-10 max-w-xs rounded-xl border border-blue-500/30 bg-black/50 px-3 py-2">
                <p className="text-[11px] text-blue-200/90">
                  Take a wide context photo showing the aisle, which side the category is on, and approximate length.
                </p>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
                <button onClick={() => handleCapture('context')}
                  className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-black text-white hover:bg-blue-500 transition flex items-center justify-center gap-2">
                  <MapPin size={18} /> Capture Context Photo
                </button>
              </div>
            </div>
          )}

          {/* ─── COVERAGE REVIEW ─── */}
          {phase === 'coverage_review' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-white/70">Coverage Review</p>
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                <span className="shrink-0 rounded-lg bg-emerald-500/20 px-2 py-1 text-[9px] font-bold text-emerald-300">Start ✓</span>
                {photos.filter(p => p.role === 'section').map(p => (
                  <div key={p.id} className="flex items-center gap-1">
                    <ChevronRight size={8} className="text-white/20 shrink-0" />
                    <span className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-bold ${
                      p.validation.passed ? 'bg-white/10 text-white/50' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      S{p.sequenceNumber} {p.validation.passed ? '✓' : '⚠'}
                    </span>
                  </div>
                ))}
                <ChevronRight size={8} className="text-white/20 shrink-0" />
                <span className="shrink-0 rounded-lg bg-amber-500/20 px-2 py-1 text-[9px] font-bold text-amber-300">End ✓</span>
              </div>

              {warnings.length > 0 && (
                <div className="space-y-1">
                  {warnings.map(w => (
                    <div key={w.id} className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                      <AlertTriangle size={12} className="mt-0.5 text-amber-400 shrink-0" />
                      <p className="text-[10px] text-amber-300/80">{w.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5">
                  {photos.slice(0, 9).map(p => (
                    <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-black/30">
                      <img src={p.dataUrl} alt={`Section ${p.sequenceNumber}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[8px] font-bold text-white/70">
                        {p.role === 'beginning' ? 'Start' : p.role === 'ending' ? 'End' : p.role === 'context' ? 'Ctx' : `S${p.sequenceNumber}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setPhase('capturing'); startCamera(); }}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white/60 hover:text-white/80 transition flex items-center justify-center gap-1">
                  <RefreshCw size={12} /> Retake
                </button>
                <button onClick={handleStitch}
                  className="flex-1 rounded-xl bg-cyan-600 py-2.5 text-xs font-black text-white hover:bg-cyan-500 transition flex items-center justify-center gap-1">
                  <Eye size={14} /> Review & Stitch
                </button>
              </div>
            </div>
          )}

          {/* ─── STITCHING ─── */}
          {phase === 'stitching' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-cyan-400 border-t-transparent" />
              <p className="text-xs text-white/60">{stitchProgress || 'Processing...'}</p>
            </div>
          )}

          {/* ─── STITCH REVIEW ─── */}
          {phase === 'stitch_review' && session?.stitchedPreviewDataUrl && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-white/70">Aisle Stitch Review</p>
              <div className="relative rounded-xl overflow-hidden bg-black/30 border border-white/10" style={{ maxHeight: '300px' }}>
                <img src={session.stitchedPreviewDataUrl} alt="Stitched aisle"
                  className="w-full object-contain" style={{ maxHeight: '300px' }} />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <ShieldCheck size={14} className={session.stitchStatus === 'successful' ? 'text-emerald-400' : 'text-amber-400'} />
                <div>
                  <p className="text-[11px] font-bold text-white/80">
                    {session.stitchStatus === 'successful' ? 'Stitch Successful' : 'Review Recommended'}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {session.stitchStatus === 'successful'
                      ? 'The sequence appears continuous from beginning to end.'
                      : 'One or more areas may need review.'}
                  </p>
                </div>
              </div>

              {warnings.length > 0 && (
                <div className="space-y-1">
                  {warnings.map(w => (
                    <div key={w.id} className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                      <AlertTriangle size={12} className="mt-0.5 text-amber-400 shrink-0" />
                      <p className="text-[10px] text-amber-300/80">{w.message}</p>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer">
                <input type="checkbox" checked={confirmStitch} onChange={e => setConfirmStitch(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500" />
                <span className="text-[11px] text-white/70">
                  I reviewed the stitched aisle and confirmed the full category is visible from beginning to end.
                </span>
              </label>

              <div className="flex gap-2">
                <button onClick={() => { setPhase('coverage_review'); }}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white/60 hover:text-white/80 transition">
                  Back
                </button>
                <button onClick={() => { setChecklist(prev => ({ ...prev, stitchReviewed: confirmStitch })); setPhase('final_checklist'); }}
                  disabled={!confirmStitch}
                  className="flex-1 rounded-xl bg-cyan-600 py-2.5 text-xs font-black text-white hover:bg-cyan-500 transition disabled:opacity-40 flex items-center justify-center gap-1">
                  <CheckCircle2 size={14} /> Continue
                </button>
              </div>
            </div>
          )}

          {/* ─── FINAL CHECKLIST ─── */}
          {phase === 'final_checklist' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-white/70">Final Verification</p>
              {([
                ['beginningCaptured', 'Beginning of category captured'],
                ['endingCaptured', 'Ending of category captured'],
                ['continuousSequence', 'Photos form one continuous sequence'],
                ['overlapPresent', 'Required overlap is present'],
                ['topShelvesVisible', 'Top shelves are visible'],
                ['bottomShelvesVisible', 'Bottom shelves are visible'],
                ['noMajorSkips', 'No major category section is skipped'],
                ['photosClear', 'Photos are clear and readable'],
                ['contextPhotoCaptured', 'Aisle context photo captured'],
                ['warningsReviewed', 'Coverage warnings reviewed'],
                ['stitchReviewed', 'Stitched aisle reviewed'],
                ['criticalFailuresResolved', 'Critical stitching failures resolved'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer">
                  <input type="checkbox" checked={checklist[key]} onChange={() => toggleCheck(key)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500" />
                  <span className="text-[11px] text-white/70">{label}</span>
                </label>
              ))}

              {showOverride && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                  <p className="text-[10px] font-bold text-amber-300">Manual Override</p>
                  <select value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                    <option value="">Select reason...</option>
                    <option value="reflective">Reflective packaging prevented matching</option>
                    <option value="repetitive">Repetitive packaging caused incorrect match</option>
                    <option value="fixture">Store fixture blocked transition</option>
                    <option value="manual">Photos manually verified despite stitch failure</option>
                    <option value="other">Other</option>
                  </select>
                  {overrideReason === 'other' && (
                    <textarea value={overrideNote} onChange={e => setOverrideNote(e.target.value)}
                      placeholder="Explain..."
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 h-16 resize-none" />
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setPhase('stitch_review')}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white/60 hover:text-white/80 transition">
                  Back
                </button>
                <button onClick={handleSubmit}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-500 transition flex items-center justify-center gap-1">
                  <Upload size={14} /> Submit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
