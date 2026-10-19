import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Clipboard, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import SmartAisleScan, { type SmartAisleScanVerificationEvent } from './SmartAisleScan';
import { deleteAllTestLabData, getActivePhotos, getTestLabSessions } from '../services/scan/sessionService';

interface BuildInfo {
  app: string;
  version: string;
  commitSha: string;
  railwayDeploymentId: string | null;
  builtAt: string;
  environment: string;
}

interface EvidenceEvent {
  type: string;
  timestamp: string;
  detail?: Record<string, unknown>;
}

interface ManualCheck {
  id: string;
  label: string;
  passed: boolean;
}

const ACCESS_KEY = 'fuckyouleavemelone';
const REPORT_STORAGE_KEY = 'smart_aisle_real_device_verification_report';
const TEST_JOB_ID = 'test_lab_real_device_iphone_verification';

const CHECKS: ManualCheck[] = [
  { id: 'start_photo', label: 'Capture Start Photo captured exactly one real photo', passed: false },
  { id: 'start_animation', label: 'Real captured image animated into top-left tray with badge 1', passed: false },
  { id: 'hold_threshold', label: 'Hold for Burst started only after the hold threshold', passed: false },
  { id: 'short_tap', label: 'Short tap did not start burst or show fake Burst Complete', passed: false },
  { id: 'no_selection', label: 'No blue highlight, handles, magnifier, copy/share menu, callout, drag, scroll, or zoom during five-second hold', passed: false },
  { id: 'release', label: 'Release stopped burst capture immediately', passed: false },
  { id: 'release_outside', label: 'Release outside the button stopped burst capture', passed: false },
  { id: 'backgrounding', label: 'Backgrounding Safari/PWA stopped capture safely and preserved saved photos', passed: false },
  { id: 'sequence', label: 'Holding again continued the same ordered sequence with actual thumbnails', passed: false },
  { id: 'reached_end', label: 'Reached the End remained separate and started processing', passed: false },
  { id: 'stitching', label: 'A real stitched preview was created from captured photos', passed: false },
  { id: 'originals', label: 'Original photos remained separately available after stitching', passed: false },
  { id: 'safe_area', label: 'Controls were not covered by iPhone safe areas or Safari/PWA chrome', passed: false },
  { id: 'thumbnail_x', label: 'Thumbnail X removes a photo immediately without confirmation modal', passed: false },
  { id: 'thumbnail_open', label: 'Tapping thumbnail image opens review and tapping X does not', passed: false },
  { id: 'remove_recalc', label: 'Removing a photo updates count, sequence, warnings, and stitched preview', passed: false },
  { id: 'undo_remove', label: 'Undo restores the removed photo with correct position and count', passed: false },
  { id: 'undo_count', label: 'Undo restores the total photo count correctly', passed: false },
  { id: 'undo_restitch', label: 'Undo triggers automatic restitch of the restored sequence', passed: false },
  { id: 'quality_gate', label: 'Blur, motion, dark, or tilted photos are rejected instead of accepted with only a warning', passed: false },
  { id: 'level_toggle', label: 'Level guide can be hidden and validation still blocks tilted capture', passed: false },
  { id: 'lens_check_button', label: 'Check Lens button appears during capture and produces a result', passed: false },
  { id: 'lens_clean_result', label: 'Check Lens shows clear result with clean camera', passed: false },
  { id: 'lens_recheck', label: 'Recheck Lens analyzes fresh frames and updates the result', passed: false },
  { id: 'lens_no_false_dirty', label: 'No persistent false dirty-lens warning under normal detailed lighting', passed: false },
  { id: 'lens_unsupported', label: 'Unsupported analysis returns uncertain without false certainty', passed: false },
  { id: 'recently_removed_panel', label: 'Recently Removed button appears after first removal with correct count', passed: false },
  { id: 'recently_removed_restore', label: 'Recently Removed panel shows removed photos and Restore button works', passed: false },
  { id: 'setup_camera_check', label: 'Setup screen shows Camera Lens Check with Check/Recheck button', passed: false },
  { id: 'setup_camera_result', label: 'Setup Camera Lens Check produces a result before Begin Capture', passed: false },
  { id: 'backgrounding_safe', label: 'Backgrounding Safari during burst pauses capture and preserves photos', passed: false },
  { id: 'foreground_recovery', label: 'Returning to foreground recovers camera without data loss', passed: false },
];

