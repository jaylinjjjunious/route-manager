import { useCallback, useEffect, useMemo, useState } from "react";
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

function loadRecords(): ProbationCheckInRecord[] {
  const raw = safeStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadSyncStatus(): ProbationSyncStatus {
  const raw = safeStorage.getItem(SYNC_STATUS_KEY);
  if (!raw) return { pendingSync: false };
  try {
    return JSON.parse(raw);
  } catch {
    return { pendingSync: false };
  }
}

function saveSyncStatus(status: ProbationSyncStatus) {
  safeStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
}

export interface ProbationCheckInState {
  monthKey: string;
  phase: ProbationCheckInPhase;
  locked: boolean;
  completed: boolean;
  device: ProbationDeviceClass;
  record: ProbationCheckInRecord | null;
  error: string;
  syncStatus: ProbationSyncStatus;
  openCeCheckIn: () => void;
  attachProof: (file: File) => Promise<void>;
  captureComputerProof: () => Promise<void>;
  confirmCompleted: () => void;
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}

export function useProbationCheckIn(now: Date): ProbationCheckInState {
  const { open } = useExternalBrowser();
  const monthKey = getProbationMonthKey(now);
  const [records, setRecords] = useState<ProbationCheckInRecord[]>(loadRecords);
  const [device, setDevice] = useState<ProbationDeviceClass>(detectDeviceClass);
  const [error, setError] = useState("");
  const [syncStatus, setSyncStatus] = useState<ProbationSyncStatus>(loadSyncStatus);
  const record = records.find(item => item.monthKey === monthKey) || null;
  const completed = Boolean(record?.completedAt);
  const phase = getProbationCheckInPhase(now, completed);

  useEffect(() => {
    const updateDevice = () => setDevice(detectDeviceClass());
    window.addEventListener("resize", updateDevice);
    return () => window.removeEventListener("resize", updateDevice);
  }, []);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-24)));
  }, [records]);

  const updateCurrentRecord = useCallback((update: (current: ProbationCheckInRecord) => ProbationCheckInRecord) => {
    setRecords(previous => {
      const existing = previous.find(item => item.monthKey === monthKey) || {
        monthKey,
        device,
        events: [],
      };
      const next = update(existing);
      return [...previous.filter(item => item.monthKey !== monthKey), next]
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    });
  }, [device, monthKey]);

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
    setError("");
    try {
      const dataUrl = await resizeProofImage(file);
      saveProof(file.name || `ce-check-in-${monthKey}.jpg`, dataUrl);
    } catch (proofError) {
      setError(proofError instanceof Error ? proofError.message : "Could not attach the screenshot.");
    }
  }, [monthKey, saveProof]);

  const captureComputerProof = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      stream.getTracks().forEach(track => track.stop());
      saveProof(`ce-check-in-${monthKey}.jpg`, canvas.toDataURL("image/jpeg", 0.72));
    } catch (captureError) {
      if (captureError instanceof DOMException && captureError.name === "NotAllowedError") {
        setError("Screen capture was canceled. You can still attach a screenshot or self-confirm.");
      } else {
        setError("This browser could not capture the screen. Attach a screenshot instead.");
      }
    }
  }, [monthKey, saveProof]);

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
    saveSyncStatus({ ...syncStatus, pendingSync: true });
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
    saveSyncStatus({ ...syncStatus, pendingSync: true });
  }, [device, updateCurrentRecord, syncStatus]);

  // Sync current month's record to server
  const syncToServer = useCallback(async () => {
    if (!record) return;
    
    setSyncStatus(prev => ({ ...prev, pendingSync: true, lastError: undefined }));
    saveSyncStatus({ ...syncStatus, pendingSync: true, lastError: undefined });

    try {
      const payload = {
        monthKey: record.monthKey,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        device: record.device,
        verificationLevel: record.verificationLevel,
        proofName: record.proofName,
        proofDataUrl: record.proofDataUrl,
        providerReceiptId: record.providerReceiptId,
        confirmationUrl: record.confirmationUrl,
        confirmationMessageId: record.confirmationMessageId,
        events: record.events,
      };

      interface ServerProbationRecord {
        owner_id: string;
        month_key: string;
        started_at?: string;
        completed_at?: string;
        device: "phone" | "tablet" | "computer";
        verification_level?: "self_confirmed" | "screenshot_documented" | "provider_verified";
        proof_name?: string;
        proof_data_url?: string;
        provider_receipt_id?: string;
        confirmation_url?: string;
        confirmation_message_id?: string;
        events: Array<{ type: string; at: string; device: string }>;
        updated_at: string;
      }

      const { record: serverRecord } = await authFetchJson<{ record: ServerProbationRecord }>("/api/probation-check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Update local record with server sync info
      updateCurrentRecord(current => ({
        ...current,
        serverSynced: true,
        serverUpdatedAt: serverRecord.updated_at,
      }));

      const now = new Date().toISOString();
      setSyncStatus({ lastSyncedAt: now, pendingSync: false });
      saveSyncStatus({ lastSyncedAt: now, pendingSync: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sync to server.";
      setSyncStatus(prev => ({ ...prev, pendingSync: false, lastError: message }));
      saveSyncStatus({ ...syncStatus, pendingSync: false, lastError: message });
      setError(message);
    }
  }, [record, updateCurrentRecord, syncStatus]);

  // Load records from server (merge with local)
  const loadFromServer = useCallback(async () => {
    try {
      interface ServerProbationRecord {
        owner_id: string;
        month_key: string;
        started_at?: string;
        completed_at?: string;
        device: "phone" | "tablet" | "computer";
        verification_level?: "self_confirmed" | "screenshot_documented" | "provider_verified";
        proof_name?: string;
        proof_data_url?: string;
        provider_receipt_id?: string;
        confirmation_url?: string;
        confirmation_message_id?: string;
        events: Array<{ type: string; at: string; device: string }>;
        updated_at: string;
      }

      const { records: serverRecords } = await authFetchJson<{ records: ServerProbationRecord[] }>("/api/probation-check-ins");
      
      setRecords(previous => {
        const merged = new Map<string, ProbationCheckInRecord>();
        
        // Add local records first
        for (const r of previous) {
          merged.set(r.monthKey, r);
        }
        
        // Merge server records (server wins for synced fields)
        for (const sr of serverRecords) {
          const local = merged.get(sr.month_key);
          if (local) {
            // Keep local unsynced changes, but update server metadata
            merged.set(sr.month_key, {
              ...local,
              startedAt: sr.started_at || local.startedAt,
              completedAt: sr.completed_at || local.completedAt,
              device: sr.device || local.device,
              verificationLevel: sr.verification_level || local.verificationLevel,
              proofName: sr.proof_name || local.proofName,
              proofDataUrl: sr.proof_data_url || local.proofDataUrl,
              providerReceiptId: sr.provider_receipt_id || local.providerReceiptId,
              confirmationUrl: sr.confirmation_url || local.confirmationUrl,
              confirmationMessageId: sr.confirmation_message_id || local.confirmationMessageId,
              events: sr.events && sr.events.length > 0
                ? sr.events.map(e => ({ type: e.type as ProbationAuditEvent["type"], at: e.at, device: e.device as ProbationDeviceClass }))
                : local.events,
              serverSynced: true,
              serverUpdatedAt: sr.updated_at,
            });
          } else {
            // New record from server
            merged.set(sr.month_key, {
              monthKey: sr.month_key,
              startedAt: sr.started_at,
              completedAt: sr.completed_at,
              device: sr.device,
              verificationLevel: sr.verification_level,
              proofName: sr.proof_name,
              proofDataUrl: sr.proof_data_url,
              providerReceiptId: sr.provider_receipt_id,
              confirmationUrl: sr.confirmation_url,
              confirmationMessageId: sr.confirmation_message_id,
              events: sr.events && sr.events.length > 0
                ? sr.events.map(e => ({ type: e.type as ProbationAuditEvent["type"], at: e.at, device: e.device as ProbationDeviceClass }))
                : [],
              serverSynced: true,
              serverUpdatedAt: sr.updated_at,
            });
          }
        }
        
        return Array.from(merged.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
      });

      const now = new Date().toISOString();
      setSyncStatus({ lastSyncedAt: now, pendingSync: false });
      saveSyncStatus({ lastSyncedAt: now, pendingSync: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load from server.";
      setSyncStatus(prev => ({ ...prev, pendingSync: false, lastError: message }));
      saveSyncStatus({ ...syncStatus, pendingSync: false, lastError: message });
    }
  }, [syncStatus]);

  return useMemo(() => ({
    monthKey,
    phase,
    locked: isProbationJobLockRequired(phase),
    completed,
    device,
    record,
    error,
    syncStatus,
    openCeCheckIn,
    attachProof,
    captureComputerProof,
    confirmCompleted,
    syncToServer,
    loadFromServer,
  }), [attachProof, captureComputerProof, completed, confirmCompleted, device, error, monthKey, openCeCheckIn, phase, record, syncStatus, syncToServer, loadFromServer]);
}