import { useState, useEffect, useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Camera, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle,
  RefreshCw, Eye, Upload, ChevronRight,
  ShieldCheck, Info,
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

type CameraCapturePhase =
  | 'ready_for_start'
  | 'capturing_start'
  | 'ready_for_burst'
  | 'burst_capturing'
  | 'burst_paused'
  | 'ending'
  | 'stitching'
  | 'stitch_review'
  | 'error';

const CAPTURE_TRANSITIONS: Record<CameraCapturePhase, CameraCapturePhase[]> = {
  ready_for_start: ['capturing_start', 'error'],
  capturing_start: ['ready_for_burst', 'ready_for_start', 'error'],
  ready_for_burst: ['burst_capturing', 'ending', 'error'],
  burst_capturing: ['burst_paused', 'ending', 'error'],
  burst_paused: ['burst_capturing', 'ending', 'error'],
  ending: ['stitching', 'burst_paused', 'error'],
  stitching: ['stitch_review', 'burst_paused', 'error'],
  stitch_review: ['burst_paused', 'error'],
  error: ['ready_for_start', 'ready_for_burst', 'burst_paused'],
};

const HOLD_TO_BURST_THRESHOLD_MS = 220;
const BURST_CAPTURE_INTERVAL_MS = 650;
const MAX_BURST_PHOTOS = 36;
interface SmartAisleScanProps {
  jobId: string;
  jobName: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (sessionId: string) => void;
  onVerificationEvent?: (event: SmartAisleScanVerificationEvent) => void;
}

export interface SmartAisleScanVerificationEvent {
  type: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

export default function SmartAisleScan({ jobId, jobName, isOpen, onClose, onComplete, onVerificationEvent }: SmartAisleScanProps) {
  const [phase, setPhase] = useState<SmartAisleScanPhase>('setup');
  const [capturePhase, setCapturePhase] = useState<CameraCapturePhase>('ready_for_start');
  const [session, setSession] = useState<AisleScanSession | null>(null);
  const [direction, setDirection] = useState<CaptureDirection>('left_to_right');
  const [aisleSide, setAisleSide] = useState<AisleSide>('both');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [lastAnalysisUrl, setLastAnalysisUrl] = useState<string | null>(null);
  const [burstProgress, setBurstProgress] = useState(0);
  const [captureCooldown, setCaptureCooldown] = useState(false);
  const [currentWarnings, setCurrentWarnings] = useState<string[]>([]);
  const [stitchProgress, setStitchProgress] = useState('');
  const [checklist, setChecklist] = useState<ScanChecklist>(defaultChecklist());
  const [confirmStitch, setConfirmStitch] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'1' | '0.5'>('1');
  const [startCapturePreviewUrl, setStartCapturePreviewUrl] = useState<string | null>(null);
  const [startCaptureSettled, setStartCaptureSettled] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [burstStatusMessage, setBurstStatusMessage] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number>(0);
  const burstHoldActiveRef = useRef(false);
  const burstStartedRef = useRef(false);
  const burstSavedThisHoldRef = useRef(0);
  const holdThresholdTimerRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);
  const captureWritePromiseRef = useRef<Promise<AisleScanSession | null> | null>(null);
  const stitchRequestedRef = useRef(false);

  const emitVerificationEvent = useCallback((type: string, detail?: Record<string, unknown>) => {
    onVerificationEvent?.({ type, timestamp: new Date().toISOString(), detail });
  }, [onVerificationEvent]);

  const transitionCapturePhase = useCallback((next: CameraCapturePhase) => {
    setCapturePhase(prev => {
      if (!CAPTURE_TRANSITIONS[prev].includes(next)) {
        emitVerificationEvent('capture_phase_transition_blocked', { from: prev, to: next });
        return prev;
      }
      emitVerificationEvent('capture_phase_transition', { from: prev, to: next });
      return next;
    });
  }, [emitVerificationEvent]);

  const flashShutter = useCallback(() => {
    setShutterFlash(true);
    window.setTimeout(() => setShutterFlash(false), 160);
  }, []);

  const clearBurstTimers = useCallback(() => {
    if (holdThresholdTimerRef.current) {
      clearTimeout(holdThresholdTimerRef.current);
      holdThresholdTimerRef.current = null;
    }
    if (burstTimerRef.current) {
      clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }
  }, []);

  const stopActiveBurst = useCallback((completed: boolean) => {
    burstHoldActiveRef.current = false;
    clearBurstTimers();
    emitVerificationEvent('burst_stop_requested', { completed, capturePhase });
    if (capturePhase === 'burst_capturing') {
      transitionCapturePhase(completed ? 'burst_paused' : 'ready_for_burst');
    }
    if (completed) {
      setBurstStatusMessage('Burst Complete');
    } else if (capturePhase === 'ready_for_burst' || capturePhase === 'burst_capturing') {
      setBurstStatusMessage('Hold the button to capture continuously.');
    }
  }, [capturePhase, clearBurstTimers, emitVerificationEvent, transitionCapturePhase]);
  // Restore existing session
  useEffect(() => {
    if (!isOpen) return;
    const existing = getActiveSessionForJob(jobId);
    if (existing) {
      setSession(existing);
      setDirection(existing.captureDirection);
      setAisleSide(existing.aisleSide);
      setChecklist(existing.checklist);
      const activePhotos = getActivePhotos(existing.id);
      const beginningPhoto = activePhotos.find(p => p.role === 'beginning');
      if (beginningPhoto) {
        setStartCapturePreviewUrl(beginningPhoto.dataUrl);
        setStartCaptureSettled(true);
      }
      if (existing.status === 'capturing') {
        setPhase('capturing');
        setCapturePhase(beginningPhoto ? 'ready_for_burst' : 'ready_for_start');
        startCamera();
      } else if (existing.status === 'coverage_review') {
        setPhase('coverage_review');
        setCapturePhase('burst_paused');
      } else if (existing.status === 'stitch_review') {
        setPhase('stitch_review');
        setCapturePhase('stitch_review');
      } else if (existing.status === 'ready_to_submit') {
        setPhase('final_checklist');
        setCapturePhase('stitch_review');
      } else {
        setPhase('setup');
        setCapturePhase('ready_for_start');
      }
    }
    return () => {
      clearBurstTimers();
      stopCamera();
    };
  }, [isOpen, jobId, clearBurstTimers]);

  // Camera
  const startCamera = useCallback(async (zoom?: '1' | '0.5') => {
    setCameraError(null);
    setCameraReady(false);
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
        setCameraReady(videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0);
        emitVerificationEvent('camera_stream_ready', {
          videoWidth: videoRef.current.videoWidth,
          videoHeight: videoRef.current.videoHeight,
          tracks: s.getVideoTracks().map(track => ({
            label: track.label,
            readyState: track.readyState,
            facingMode: track.getSettings?.().facingMode,
            width: track.getSettings?.().width,
            height: track.getSettings?.().height,
          })),
        });
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
      emitVerificationEvent('camera_stream_error', { name: err.name, message: err.message });
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(`Camera error: ${err.message}`);
      }
    }
  }, [zoomLevel, emitVerificationEvent]);

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
  }, [zoomLevel, emitVerificationEvent]);

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
    setCameraReady(false);
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
  }, []);

  // Begin scan
  const handleBeginScan = async () => {
    const mode = jobId.startsWith('test_lab_') ? 'test_lab' : 'audit';
    setStartCapturePreviewUrl(null);
    setStartCaptureSettled(false);
    setBurstProgress(0);
    setBurstStatusMessage('');
    stitchRequestedRef.current = false;
    setCapturePhase('ready_for_start');
    const s = createSession(jobId, direction, aisleSide, mode);
    setSession(s);
    setPhase('capturing');
    await startCamera();
  };

  const waitForCameraFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return false;
    for (let i = 0; i < 40; i++) {
      if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
        setCameraReady(true);
        return true;
      }
      await new Promise(r => setTimeout(r, 50));
    }
    return false;
  }, []);

  // Capture photo
  const capturePhoto = useCallback(async (role: PhotoRole): Promise<AisleScanSession | null> => {
    if (!videoRef.current || !session || captureWritePromiseRef.current) return null;

    const task = (async () => {
      emitVerificationEvent('photo_capture_write_started', { role });
      setCaptureCooldown(true);
      const ready = await waitForCameraFrame();
      if (!ready) {
        setCameraError('Camera is still warming up. Try again in a moment.');
        return null;
      }

      const dataUrl = captureFrameFromVideo(videoRef.current!);
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
        captureMethod: role === 'section' ? 'automatic' : 'manual',
        width,
        height,
        validation,
        overlapWithPrevious: null,
        retakeOfPhotoId: null,
        isActive: true,
      };

      savePhoto(photo);
      emitVerificationEvent('photo_saved', {
        id: photo.id,
        sequenceNumber: photo.sequenceNumber,
        role: photo.role,
        captureMethod: photo.captureMethod,
        warningCount: validation.warnings.length,
        width,
        height,
      });
      flashShutter();
      const updated = updateSession(session.id, {
        photoSequence: [...(prevSession?.photoSequence || []), photo.id],
        checklist: {
          ...checklist,
          beginningCaptured: checklist.beginningCaptured || role === 'beginning',
          endingCaptured: checklist.endingCaptured || role === 'ending',
          contextPhotoCaptured: true,
        },
      });
      if (updated) setSession(updated);
      setLastAnalysisUrl(analysisUrl);
      setCurrentWarnings(validation.warnings);
      return updated;
    })();

    captureWritePromiseRef.current = task;
    try {
      return await task;
    } finally {
      captureWritePromiseRef.current = null;
      setCaptureCooldown(false);
    }
  }, [session, direction, aisleSide, checklist, waitForCameraFrame, flashShutter, emitVerificationEvent]);

  const handleCaptureStartPhoto = useCallback(async () => {
    if (capturePhase !== 'ready_for_start' || captureCooldown || !cameraReady) return;
    emitVerificationEvent('start_photo_tap', { capturePhase, cameraReady });
    transitionCapturePhase('capturing_start');
    setBurstStatusMessage('');
    const updated = await capturePhoto('beginning');
    if (updated) {
      const startPhoto = getActivePhotos(updated.id).find(p => p.role === 'beginning');
      if (startPhoto) {
        setStartCapturePreviewUrl(startPhoto.dataUrl);
        setStartCaptureSettled(false);
        window.setTimeout(() => setStartCaptureSettled(true), 80);
      }
      transitionCapturePhase('ready_for_burst');
    } else {
      transitionCapturePhase('ready_for_start');
    }
  }, [capturePhase, captureCooldown, cameraReady, capturePhoto, transitionCapturePhase, emitVerificationEvent]);

  const captureBurstFrame = useCallback(async () => {
    if (!session || !burstHoldActiveRef.current || captureWritePromiseRef.current) return;
    const beforeCount = getActivePhotos(session.id).length;
    const updated = await capturePhoto('section');
    const afterCount = updated ? getActivePhotos(updated.id).length : beforeCount;
    if (afterCount > beforeCount) {
      burstSavedThisHoldRef.current += 1;
      setBurstProgress(prev => prev + 1);
      setBurstStatusMessage('Saving photos - hold steady');
    }
    if (burstHoldActiveRef.current && burstProgress + burstSavedThisHoldRef.current < MAX_BURST_PHOTOS) {
      burstTimerRef.current = window.setTimeout(() => {
        void captureBurstFrame();
      }, BURST_CAPTURE_INTERVAL_MS);
    }
  }, [session, capturePhoto, burstProgress]);

  const handleBurstHoldStart = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    emitVerificationEvent('burst_pointer_down', {
      pointerType: event.pointerType,
      pointerId: event.pointerId,
      capturePhase,
      cameraReady,
    });
    if (!session || !cameraReady || captureWritePromiseRef.current) return;
    if (capturePhase !== 'ready_for_burst' && capturePhase !== 'burst_paused') return;

    burstHoldActiveRef.current = true;
    burstStartedRef.current = false;
    burstSavedThisHoldRef.current = 0;
    clearBurstTimers();
    setBurstStatusMessage('Hold the button to capture continuously.');

    holdThresholdTimerRef.current = window.setTimeout(() => {
      if (!burstHoldActiveRef.current) return;
      burstStartedRef.current = true;
      setBurstProgress(0);
      emitVerificationEvent('burst_threshold_met', { thresholdMs: HOLD_TO_BURST_THRESHOLD_MS });
      transitionCapturePhase('burst_capturing');
      void captureBurstFrame();
    }, HOLD_TO_BURST_THRESHOLD_MS);
  }, [session, cameraReady, capturePhase, clearBurstTimers, transitionCapturePhase, captureBurstFrame, emitVerificationEvent]);

  const handleBurstHoldEnd = useCallback((event?: ReactPointerEvent<HTMLButtonElement>) => {
    emitVerificationEvent('burst_pointer_end', {
      eventType: event?.type || 'unknown',
      pointerType: event?.pointerType,
      pointerId: event?.pointerId,
      started: burstStartedRef.current,
      savedThisHold: burstSavedThisHoldRef.current,
    });
    const savedCount = burstSavedThisHoldRef.current;
    const started = burstStartedRef.current;
    stopActiveBurst(started && savedCount > 0);
    if (!started || savedCount === 0) {
      setBurstStatusMessage('Hold the button to capture continuously.');
    }
  }, [stopActiveBurst, emitVerificationEvent]);

  const handleManualSectionCapture = useCallback(async () => {
    if (!session || captureCooldown || !cameraReady) return;
    if (capturePhase !== 'ready_for_burst' && capturePhase !== 'burst_paused') return;
    setBurstStatusMessage('');
    const updated = await capturePhoto('section');
    if (updated) {
      emitVerificationEvent('manual_section_photo_saved');
      transitionCapturePhase('burst_paused');
      setBurstStatusMessage('Burst Complete');
    }
  }, [session, captureCooldown, cameraReady, capturePhase, capturePhoto, transitionCapturePhase, emitVerificationEvent]);

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


  // Coverage review
  const photos = session ? getActivePhotos(session.id) : [];
  const warnings = session ? analyzeCoveragePairwise(photos) : [];

  // Stitch
  const handleStitch = async () => {
    if (!session) return;
    emitVerificationEvent('stitch_started', { sessionId: session.id });
    transitionCapturePhase('stitching');
    setPhase('stitching');
    setStitchProgress('Preparing burst photos...');
    await new Promise(r => setTimeout(r, 200));

    const activePhotos = getActivePhotos(session.id);
    setStitchProgress(`Stitching ${activePhotos.length} photos...`);
    await new Promise(r => setTimeout(r, 150));

    const preview = await stitchPhotos(activePhotos);
    emitVerificationEvent('stitch_finished', {
      sessionId: session.id,
      photoCount: activePhotos.length,
      hasPreview: Boolean(preview),
    });
    setStitchProgress('Building stitched photo...');
    await new Promise(r => setTimeout(r, 150));

    const updated = updateSession(session.id, {
      stitchStatus: preview ? 'successful' : 'failed',
      stitchedPreviewDataUrl: preview,
      stitchVersion: (session.stitchVersion || 0) + 1,
      status: 'stitch_review',
      reviewConfirmedAt: preview ? new Date().toISOString() : null,
      checklist: {
        ...session.checklist,
        beginningCaptured: activePhotos.some(p => p.role === 'beginning'),
        endingCaptured: activePhotos.some(p => p.role === 'ending'),
        continuousSequence: true,
        overlapPresent: activePhotos.length > 1,
        contextPhotoCaptured: true,
        warningsReviewed: true,
        stitchReviewed: !!preview,
        criticalFailuresResolved: true,
      },
    });
    if (updated) {
      setSession(updated);
      setChecklist(updated.checklist);
      setConfirmStitch(!!preview);
    }
    setPhase('stitch_review');
    setStitchProgress('');
  };

  const handleReachedEnd = useCallback(async () => {
    if (!session || stitchRequestedRef.current || captureWritePromiseRef.current) return;
    const activePhotos = getActivePhotos(session.id);
    const hasBeginning = activePhotos.some(p => p.role === 'beginning');
    const hasSection = activePhotos.some(p => p.role === 'section');
    if (!hasBeginning || !hasSection) return;

    stitchRequestedRef.current = true;
    emitVerificationEvent('reached_end_tapped', {
      sessionId: session.id,
      photoCount: activePhotos.length,
    });
    burstHoldActiveRef.current = false;
    clearBurstTimers();
    transitionCapturePhase('ending');
    setBurstStatusMessage('');
    await captureWritePromiseRef.current;
    await capturePhoto('ending');
    stopCamera();
    transitionCapturePhase('stitching');
    await handleStitch();
  }, [session, capturePhoto, clearBurstTimers, stopCamera, transitionCapturePhase, emitVerificationEvent]);

  const handleUseStitchedPhoto = () => {
    if (!session) return;
    updateSession(session.id, {
      status: 'submitted',
      completedAt: new Date().toISOString(),
      reviewConfirmedAt: session.reviewConfirmedAt || new Date().toISOString(),
      checklist: {
        ...session.checklist,
        stitchReviewed: true,
        warningsReviewed: true,
        criticalFailuresResolved: true,
      },
      override: null,
    });
    emitVerificationEvent('stitched_photo_accepted', { sessionId: session.id });
    onComplete(session.id);
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
  };

  // Toggle checklist
  const toggleCheck = (key: keyof ScanChecklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Modal
  if (!isOpen) return null;

  const isCapturing = phase === 'capturing';
  const isBurstCapturing = capturePhase === 'burst_capturing';
  const isProcessingCapture = capturePhase === 'capturing_start' || capturePhase === 'ending' || capturePhase === 'stitching';
  const hasStartPhoto = photos.some(p => p.role === 'beginning');
  const hasSectionPhoto = photos.some(p => p.role === 'section');
  const canUseBurst = (capturePhase === 'ready_for_burst' || capturePhase === 'burst_paused' || capturePhase === 'burst_capturing') && hasStartPhoto && cameraReady;
  const canReachEnd = (capturePhase === 'ready_for_burst' || capturePhase === 'burst_paused') && hasStartPhoto && hasSectionPhoto && !captureCooldown && !stitchRequestedRef.current;

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
        <div className={`min-h-0 flex-1 overflow-x-hidden ${
          isCapturing ? 'flex flex-col p-0' : 'overflow-y-auto px-4 py-4'
        }`}>
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
                  <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={() => setCameraReady(true)} onCanPlay={() => setCameraReady(true)} className="absolute inset-0 w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Gradient overlays for readability */}
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

                  {shutterFlash && <div className="absolute inset-0 z-30 bg-white/70 opacity-0 animate-ping pointer-events-none motion-reduce:animate-none motion-reduce:opacity-40" />}

                  {/* Top-left: Close + ordered capture tray */}
                  <div className="absolute top-3 left-3 right-3 z-10 flex items-start gap-3 select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
                    <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white transition">
                      <X size={18} />
                    </button>
                    <div className="min-w-0 flex-1 rounded-xl bg-black/50 px-2.5 py-2 shadow-lg backdrop-blur-sm">
                      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase text-white/80">
                        <span>{photos.length} photos</span>
                        <span className="flex items-center gap-1 text-white/60">
                          {direction === 'left_to_right' ? <ArrowRight size={11} /> : <ArrowLeft size={11} />}
                          {capturePhase === 'burst_paused' ? 'Burst Complete' : capturePhase.replaceAll('_', ' ')}
                        </span>
                      </div>
                      <div className="flex max-w-full gap-1.5 overflow-x-auto overflow-y-hidden pb-0.5">
                        {photos.slice(-8).map((p) => (
                          <div key={p.id} className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/30 bg-black/50">
                            <img src={p.dataUrl} alt={`Captured photo ${p.sequenceNumber}`} draggable={false} className="h-full w-full object-cover" />
                            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-black shadow">
                              {p.sequenceNumber}
                            </span>
                          </div>
                        ))}
                      </div>
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

                  {/* Captured start photo flies into the top-left proof tray */}
                  {startCapturePreviewUrl && (
                    <div
                      className={`absolute z-20 overflow-hidden rounded-xl border-2 border-white bg-black shadow-2xl transition-all duration-700 ease-out ${
                        startCaptureSettled
                          ? 'left-16 top-16 h-11 w-11 translate-x-0 translate-y-0 scale-100'
                          : 'left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 scale-125'
                      }`}
                    >
                      <img src={startCapturePreviewUrl} alt="Captured start" className="h-full w-full object-cover" />
                      <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-black text-black shadow-lg">
                        1
                      </span>
                    </div>
                  )}

                  {/* Burst progress indicator */}
                  {(isBurstCapturing || burstStatusMessage) && (
                    <div className="absolute bottom-44 left-1/2 -translate-x-1/2 z-10 select-none" aria-live="polite">
                      <div className="rounded-full bg-black/70 px-4 py-2 text-xs font-black text-cyan-200 shadow-lg">
                        {isBurstCapturing ? `Capturing burst ${burstProgress}` : burstStatusMessage}
                      </div>
                    </div>
                  )}

                  {/* Bottom controls */}
                  <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-2 space-y-2">
                    {/* Capture buttons */}
                    {!hasStartPhoto ? (
                      <button onClick={handleCaptureStartPhoto}
                        disabled={capturePhase !== 'ready_for_start' || captureCooldown || !cameraReady}
                        className="w-full rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white hover:bg-emerald-500 transition flex items-center justify-center gap-2 disabled:opacity-50 select-none touch-manipulation"
                        style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                        <Camera size={18} /> {cameraReady ? 'Capture Start Photo' : 'Camera Warming Up'}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          aria-describedby="smart-aisle-hold-help"
                          aria-pressed={isBurstCapturing}
                          onPointerDown={handleBurstHoldStart}
                          onPointerUp={handleBurstHoldEnd}
                          onPointerCancel={handleBurstHoldEnd}
                          onLostPointerCapture={handleBurstHoldEnd}
                          onContextMenu={(event) => event.preventDefault()}
                          disabled={!canUseBurst || isProcessingCapture}
                          className="w-full rounded-2xl bg-cyan-600 py-4 text-sm font-black text-white hover:bg-cyan-500 transition flex flex-col items-center justify-center gap-1 disabled:opacity-50 select-none"
                          style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}>
                          <span className="flex items-center justify-center gap-2">
                            <Camera size={18} /> {isBurstCapturing ? 'Capturing Burst...' : capturePhase === 'burst_paused' ? 'Burst Complete' : 'Hold for Burst'}
                          </span>
                          {capturePhase === 'burst_paused' && <span className="text-[10px] font-bold text-white/75">Hold again to add more photos</span>}
                        </button>
                        <p id="smart-aisle-hold-help" className="sr-only">
                          Press and hold to continuously capture overlapping aisle photos. Release to pause.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={handleManualSectionCapture}
                            disabled={!canUseBurst || isProcessingCapture || captureCooldown}
                            className="rounded-xl border border-white/15 bg-white/10 py-2.5 text-[11px] font-bold text-white/80 disabled:opacity-40">
                            Capture Next Photo
                          </button>
                          <button type="button" onClick={handleReachedEnd}
                            disabled={!canReachEnd}
                            className="rounded-xl border border-amber-500/30 bg-amber-500/15 py-2.5 text-[11px] font-black text-amber-300 disabled:opacity-40">
                            Reached the End
                          </button>
                        </div>
                      </div>
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

              <div className="flex gap-2">
                <button onClick={() => { setPhase('capturing'); startCamera(); }}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white/60 hover:text-white/80 transition flex items-center justify-center gap-1">
                  <RefreshCw size={12} /> Retake
                </button>
                <button onClick={handleUseStitchedPhoto}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-500 transition flex items-center justify-center gap-1">
                  <CheckCircle2 size={14} /> Use Stitched Photo
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

