/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ShowerProof, BarcodePermissionStatus, ShowerProofSyncStatus } from './types';
import type { ShowerProofRecord } from './showerProofApi';
import {
  REQUIRED_SHOWER_BARCODE,
  resizeProofImage,
  loadShowerProofForCycle,
  saveShowerProofEvent,
  normalizeShowerProofRecord,
} from './showerGateService';
import { getCurrentCycleId, getCycleLabel } from '../../utils/showerCycle';
import safeStorage from '../../utils/safeStorage';

const SHOWER_GATE_STORAGE_KEY = 'daily_shower_gate_proofs';
const SHOWER_GATE_REQUIRED = false;
const SHOWER_PROOF_MANDATORY = true;

export interface UseShowerGateReturn {
  barcodeVideoRef: React.RefObject<HTMLVideoElement | null>;

  showerProofs: ShowerProof[];
  showerProofDraft: { name: string; dataUrl: string } | null;
  showerProofBackendFolder: string;
  showerProofSyncStatus: ShowerProofSyncStatus;
  showerProofSyncMessage: string;
  showerProofInputKey: number;
  barcodeScannerActive: boolean;
  barcodePermissionStatus: BarcodePermissionStatus;
  barcodeScanMessage: string;
  barcodeScanSuccess: boolean;
  scannedBarcodeValue: string;
  barcodeTorchAvailable: boolean;
  barcodeTorchOn: boolean;

  showerCycleKey: string;
  showerCycleLabel: string;
  showerProofForCycle: ShowerProof | undefined;
  showerProofAttachmentForCycle: { name: string; dataUrl: string } | null;
  barcodeVerifiedForCycle: boolean;
  showerProofRequiredSatisfied: boolean;
  showerGateUnlocked: boolean;
  showerGateStatusText: string;
  showerGateAccessReady: boolean;
  missionControlShowerProofRecord: ShowerProofRecord | null;

  stopBarcodeScanner: () => void;
  startBarcodeScanner: () => void;
  toggleBarcodeTorch: () => void;
  handleShowerProofFile: (files: FileList | null) => void;

  confirmShower: () => Promise<{ success: boolean; proof?: ShowerProof; error?: string }>;
  handleMissionControlVerified: (record: ShowerProofRecord) => ShowerProof | null;
}

