import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fromServer, payload, fingerprint, mergeRecord } from './probationSync';
import type { ProbationCheckInRecord as ServerRecord } from '../../services/apiClient';
import safeStorage from "../../utils/safeStorage";
import { useExternalBrowser } from "../../hooks/useExternalBrowser";
import { resizeProofImage } from "../showerGate/showerGateService";
import { authFetchJson } from "../../services/apiClient";
import {
  getProbationCheckInPhase,
  getProbationMonthKey,
  isProbationJobLockRequired,
  type ProbationCheckInPhase,
} from "./probationPolicy";

export const CE_CHECK_IN_URL = "https://checkin.ce-connect.com/";
const STORAGE_KEY = "aio_probation_check_ins_v1";
const SYNC_STATUS_KEY = "aio_probation_sync_status_v1";

export type ProbationDeviceClass = "phone" | "tablet" | "computer";
export type ProbationVerificationLevel = "self_confirmed" | "screenshot_documented" | "provider_verified";

export interface ProbationAuditEvent {
  type: "opened_ce" | "proof_attached" | "completed";
  at: string;
  device: ProbationDeviceClass;
}

export interface ProbationCheckInRecord {
  monthKey: string;
  startedAt?: string;
  completedAt?: string;
  device: ProbationDeviceClass;
  verificationLevel?: ProbationVerificationLevel;
  proofName?: string;
  proofDataUrl?: string;
  providerReceiptId?: string;
  confirmationUrl?: string;
  confirmationMessageId?: string;
  events: ProbationAuditEvent[];
  // Server sync metadata
  clientUpdatedAt?: string;
  serverSynced?: boolean;
  serverUpdatedAt?: string;
}

export interface ProbationSyncStatus {
  lastSyncedAt?: string;
  pendingSync: boolean;
  lastError?: string;
}

function detectDeviceClass(): ProbationDeviceClass {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "computer";
  const ua = navigator.userAgent.toLowerCase();
  const touch = navigator.maxTouchPoints > 1;
  if (/ipad|tablet|kindle|silk/.test(ua) || (touch && window.innerWidth >= 600)) return "tablet";
  if (/iphone|ipod|android|mobile/.test(ua) || (touch && window.innerWidth < 600)) return "phone";
  return "computer";
}

