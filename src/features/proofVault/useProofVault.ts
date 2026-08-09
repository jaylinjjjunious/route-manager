import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Job } from '../../types';
import safeStorage from '../../utils/safeStorage';
import type { ProofAsset, ProofAssetKind, ProofRecord } from './types';

const PROOF_VAULT_STORAGE_KEY = 'proof_vault_records';

interface UseProofVaultOptions {
  completedJobs: Job[];
}

const buildProcessServeProofNotes = (job: Job) => (
  job.jobType === 'process_serve' && job.processServe
    ? [
        job.notes,
        `Company: ${job.processServe.company || 'Process Serve'}`,
        job.processServe.caseNumber ? `Case/Order: ${job.processServe.caseNumber}` : '',
        job.processServe.partyName ? `Party: ${job.processServe.partyName}` : '',
        job.processServe.documentType ? `Documents: ${job.processServe.documentType}` : '',
        `Attempt Status: ${(job.processServe.attemptStatus || 'not_attempted').replaceAll('_', ' ')}`,
        `Address Status: ${(job.processServe.addressStatus || 'unknown').replaceAll('_', ' ')}`,
        job.processServe.proofOfResidence ? `Proof of residence/address: ${job.processServe.proofOfResidence}` : '',
        job.processServe.recipientDescription ? `Recipient description: ${job.processServe.recipientDescription}` : '',
        job.processServe.attemptNotes ? `Attempt notes: ${job.processServe.attemptNotes}` : '',
        `Evidence required: ${[
          job.processServe.photoRequired ? 'photo' : '',
          job.processServe.gpsRequired ? 'GPS' : '',
          job.processServe.printedDocs ? 'printed docs' : '',
          job.processServe.proofReady ? 'proof ready' : ''
        ].filter(Boolean).join(', ') || 'none marked'}`
      ].filter(Boolean).join('\n')
    : job.notes || ''
);

const createProofRecord = (job: Job, existing?: ProofRecord): ProofRecord => {
  const now = new Date();
  const completionTime = now.toISOString();
  const arrivalTime = new Date(now.getTime() - (job.estimatedMinutes * 60 * 1000)).toISOString();
  const baseRecord: ProofRecord = existing || {
    jobId: job.id,
    storeName: job.storeName,
    address: job.address,
    completionTime,
    arrivalTime,
    gps: job.coordinates,
    photos: [],
    screenshots: [],
    receipts: [],
    notes: buildProcessServeProofNotes(job),
    createdAt: completionTime,
    updatedAt: completionTime
  };

  return {
    ...baseRecord,
    storeName: job.storeName,
    address: job.address,
    completionTime: existing?.completionTime || completionTime,
    arrivalTime: existing?.arrivalTime || arrivalTime,
    gps: job.coordinates,
    updatedAt: completionTime
  };
};

const loadProofVault = (): Record<string, ProofRecord> => {
  try {
    const saved = safeStorage.getItem(PROOF_VAULT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

export function useProofVault({ completedJobs }: UseProofVaultOptions) {
  const [proofVault, setProofVault] = useState<Record<string, ProofRecord>>(loadProofVault);
  const [selectedProofJobId, setSelectedProofJobId] = useState<string | null>(null);

  useEffect(() => {
    safeStorage.setItem(PROOF_VAULT_STORAGE_KEY, JSON.stringify(proofVault));
  }, [proofVault]);

  useEffect(() => {
    setProofVault(prev => {
      let changed = false;
      const next = { ...prev };
      completedJobs.forEach(job => {
        if (!next[job.id]) {
          next[job.id] = createProofRecord(job);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [completedJobs]);

  const ensureProofForJob = useCallback((job: Job) => {
    setProofVault(prev => ({
      ...prev,
      [job.id]: createProofRecord(job, prev[job.id])
    }));
  }, []);

  const addProofAssets = useCallback((jobId: string, kind: ProofAssetKind, files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const asset: ProofAsset = {
          id: `proof-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: file.name,
          dataUrl: String(reader.result || ''),
          addedAt: new Date().toISOString()
        };

        setProofVault(prev => {
          const record = prev[jobId];
          if (!record) return prev;
          return {
            ...prev,
            [jobId]: {
              ...record,
              [kind]: [...record[kind], asset],
              updatedAt: new Date().toISOString()
            }
          };
        });
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const updateProofNotes = useCallback((jobId: string, notes: string) => {
    setProofVault(prev => {
      const record = prev[jobId];
      if (!record) return prev;
      return {
        ...prev,
        [jobId]: {
          ...record,
          notes,
          updatedAt: new Date().toISOString()
        }
      };
    });
  }, []);

  const proofRecords = useMemo(
    () => Object.values(proofVault).sort((a, b) => new Date(b.completionTime).getTime() - new Date(a.completionTime).getTime()),
    [proofVault]
  );

  const selectedProofRecord = selectedProofJobId ? proofVault[selectedProofJobId] : null;

  const openProof = useCallback((jobId: string) => {
    setSelectedProofJobId(jobId);
  }, []);

  const openProofHistory = useCallback(() => {
    if (proofRecords.length > 0) {
      setSelectedProofJobId(proofRecords[0].jobId);
    }
  }, [proofRecords]);

  const closeProof = useCallback(() => {
    setSelectedProofJobId(null);
  }, []);

  return {
    proofRecords,
    selectedProofRecord,
    ensureProofForJob,
    addProofAssets,
    updateProofNotes,
    openProof,
    openProofHistory,
    closeProof,
  };
}