export function useShowerGate(now: Date): UseShowerGateReturn {
  const showerCycleKey = getCurrentCycleId(now);
  const showerCycleLabel = getCycleLabel(showerCycleKey);

  const [showerProofs, setShowerProofs] = useState<ShowerProof[]>(() => {
    try {
      const saved = safeStorage.getItem(SHOWER_GATE_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [showerProofDraft, setShowerProofDraft] = useState<{ name: string; dataUrl: string } | null>(null);
  const [showerProofBackendFolder, setShowerProofBackendFolder] = useState('');
  const [showerProofSyncStatus, setShowerProofSyncStatus] = useState<ShowerProofSyncStatus>('idle');
  const [showerProofSyncMessage, setShowerProofSyncMessage] = useState('');
  const [showerProofInputKey, setShowerProofInputKey] = useState(0);
  const [barcodeScannerActive, setBarcodeScannerActive] = useState(false);
  const [barcodePermissionStatus, setBarcodePermissionStatus] = useState<BarcodePermissionStatus>('idle');
  const [barcodeScanMessage, setBarcodeScanMessage] = useState('Scan the product barcode to unlock shower confirmation.');
  const [barcodeScanSuccess, setBarcodeScanSuccess] = useState(false);
  const [scannedBarcodeValue, setScannedBarcodeValue] = useState('');
  const [barcodeTorchAvailable, setBarcodeTorchAvailable] = useState(false);
  const [barcodeTorchOn, setBarcodeTorchOn] = useState(false);

  const barcodeVideoRef = useRef<HTMLVideoElement | null>(null);
  const barcodeStreamRef = useRef<MediaStream | null>(null);
  const barcodeScanLoopRef = useRef<number | null>(null);
  const barcodeScanHandledRef = useRef(false);
  const zxingScannerControlsRef = useRef<{ stop: () => void; switchTorch?: (onOff: boolean) => Promise<void> } | null>(null);

  // Derived values
  const showerProofForCycle = showerProofs.find(proof => proof.cycleKey === showerCycleKey);
  const showerProofAttachmentForCycle = showerProofDraft || (
    showerProofForCycle?.proofAttachment
      ? { name: showerProofForCycle.proofAttachment.name, dataUrl: showerProofForCycle.proofAttachment.dataUrl }
      : showerProofForCycle?.proofName && showerProofForCycle?.proofDataUrl
        ? { name: showerProofForCycle.proofName, dataUrl: showerProofForCycle.proofDataUrl }
        : null
  );
  const persistedBarcodeVerifiedForCycle = Boolean(
    showerProofForCycle?.barcodeVerified &&
    showerProofForCycle?.scannedBarcode === REQUIRED_SHOWER_BARCODE &&
    showerProofForCycle?.barcodeVerifiedAt
  );
  const barcodeVerifiedForCycle = Boolean(
    persistedBarcodeVerifiedForCycle ||
    (barcodeScanSuccess && scannedBarcodeValue === REQUIRED_SHOWER_BARCODE)
  );
  const showerProofRequiredSatisfied = !SHOWER_PROOF_MANDATORY || Boolean(
    showerProofAttachmentForCycle?.dataUrl ||
    showerProofForCycle?.imageUrl ||
    showerProofForCycle?.storageKey ||
    showerProofForCycle?.proofId
  );
  const showerGateUnlocked = Boolean(
    showerProofForCycle?.showerConfirmed &&
    showerProofForCycle?.showerConfirmedAt &&
    showerProofForCycle?.scannedBarcode === REQUIRED_SHOWER_BARCODE &&
    (
      !SHOWER_PROOF_MANDATORY ||
      Boolean(
        showerProofForCycle?.proofAttachment?.dataUrl ||
        showerProofForCycle?.proofDataUrl ||
        showerProofForCycle?.imageUrl ||
        showerProofForCycle?.storageKey ||
        showerProofForCycle?.proofId
      )
    ) &&
    (
      !showerProofForCycle?.uploadStatus ||
      showerProofForCycle.uploadStatus === 'saved'
    ) &&
    (
      !showerProofForCycle?.verificationStatus ||
      showerProofForCycle.verificationStatus === 'verified'
    )
  );
  const showerGateStatusText = showerGateUnlocked
    ? `Shower confirmed ${new Date(showerProofForCycle!.showerConfirmedAt || showerProofForCycle!.confirmedAt || now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : barcodeVerifiedForCycle && !showerProofRequiredSatisfied
      ? 'Product verified. Proof missing.'
      : barcodeVerifiedForCycle
        ? 'Ready to confirm'
        : barcodeScannerActive
          ? 'Scanning'
          : barcodeScanMessage === 'Incorrect product barcode.'
            ? 'Incorrect barcode'
            : 'Barcode not scanned';
  const showerGateAccessReady = !SHOWER_GATE_REQUIRED || showerGateUnlocked;
  const missionControlShowerProofRecord: ShowerProofRecord | null = showerProofForCycle?.proofId && showerProofForCycle?.imageUrl
    ? {
      id: showerProofForCycle.proofId,
      cycleId: showerProofForCycle.cycleKey,
      localDate: showerProofForCycle.localDate || showerProofForCycle.cycleKey,
      barcode: showerProofForCycle.scannedBarcode || showerProofForCycle.barcodeValue || REQUIRED_SHOWER_BARCODE,
      barcodeEnding: (showerProofForCycle.scannedBarcode || showerProofForCycle.barcodeValue || REQUIRED_SHOWER_BARCODE).slice(-4),
      capturedAt: showerProofForCycle.capturedAt || showerProofForCycle.showerConfirmedAt || showerProofForCycle.confirmedAt || new Date().toISOString(),
      storageKey: showerProofForCycle.storageKey || showerProofForCycle.backendFolderPath || '',
      imageUrl: showerProofForCycle.imageUrl,
      uploadStatus: showerProofForCycle.uploadStatus || 'saved',
      verificationStatus: showerProofForCycle.verificationStatus || 'verified',
      createdAt: showerProofForCycle.capturedAt || showerProofForCycle.showerConfirmedAt || showerProofForCycle.confirmedAt || new Date().toISOString(),
      updatedAt: showerProofForCycle.showerConfirmedAt || showerProofForCycle.confirmedAt || showerProofForCycle.capturedAt || new Date().toISOString(),
    }
    : null;

  // Persist shower proofs to localStorage
  useEffect(() => {
    safeStorage.setItem(SHOWER_GATE_STORAGE_KEY, JSON.stringify(showerProofs.slice(-14)));
  }, [showerProofs]);

  // Load backend shower proof on cycle change
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const result = await loadShowerProofForCycle(showerCycleKey);
        if (!isMounted) return;
        if (!result.found) {
          setShowerProofSyncStatus('idle');
          setShowerProofSyncMessage(`Backend ready for ${showerCycleKey}. No shower proof saved yet.`);
          return;
        }

        setShowerProofBackendFolder(result.folderPath || '');
        if (result.proof) {
          setShowerProofs(prev => [
            ...prev.filter(item => item.cycleKey !== showerCycleKey),
            { ...(prev.find(item => item.cycleKey === showerCycleKey) || {}), ...result.proof } as ShowerProof
          ]);
          setShowerProofSyncStatus('saved');
          setShowerProofSyncMessage(result.folderPath ? `Backend loaded: ${result.folderPath}` : 'Backend proof loaded.');
        }
      } catch {
        // Local storage fallback keeps the gate usable if the backend is offline.
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [showerCycleKey]);

  // Reset barcode state on cycle change
  useEffect(() => {
    setBarcodeScanSuccess(persistedBarcodeVerifiedForCycle);
    setScannedBarcodeValue(persistedBarcodeVerifiedForCycle ? REQUIRED_SHOWER_BARCODE : '');
    setBarcodeScanMessage(persistedBarcodeVerifiedForCycle
      ? 'Product verified.'
      : 'Scan the product barcode to unlock shower confirmation.'
    );
    if (!persistedBarcodeVerifiedForCycle) {
      stopBarcodeScanner();
    }
  }, [showerCycleKey]);

  // Cleanup barcode scanner on unmount
  useEffect(() => {
    return () => stopBarcodeScanner();
  }, []);

  const saveShowerProofToBackend = useCallback(async (payload: {
    proofName?: string;
    proofDataUrl?: string;
    barcodeValue?: string;
    confirmedAt?: string;
    eventType: 'proof_attached' | 'barcode_scanned' | 'barcode_rejected' | 'flash_updated' | 'proof_confirmed';
    flashAvailable?: boolean;
    flashUsed?: boolean;
  }) => {
    setShowerProofSyncStatus('saving');
    setShowerProofSyncMessage('Saving shower gate proof to backend...');
    const result = await saveShowerProofEvent({ ...payload, cycleKey: showerCycleKey });
    if (result.success) {
      setShowerProofBackendFolder(result.folderPath);
      setShowerProofSyncStatus('saved');
      setShowerProofSyncMessage(result.folderPath ? `Backend saved: ${result.folderPath}` : 'Backend saved.');
      return result.folderPath;
    }
    setShowerProofSyncStatus('error');
    setShowerProofSyncMessage(result.error || 'Could not save shower proof to backend.');
    return '';
  }, [showerCycleKey]);

  const stopBarcodeScanner = useCallback(() => {
    if (barcodeScanLoopRef.current !== null) {
      window.cancelAnimationFrame(barcodeScanLoopRef.current);
      barcodeScanLoopRef.current = null;
    }
    zxingScannerControlsRef.current?.stop();
    zxingScannerControlsRef.current = null;
    barcodeStreamRef.current?.getTracks().forEach(track => track.stop());
    barcodeStreamRef.current = null;
    setBarcodeScannerActive(false);
    setBarcodeTorchAvailable(false);
    setBarcodeTorchOn(false);
  }, []);

  const rejectScannedBarcode = useCallback(() => {
    setBarcodeScanSuccess(false);
    setScannedBarcodeValue('');
    setBarcodeScanMessage('Incorrect product barcode.');
  }, []);

  const acceptScannedProductBarcode = useCallback((value: string) => {
    if (barcodeScanHandledRef.current) return false;
    if (value === REQUIRED_SHOWER_BARCODE) {
      barcodeScanHandledRef.current = true;
      const verifiedAt = new Date().toISOString();
      setScannedBarcodeValue(value);
      setBarcodeScanSuccess(true);
      setBarcodeScanMessage('Product verified.');
      setShowerProofs(prev => [
        ...prev.filter(item => item.cycleKey !== showerCycleKey),
        {
          ...(prev.find(item => item.cycleKey === showerCycleKey) || {}),
          cycleKey: showerCycleKey,
          proofName: showerProofAttachmentForCycle?.name,
          proofDataUrl: showerProofAttachmentForCycle?.dataUrl,
          proofAttachment: showerProofAttachmentForCycle || undefined,
          barcodeValue: value,
          scannedBarcode: value,
          barcodeVerified: true,
          barcodeVerifiedAt: verifiedAt,
          showerConfirmed: false,
        }
      ]);
      void saveShowerProofToBackend({
        barcodeValue: value,
        eventType: 'barcode_scanned',
        flashAvailable: barcodeTorchAvailable,
        flashUsed: barcodeTorchOn,
      });
      stopBarcodeScanner();
      return true;
    }

    barcodeScanHandledRef.current = true;
    void saveShowerProofToBackend({
      barcodeValue: value,
      eventType: 'barcode_rejected',
      flashAvailable: barcodeTorchAvailable,
      flashUsed: barcodeTorchOn,
    });
    rejectScannedBarcode();
    window.setTimeout(() => {
      barcodeScanHandledRef.current = false;
    }, 1200);
    return false;
  }, [showerCycleKey, showerProofAttachmentForCycle, barcodeTorchAvailable, barcodeTorchOn, saveShowerProofToBackend, stopBarcodeScanner, rejectScannedBarcode]);

  const startBarcodeScanner = useCallback(async () => {
    stopBarcodeScanner();
    setBarcodePermissionStatus('requesting');
    barcodeScanHandledRef.current = false;
    setBarcodeScanSuccess(false);
    setScannedBarcodeValue('');
    setBarcodeScanMessage('Point the camera at the product barcode.');
    if (barcodeVerifiedForCycle) {
      setShowerProofs(prev => prev.map(item => item.cycleKey === showerCycleKey
        ? {
          ...item,
          barcodeValue: '',
          scannedBarcode: '',
          barcodeVerified: false,
          barcodeVerifiedAt: undefined,
          showerConfirmed: false,
          showerConfirmedAt: undefined,
          confirmedAt: undefined,
        }
        : item
      ));
    }

    if (!('mediaDevices' in navigator) || !navigator.mediaDevices?.getUserMedia) {
      setBarcodePermissionStatus('unsupported');
      setBarcodeScanMessage('Camera scanning is not supported in this browser.');
      return;
    }

    try {
      const video = barcodeVideoRef.current;
      if (!video) {
        setBarcodePermissionStatus('error');
        setBarcodeScanMessage('Camera preview is not ready. Try again.');
        return;
      }

      const supportedFormats = window.BarcodeDetector && typeof window.BarcodeDetector.getSupportedFormats === 'function'
        ? await window.BarcodeDetector.getSupportedFormats()
        : [];
      const canUseNativeBarcodeDetector = Boolean(window.BarcodeDetector && supportedFormats.includes('upc_a'));

      if (!canUseNativeBarcodeDetector) {
        const [{ BarcodeFormat, BrowserMultiFormatOneDReader }, { DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library')
        ]);
        const barcodeReaderHints = new globalThis.Map([
          [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.UPC_A]]
        ]);
        const fallbackReader = new BrowserMultiFormatOneDReader(barcodeReaderHints);
        const controls = await fallbackReader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          },
          video,
          (result) => {
            if (!result) return;
            const isUpcA = result.getBarcodeFormat() === BarcodeFormat.UPC_A;
            if (!isUpcA) {
              rejectScannedBarcode();
              return;
            }
            acceptScannedProductBarcode(String(result.getText() ?? ''));
          }
        );

        zxingScannerControlsRef.current = controls;
        setBarcodeTorchAvailable(Boolean(controls.switchTorch));
        setBarcodePermissionStatus('granted');
        setBarcodeScannerActive(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      barcodeStreamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      const track = stream.getVideoTracks()[0];
      const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean } : undefined;
      setBarcodeTorchAvailable(Boolean(capabilities?.torch));
      setBarcodePermissionStatus('granted');
      setBarcodeScannerActive(true);

      const detector = new window.BarcodeDetector({ formats: ['upc_a'] });
      const scanFrame = async () => {
        const activeStream = barcodeStreamRef.current;
        const activeVideo = barcodeVideoRef.current;
        if (!activeStream || !activeVideo || activeVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          barcodeScanLoopRef.current = window.requestAnimationFrame(scanFrame);
          return;
        }

        try {
          const codes = await detector.detect(activeVideo);
          if (codes.length > 0) {
            const upcCode = codes.find(code => code.format === 'upc_a' || code.format === 'upc-a');
            if (!upcCode) {
              rejectScannedBarcode();
            } else {
              acceptScannedProductBarcode(String(upcCode.rawValue ?? ''));
            }
          }
        } catch (error) {
          setBarcodePermissionStatus('error');
          setBarcodeScanMessage('Barcode scan failed. Try again.');
        }

        barcodeScanLoopRef.current = window.requestAnimationFrame(scanFrame);
      };

      barcodeScanLoopRef.current = window.requestAnimationFrame(scanFrame);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      setBarcodePermissionStatus(name === 'NotAllowedError' || name === 'PermissionDeniedError' ? 'denied' : 'error');
      setBarcodeScanMessage(name === 'NotAllowedError' || name === 'PermissionDeniedError'
        ? 'Camera permission denied. Allow camera access to scan the required barcode.'
        : 'Could not start the camera. Try again.'
      );
    }
  }, [showerCycleKey, barcodeVerifiedForCycle, stopBarcodeScanner, rejectScannedBarcode, acceptScannedProductBarcode]);

  const toggleBarcodeTorch = useCallback(async () => {
    if (zxingScannerControlsRef.current?.switchTorch) {
      const nextTorch = !barcodeTorchOn;
      try {
        await zxingScannerControlsRef.current.switchTorch(nextTorch);
        setBarcodeTorchOn(nextTorch);
        void saveShowerProofToBackend({ eventType: 'flash_updated', flashAvailable: true, flashUsed: nextTorch });
      } catch {
        setBarcodeScanMessage('Flashlight is not available on this camera.');
        setBarcodeTorchAvailable(false);
        setBarcodeTorchOn(false);
      }
      return;
    }

    const track = barcodeStreamRef.current?.getVideoTracks()[0];
    if (!track || !barcodeTorchAvailable) return;
    const nextTorch = !barcodeTorchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: nextTorch } as MediaTrackConstraintSet] });
      setBarcodeTorchOn(nextTorch);
      void saveShowerProofToBackend({ eventType: 'flash_updated', flashAvailable: true, flashUsed: nextTorch });
    } catch {
      setBarcodeScanMessage('Flashlight is not available on this camera.');
      setBarcodeTorchAvailable(false);
      setBarcodeTorchOn(false);
    }
  }, [barcodeTorchOn, barcodeTorchAvailable, saveShowerProofToBackend]);

  const handleShowerProofFile = useCallback(async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      setShowerProofSyncStatus('saving');
      setShowerProofSyncMessage('Preparing shower proof image...');
      const dataUrl = await resizeProofImage(file);
      setShowerProofDraft({
        name: file.name,
        dataUrl
      });
      setShowerProofs(prev => [
        ...prev.filter(item => item.cycleKey !== showerCycleKey),
        {
          ...(prev.find(item => item.cycleKey === showerCycleKey) || {}),
          cycleKey: showerCycleKey,
          proofName: file.name,
          proofDataUrl: dataUrl,
          proofAttachment: {
            name: file.name,
            dataUrl,
          },
          showerConfirmed: false,
        }
      ]);
      void saveShowerProofToBackend({
        proofName: file.name,
        proofDataUrl: dataUrl,
        eventType: 'proof_attached',
        flashAvailable: barcodeTorchAvailable,
        flashUsed: barcodeTorchOn,
      });
    } catch (error) {
      setShowerProofSyncStatus('error');
      setShowerProofSyncMessage(error instanceof Error ? error.message : 'Could not attach proof image.');
    }
  }, [showerCycleKey, barcodeTorchAvailable, barcodeTorchOn, saveShowerProofToBackend]);

  const confirmShower = useCallback(async (): Promise<{ success: boolean; proof?: ShowerProof; error?: string }> => {
    const proofAttachment = showerProofAttachmentForCycle;
    const verifiedBarcode = scannedBarcodeValue === REQUIRED_SHOWER_BARCODE
      ? scannedBarcodeValue
      : showerProofForCycle?.scannedBarcode || showerProofForCycle?.barcodeValue || '';

    if (!barcodeVerifiedForCycle || verifiedBarcode !== REQUIRED_SHOWER_BARCODE) {
      rejectScannedBarcode();
      return { success: false, error: 'Product barcode verification required before shower confirmation.' };
    }
    if (SHOWER_PROOF_MANDATORY && !proofAttachment?.dataUrl) {
      return { success: false, error: 'Add shower proof first. Jobs stay locked until proof is attached and confirmed.' };
    }
    if (verifiedBarcode !== '075371003233') {
      rejectScannedBarcode();
      return { success: false, error: 'Barcode validation failed. Scan the product barcode again.' };
    }

    const confirmedAt = new Date().toISOString();
    const proof: ShowerProof = {
      cycleKey: showerCycleKey,
      ...(showerProofForCycle || {}),
      proofName: proofAttachment?.name,
      proofDataUrl: proofAttachment?.dataUrl,
      proofAttachment: proofAttachment || undefined,
      barcodeValue: verifiedBarcode,
      scannedBarcode: verifiedBarcode,
      barcodeVerified: true,
      barcodeVerifiedAt: showerProofForCycle?.barcodeVerifiedAt || new Date().toISOString(),
      confirmedAt,
      showerConfirmed: true,
      showerConfirmedAt: confirmedAt,
      backendFolderPath: showerProofBackendFolder,
    };

    const backendFolderPath = await saveShowerProofToBackend({
      proofName: proofAttachment?.name,
      proofDataUrl: proofAttachment?.dataUrl,
      barcodeValue: verifiedBarcode,
      confirmedAt,
      eventType: 'proof_confirmed',
      flashAvailable: barcodeTorchAvailable,
      flashUsed: barcodeTorchOn,
    });
    if (!backendFolderPath) {
      return { success: false, error: 'Backend shower proof save failed. Jobs stay locked until the proof is saved.' };
    }
    if (backendFolderPath) {
      proof.backendFolderPath = backendFolderPath;
    }

    setShowerProofs(prev => [
      ...prev.filter(item => item.cycleKey !== showerCycleKey),
      proof
    ]);

    setShowerProofDraft(null);
    setShowerProofInputKey(prev => prev + 1);
    setBarcodeScanSuccess(false);
    setScannedBarcodeValue('');
    setBarcodeScanMessage('Scan the product barcode to unlock shower confirmation.');

    return { success: true, proof };
  }, [barcodeVerifiedForCycle, showerProofAttachmentForCycle, showerProofForCycle, showerProofBackendFolder, showerCycleKey, scannedBarcodeValue, barcodeTorchAvailable, barcodeTorchOn, saveShowerProofToBackend, rejectScannedBarcode]);

  const handleMissionControlVerified = useCallback((record: ShowerProofRecord): ShowerProof | null => {
    if (
      record.cycleId !== showerCycleKey ||
      record.barcode !== REQUIRED_SHOWER_BARCODE ||
      record.uploadStatus !== 'saved' ||
      record.verificationStatus !== 'verified'
    ) {
      return null;
    }

    const proof = normalizeShowerProofRecord(record);
    setShowerProofs(prev => [
      ...prev.filter(item => item.cycleKey !== showerCycleKey),
      { ...(prev.find(item => item.cycleKey === showerCycleKey) || {}), ...proof }
    ]);

    setShowerProofDraft(null);
    setShowerProofInputKey(prev => prev + 1);
    setBarcodeScanSuccess(false);
    setScannedBarcodeValue('');
    setBarcodeScanMessage('Scan the product barcode to unlock shower confirmation.');

    return proof;
  }, [showerCycleKey]);

  return {
    barcodeVideoRef,
    showerProofs,
    showerProofDraft,
    showerProofBackendFolder,
    showerProofSyncStatus,
    showerProofSyncMessage,
    showerProofInputKey,
    barcodeScannerActive,
    barcodePermissionStatus,
    barcodeScanMessage,
    barcodeScanSuccess,
    scannedBarcodeValue,
    barcodeTorchAvailable,
    barcodeTorchOn,
    showerCycleKey,
    showerCycleLabel,
    showerProofForCycle,
    showerProofAttachmentForCycle,
    barcodeVerifiedForCycle,
    showerProofRequiredSatisfied,
    showerGateUnlocked,
    showerGateStatusText,
    showerGateAccessReady,
    missionControlShowerProofRecord,
    stopBarcodeScanner,
    startBarcodeScanner,
    toggleBarcodeTorch,
    handleShowerProofFile,
    confirmShower,
    handleMissionControlVerified,
  };
}