function loadRecords(key = STORAGE_KEY): ProbationCheckInRecord[] {
  const raw = safeStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface ProbationCheckInState {
  hasLegacyRecords?: boolean;
  importLegacyRecords?: () => void;
  monthKey: string;
  phase: ProbationCheckInPhase;
  locked: boolean;
  completed: boolean;
  device: ProbationDeviceClass;
  record: ProbationCheckInRecord | null;
  error: string;
  syncStatus: ProbationSyncStatus;
  pendingRecordCount?: number;
  openCeCheckIn: () => void;
  attachProof: (file: File) => Promise<void>;
  captureComputerProof: () => Promise<void>;
  confirmCompleted: () => void;
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}

export function useProbationCheckIn(now: Date, ownerId?: string): ProbationCheckInState {
  const { open } = useExternalBrowser();
  const monthKey = getProbationMonthKey(now);
  const [records, setRecords] = useState<ProbationCheckInRecord[]>([]);
  const [device, setDevice] = useState<ProbationDeviceClass>(detectDeviceClass);
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState<ProbationSyncStatus>({ pendingSync: false });
  const cacheKey = ownerId ? `${STORAGE_KEY}:${ownerId}` : `${STORAGE_KEY}:signed-out`;
  const ownerRef = useRef(ownerId);
  ownerRef.current = ownerId;
  const recordsRef = useRef(records);
  const [loadedOwner, setLoadedOwner] = useState<string | undefined>();
  const busy = useRef(false);
  const generation = useRef(0);
  const syncController = useRef<AbortController | null>(null);
  const captureStreams = useRef(new Set<MediaStream>());
  const [hasLegacyRecords, setHasLegacyRecords] = useState(() => loadRecords().length > 0);
  recordsRef.current = records;
  const record = (loadedOwner === ownerId ? records : []).find(item => item.monthKey === monthKey) || null;
  const completed = Boolean(record?.completedAt);
  const phase = getProbationCheckInPhase(now, completed);

  useEffect(() => {
    const updateDevice = () => setDevice(detectDeviceClass());
    window.addEventListener("resize", updateDevice);
    return () => window.removeEventListener("resize", updateDevice);
  }, []);

  useEffect(() => {
    generation.current++;
    busy.current = false;
    const cached = ownerId ? loadRecords(cacheKey) : [];
    recordsRef.current = cached;
    setRecords(cached);
    setLoadedOwner(ownerId);
    setError("");
    setSyncStatus({ pendingSync: cached.some(r => !r.serverSynced) });
    return () => {
      generation.current++;
      syncController.current?.abort();
      captureStreams.current.forEach(stream => stream.getTracks().forEach(track => track.stop()));
      captureStreams.current.clear();
    };
  }, [ownerId, cacheKey]);
  useEffect(() => {
    if (ownerId && loadedOwner === ownerId) safeStorage.setItem(cacheKey, JSON.stringify(records.slice(-24)));
  }, [records, ownerId, loadedOwner, cacheKey]);
  const updateCurrentRecord = useCallback((update: (current: ProbationCheckInRecord) => ProbationCheckInRecord) => {
    if (!ownerId || ownerRef.current !== ownerId) return;
    setRecords(previous => {
      if (ownerRef.current !== ownerId) return previous;
      const existing = previous.find(item => item.monthKey === monthKey) || {
        monthKey,
        device,
        events: [],
      };
      const next = { ...update(existing), serverSynced: false, clientUpdatedAt: new Date().toISOString() };
      const updated = [...previous.filter(item => item.monthKey !== monthKey), next]
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
      recordsRef.current = updated;
      return updated;
    });
  }, [device, monthKey, ownerId]);

  const saveProof = useCallback((proofName: string, proofDataUrl: string) => {
    const at = new Date().toISOString();
    updateCurrentRecord(current => ({
      ...current,
      device,
      proofName,
      proofDataUrl,
      verificationLevel: current.completedAt ? "screenshot_documented" : current.verificationLevel,
      events: [...current.events, { type: "proof_attached", at, device }],
    }));
  }, [device, updateCurrentRecord]);

  const attachProof = useCallback(async (file: File) => {
    if (!ownerId || loadedOwner !== ownerId || ownerRef.current !== ownerId) return;
    const run = generation.current;
    const active = () => ownerRef.current === ownerId && generation.current === run;
    setError("");
    try {
      const dataUrl = await resizeProofImage(file);
      if (!active()) return;
      saveProof(file.name || `ce-check-in-${monthKey}.jpg`, dataUrl);
    } catch (proofError) {
      if (active()) setError(proofError instanceof Error ? proofError.message : "Could not attach the screenshot.");
    }
  }, [monthKey, saveProof, ownerId, loadedOwner]);

  const captureComputerProof = useCallback(async () => {
    if (!ownerId || loadedOwner !== ownerId || ownerRef.current !== ownerId) return;
    const run = generation.current;
    const active = () => ownerRef.current === ownerId && generation.current === run;
    let stream: MediaStream | undefined;
    let video: HTMLVideoElement | undefined;
    setError("");
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      captureStreams.current.add(stream);
      if (!active()) return;
      video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      if (!active()) return;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      saveProof(`ce-check-in-${monthKey}.jpg`, canvas.toDataURL("image/jpeg", 0.72));
    } catch (captureError) {
      if (!active()) return;
      if (captureError instanceof DOMException && captureError.name === "NotAllowedError") {
        setError("Screen capture was canceled. You can still attach a screenshot or self-confirm.");
      } else {
        setError("This browser could not capture the screen. Attach a screenshot instead.");
      }
    } finally {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        captureStreams.current.delete(stream);
      }
      if (video) video.srcObject = null;
    }
  }, [monthKey, saveProof, ownerId, loadedOwner]);

  const openCeCheckIn = useCallback(() => {
    const at = new Date().toISOString();
    setError("");
    updateCurrentRecord(current => ({
      ...current,
      device,
      startedAt: current.startedAt || at,
      events: [...current.events, { type: "opened_ce", at, device }],
    }));
    setSyncStatus(prev => ({ ...prev, pendingSync: true }));

    void open({ url: CE_CHECK_IN_URL }).catch(() => {
      setError("Could not open CE Check-In. Please try again.");
    });
  }, [device, open, updateCurrentRecord, syncStatus]);

  const confirmCompleted = useCallback(() => {
    const at = new Date().toISOString();
    setError("");
    updateCurrentRecord(current => ({
      ...current,
      device,
      completedAt: at,
      verificationLevel: current.proofDataUrl ? "screenshot_documented" : "self_confirmed",
      events: [...current.events, { type: "completed", at, device }],
    }));
    setSyncStatus(prev => ({ ...prev, pendingSync: true }));

  }, [device, updateCurrentRecord, syncStatus]);

  const synchronize = useCallback(async () => {
    if (!ownerId || loadedOwner !== ownerId || busy.current) return;
    busy.current = true;
    const controller = new AbortController();
    syncController.current = controller;
    const run = generation.current;
    const active = () => ownerRef.current === ownerId && generation.current === run;
    setSyncStatus(prev => ({ ...prev, lastError: undefined, pendingSync: recordsRef.current.some(r => !r.serverSynced) }));
    try {
      const apiBase = typeof window !== 'undefined' ? window.location.origin : '';
      const getUrl = `${apiBase}/api/probation-check-ins`;
      const postUrl = `${apiBase}/api/probation-check-ins`;
      
      
      const response = await authFetchJson<{ records: ServerRecord[] }>(getUrl, { signal: controller.signal });
      if (!active()) return;
      if (!Array.isArray(response.records) || response.records.some(r => r.owner_id !== ownerId)) throw new Error('Account changed. Reload before saving.');
      let merged = new Map(recordsRef.current.map(r => [r.monthKey, r]));
      for (const r of response.records) merged.set(r.month_key, mergeRecord(merged.get(r.month_key), fromServer(r)));
      let next = [...merged.values()].sort((a,b) => a.monthKey.localeCompare(b.monthKey)).slice(-24);
      recordsRef.current = next;
      setRecords(next);
      for (const snapshot of next.filter(r => !r.serverSynced)) {
        if (!active()) return;
        const result = await authFetchJson<{ record: ServerRecord }>(postUrl, {
          signal: controller.signal,
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload(snapshot), expectedOwnerId: ownerId }),
        });
        if (!active()) return;
        if (!result.record || result.record.owner_id !== ownerId) throw new Error('Account changed. Reload before saving.');
        // Acknowledge before calculating pending state; React may defer its render.
        const updated = recordsRef.current.map(r => r.monthKey !== snapshot.monthKey ? r : fingerprint(r) === fingerprint(snapshot)
          ? fromServer(result.record) : mergeRecord(r, fromServer(result.record)));
        recordsRef.current = updated;
        setRecords(updated);
      }
      if (active()) setSyncStatus({ lastSyncedAt: new Date().toISOString(), pendingSync: recordsRef.current.some(r => !r.serverSynced) });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Account sync failed. Please retry.';
      if (active()) setSyncStatus(prev => ({ ...prev, pendingSync: recordsRef.current.some(r => !r.serverSynced), lastError: errorMsg }));
    } finally {
      if (syncController.current === controller) syncController.current = null;
      if (active()) busy.current = false;
    }
  }, [ownerId, loadedOwner]);
  const syncToServer = synchronize;
  const loadFromServer = synchronize;
  const dirtyFingerprint = records.filter(r => !r.serverSynced).map(fingerprint).join('|');
  useEffect(() => { void synchronize(); }, [synchronize]);
  useEffect(() => {
    if (!dirtyFingerprint) return;
    const timer = window.setTimeout(() => { void synchronize(); }, 700);
    return () => window.clearTimeout(timer);
  }, [dirtyFingerprint, synchronize]);
  useEffect(() => {
    const refresh = () => { void synchronize(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); };
  }, [synchronize]);
  const importLegacyRecords = useCallback(() => {
    if (!ownerId) return;
    setRecords(current => {
      const merged = new Map(current.map(r => [r.monthKey,r]));
      for (const r of loadRecords()) merged.set(r.monthKey, mergeRecord({ ...r, serverSynced: false }, merged.get(r.monthKey) || { ...r, serverSynced: false }));
      return [...merged.values()].sort((a,b) => a.monthKey.localeCompare(b.monthKey)).slice(-24);
    });
    setHasLegacyRecords(false);
  }, [ownerId]);
  return useMemo(() => ({
    hasLegacyRecords, importLegacyRecords,
    monthKey,
    phase,
    locked: isProbationJobLockRequired(phase),
    completed,
    device,
    record,
    error,
    syncStatus,
    pendingRecordCount: loadedOwner === ownerId ? records.filter(r => !r.serverSynced).length : 0,
    openCeCheckIn,
    attachProof,
    captureComputerProof,
    confirmCompleted,
    syncToServer,
    loadFromServer,
  }), [hasLegacyRecords, importLegacyRecords, attachProof, captureComputerProof, completed, confirmCompleted, device, error, monthKey, openCeCheckIn, phase, record, records, loadedOwner, ownerId, syncStatus, syncToServer, loadFromServer]);
}
