import { useCallback, useEffect, useMemo, useState } from "react";
import safeStorage from "../../utils/safeStorage";
import { resizeProofImage } from "../showerGate/showerGateService";
import {
  getProbationCheckInPhase,
  getProbationMonthKey,
  isProbationJobLockRequired,
  type ProbationCheckInPhase,
} from "./probationPolicy";

export const CE_CHECK_IN_URL = "https://checkin.ce-connect.com/";
const STORAGE_KEY = "aio_probation_check_ins_v1";

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

export interface ProbationCheckInState {
  monthKey: string;
  phase: ProbationCheckInPhase;
  locked: boolean;
  completed: boolean;
  device: ProbationDeviceClass;
  record: ProbationCheckInRecord | null;
  error: string;
  openCeCheckIn: () => void;
  attachProof: (file: File) => Promise<void>;
  captureComputerProof: () => Promise<void>;
  confirmCompleted: () => void;
}

export function useProbationCheckIn(now: Date): ProbationCheckInState {
  const monthKey = getProbationMonthKey(now);
  const [records, setRecords] = useState<ProbationCheckInRecord[]>(loadRecords);
  const [device, setDevice] = useState<ProbationDeviceClass>(detectDeviceClass);
  const [error, setError] = useState("");
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

  const openCeCheckIn = useCallback(() => {
    const at = new Date().toISOString();
    setError("");
    updateCurrentRecord(current => ({
      ...current,
      device,
      startedAt: current.startedAt || at,
      events: [...current.events, { type: "opened_ce", at, device }],
    }));
    window.open(CE_CHECK_IN_URL, "_blank", "noopener,noreferrer");
  }, [device, updateCurrentRecord]);

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
  }, [device, updateCurrentRecord]);

  return useMemo(() => ({
    monthKey,
    phase,
    locked: isProbationJobLockRequired(phase),
    completed,
    device,
    record,
    error,
    openCeCheckIn,
    attachProof,
    captureComputerProof,
    confirmCompleted,
  }), [attachProof, captureComputerProof, completed, confirmCompleted, device, error, monthKey, openCeCheckIn, phase, record]);
}