function readStoredEvents(): EvidenceEvent[] {
  try {
    const raw = localStorage.getItem(REPORT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getStandaloneMode() {
  const navStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)').matches || false;
  return navStandalone || mediaStandalone;
}

function sanitizeSessions() {
  return getTestLabSessions()
    .filter(session => session.jobId === TEST_JOB_ID)
    .map(session => {
      const photos = getActivePhotos(session.id).map(photo => ({
        id: photo.id,
        sequenceNumber: photo.sequenceNumber,
        role: photo.role,
        captureMethod: photo.captureMethod,
        capturedAt: photo.capturedAt,
        width: photo.width,
        height: photo.height,
        active: photo.isActive,
        validationPassed: photo.validation.passed,
        warningCount: photo.validation.warnings.length,
      }));
      return {
        id: session.id,
        status: session.status,
        mode: session.mode,
        startedAt: session.startedAt,
        updatedAt: session.updatedAt,
        completedAt: session.completedAt,
        stitchStatus: session.stitchStatus,
        stitchVersion: session.stitchVersion,
        hasStitchedPreview: Boolean(session.stitchedPreviewDataUrl),
        photoSequence: session.photoSequence,
        photos,
      };
    });
}

export default function RealDeviceVerification() {
  const [authorized, setAuthorized] = useState(() => new URLSearchParams(window.location.search).get('access') === ACCESS_KEY);
  const [accessInput, setAccessInput] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [events, setEvents] = useState<EvidenceEvent[]>(() => readStoredEvents());
  const [checks, setChecks] = useState<ManualCheck[]>(CHECKS);
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const holdStartRef = useRef<number | null>(null);
  const scrollStartRef = useRef<{ x: number; y: number } | null>(null);

  const appendEvent = useCallback((type: string, detail?: Record<string, unknown>) => {
    setEvents(prev => {
      const next = [...prev, { type, timestamp: new Date().toISOString(), detail }].slice(-600);
      try {
        localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore private-mode or storage-limit failures; visible report still updates.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    fetch('/api/build-info', { cache: 'no-store' })
      .then(response => response.json())
      .then(data => setBuildInfo(data))
      .catch(error => appendEvent('build_info_error', { message: error instanceof Error ? error.message : String(error) }));
  }, [appendEvent]);

  useEffect(() => {
    if (!authorized) return;

    appendEvent('verification_page_loaded', {
      url: window.location.href,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
      standalone: getStandaloneMode(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      visualViewport: window.visualViewport ? { width: window.visualViewport.width, height: window.visualViewport.height, scale: window.visualViewport.scale } : null,
      serviceWorker: 'serviceWorker' in navigator,
    });

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const text = target?.closest('button')?.textContent || target?.textContent || '';
      if (/Hold for Burst|Burst Complete/.test(text)) {
        holdStartRef.current = performance.now();
        scrollStartRef.current = { x: window.scrollX, y: window.scrollY };
        appendEvent('document_pointerdown_hold_surface', { pointerType: event.pointerType, pointerId: event.pointerId, text: text.trim().slice(0, 80) });
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      if (holdStartRef.current !== null) {
        appendEvent('document_pointerup_after_hold', {
          pointerType: event.pointerType,
          pointerId: event.pointerId,
          heldMs: Math.round(performance.now() - holdStartRef.current),
          scrollDelta: scrollStartRef.current ? { x: window.scrollX - scrollStartRef.current.x, y: window.scrollY - scrollStartRef.current.y } : null,
          selectionText: window.getSelection?.()?.toString() || '',
        });
        holdStartRef.current = null;
      }
    };
    const onPointerCancel = (event: PointerEvent) => appendEvent('document_pointercancel', { pointerType: event.pointerType, pointerId: event.pointerId });
    const onContextMenu = (event: MouseEvent) => appendEvent('contextmenu_fired', { target: (event.target as HTMLElement | null)?.tagName || null });
    const onSelectionChange = () => {
      const text = window.getSelection?.()?.toString() || '';
      if (text.trim()) appendEvent('selection_nonempty', { text: text.trim().slice(0, 80) });
    };
    const onVisibilityChange = () => appendEvent('visibilitychange', { visibilityState: document.visibilityState, hidden: document.hidden });
    const onPageHide = () => appendEvent('pagehide', { persisted: false });
    const onBlur = () => appendEvent('window_blur');
    const onResize = () => appendEvent('viewport_change', {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      visualViewport: window.visualViewport ? { width: window.visualViewport.width, height: window.visualViewport.height, scale: window.visualViewport.scale } : null,
    });

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerCancel, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('selectionchange', onSelectionChange, true);
    document.addEventListener('visibilitychange', onVisibilityChange, true);
    window.addEventListener('pagehide', onPageHide, true);
    window.addEventListener('blur', onBlur, true);
    window.addEventListener('resize', onResize, true);
    window.visualViewport?.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('pointercancel', onPointerCancel, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('selectionchange', onSelectionChange, true);
      document.removeEventListener('visibilitychange', onVisibilityChange, true);
      window.removeEventListener('pagehide', onPageHide, true);
      window.removeEventListener('blur', onBlur, true);
      window.removeEventListener('resize', onResize, true);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [appendEvent, authorized]);

  const report = useMemo(() => ({
    generatedAt: new Date().toISOString(),
    buildInfo,
    device: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
      standalone: getStandaloneMode(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      visualViewport: window.visualViewport ? { width: window.visualViewport.width, height: window.visualViewport.height, scale: window.visualViewport.scale } : null,
    },
    manualChecks: checks,
    automatedSummary: {
      eventCount: events.length,
      selectionEvents: events.filter(event => event.type === 'selection_nonempty').length,
      contextMenuEvents: events.filter(event => event.type === 'contextmenu_fired').length,
      pointerCancelEvents: events.filter(event => event.type.includes('pointercancel')).length,
      visibilityEvents: events.filter(event => event.type === 'visibilitychange').length,
      photoSavedEvents: events.filter(event => event.type === 'photo_saved').length,
      stitchFinishedEvents: events.filter(event => event.type === 'stitch_finished').length,
      immediateRemoveEvents: events.filter(event => event.type === 'photo_remove_immediate').length,
      undoRestoreEvents: events.filter(event => event.type === 'photo_undo_restore').length,
      lensCheckEvents: events.filter(event => event.type === 'lens_check_completed').length,
      lensRejectedEvents: events.filter(event => event.type === 'photo_rejected_lens_cleanliness').length,
    },
    sessions: sanitizeSessions(),
    events,
  }), [buildInfo, checks, events]);

  const reportText = JSON.stringify(report, null, 2);

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    appendEvent('report_copied', { bytes: reportText.length });
    window.setTimeout(() => setCopied(false), 1800);
  };

  const resetChecks = (ids: string[], eventType: string) => {
    setChecks(prev => prev.map(check => ids.includes(check.id) ? { ...check, passed: false } : check));
    appendEvent(eventType, { resetCheckIds: ids });
  };

  const clearEvidence = () => {
    localStorage.removeItem(REPORT_STORAGE_KEY);
    deleteAllTestLabData();
    setEvents([]);
    setChecks(CHECKS);
    appendEvent('evidence_cleared');
  };

  if (!authorized) {
    return (
      <main className="min-h-dvh bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-md space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">All In One 667</p>
          <h1 className="text-2xl font-black">Real Device Verification</h1>
          <p className="text-sm font-bold text-slate-300">Enter the verification access key for the Smart Aisle iPhone test panel.</p>
          <input
            value={accessInput}
            onChange={event => setAccessInput(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300"
            placeholder="Access key"
            autoCapitalize="none"
          />
          <button
            type="button"
            onClick={() => setAuthorized(accessInput.trim() === ACCESS_KEY)}
            className="h-12 w-full rounded-lg bg-cyan-600 text-sm font-black text-white"
          >
            Open Verification Panel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">All In One 667</p>
          <h1 className="text-2xl font-black">Smart Aisle Real iPhone Verification</h1>
          <p className="text-sm font-bold text-slate-300">HTTPS, real camera, isolated test-lab session. The report excludes photo contents and personal data.</p>
          <div className="grid gap-2 text-xs font-bold text-slate-300 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">Commit: {buildInfo?.commitSha || 'loading'}</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">Mode: {getStandaloneMode() ? 'Installed PWA' : 'Safari browser'}</div>
          </div>
        </header>

        <section className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-black">Required Test Script</h2>
          <ol className="list-decimal space-y-1 pl-5 text-xs font-bold text-slate-300">
            <li>Open this page in iPhone Safari portrait and tap Start Real Camera Test.</li>
            <li>Begin Capture, tap Capture Start Photo once, and confirm the tray badge 1.</li>
            <li>Short tap Hold for Burst and confirm no burst starts.</li>
            <li>Press and hold for at least five seconds while moving across household objects, then release.</li>
            <li>Hold again, drag outside the button, release outside, and confirm capture stops.</li>
            <li>Begin another hold, background Safari or the installed PWA, return, and confirm recovery.</li>
            <li>Tap the X on a thumbnail and confirm it removes immediately with no confirmation popup.</li>
            <li>Confirm the Undo toast appears, tap Undo, and confirm the photo returns with correct count.</li>
            <li>Tap Check Lens and confirm a result appears (clear, uncertain, or cleaning needed).</li>
            <li>Tap Reached the End, review the stitched preview, and confirm originals remain listed in the report.</li>
            <li>Repeat from the Home Screen installed PWA and copy the report.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { appendEvent('real_camera_test_started'); setScanOpen(true); }} className="inline-flex h-12 items-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-black text-white">
              <Camera size={16} /> Start Real Camera Test
            </button>
            <button type="button" onClick={() => resetChecks(['short_tap', 'no_selection', 'release', 'release_outside'], 'repeat_hold_test_requested')} className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-200">
              Repeat Hold Test
            </button>
            <button type="button" onClick={() => resetChecks(['thumbnail_x', 'thumbnail_open', 'remove_recalc'], 'reset_current_correction_step')} className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-200">
              Reset Current Test Step
            </button>
            <button type="button" onClick={() => resetChecks(['undo_remove', 'undo_count', 'undo_restitch'], 'reset_undo_test')} className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-200">
              Reset Delete/Undo Test
            </button>
            <button type="button" onClick={() => resetChecks(['lens_check_button', 'lens_clean_result', 'lens_recheck', 'lens_no_false_dirty', 'lens_unsupported'], 'reset_lens_test')} className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-200">
              Reset Lens Test
            </button>
            <button type="button" onClick={() => resetChecks(['reached_end', 'stitching', 'originals'], 'repeat_stitch_test_requested')} className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-200">
              Repeat Stitch Test
            </button>
            <button type="button" onClick={clearEvidence} className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-200">
              <Trash2 size={16} /> Clear Evidence
            </button>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-black">Tester Checklist</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {checks.map(check => (
              <label key={check.id} className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  checked={check.passed}
                  onChange={() => setChecks(prev => prev.map(item => item.id === check.id ? { ...item, passed: !item.passed } : item))}
                  className="mt-0.5 h-4 w-4"
                />
                <span>{check.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-black">Privacy-Safe Report</h2>
            <button type="button" onClick={copyReport} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white">
              {copied ? <ShieldCheck size={14} /> : <Clipboard size={14} />} {copied ? 'Copied' : 'Copy Report'}
            </button>
          </div>
          <div className="grid gap-2 text-xs font-bold text-slate-300 sm:grid-cols-4">
            <div className="rounded bg-black/30 p-2">Events: {events.length}</div>
            <div className="rounded bg-black/30 p-2">Selections: {report.automatedSummary.selectionEvents}</div>
            <div className="rounded bg-black/30 p-2">Context menus: {report.automatedSummary.contextMenuEvents}</div>
            <div className="rounded bg-black/30 p-2">Photos saved: {report.automatedSummary.photoSavedEvents}</div>
            <div className="rounded bg-black/30 p-2">Immediate deletes: {report.automatedSummary.immediateRemoveEvents}</div>
            <div className="rounded bg-black/30 p-2">Undo restores: {report.automatedSummary.undoRestoreEvents}</div>
            <div className="rounded bg-black/30 p-2">Lens checks: {report.automatedSummary.lensCheckEvents}</div>
            <div className="rounded bg-black/30 p-2">Lens rejections: {report.automatedSummary.lensRejectedEvents}</div>
          </div>
          <textarea readOnly value={reportText} className="h-80 w-full rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[10px] text-slate-200" />
          <button type="button" onClick={() => appendEvent('report_refreshed')} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-black text-slate-200">
            <RefreshCw size={14} /> Refresh Report Timestamp
          </button>
        </section>
      </div>

      <SmartAisleScan
        jobId={TEST_JOB_ID}
        jobName="Real iPhone Verification"
        isOpen={scanOpen}
        onClose={() => { appendEvent('scan_closed'); setScanOpen(false); }}
        onComplete={(sessionId) => { appendEvent('scan_completed', { sessionId }); setScanOpen(false); }}
        onVerificationEvent={(event: SmartAisleScanVerificationEvent) => appendEvent(event.type, event.detail)}
      />
    </main>
  );
}