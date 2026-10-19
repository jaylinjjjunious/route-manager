import type { Coordinates } from '../../types';
import type { ProcedureProofType } from '../jobs/procedures/types';

export type ProofAssetKind = 'photos' | 'screenshots' | 'receipts';

export interface ProofAsset {
  id: string;
  name: string;
  dataUrl: string;
  addedAt: string;
  source?: 'manual' | 'procedure_requirement' | 'job_completion' | 'import';
  proofType?: ProcedureProofType;
  requirementId?: string;
  procedureId?: string;
  procedureVersion?: string;
  procedureStepId?: string;
  visitId?: string;
}

export interface ProofRecord {
  jobId: string;
  storeName: string;
  address: string;
  completionTime: string;
  arrivalTime: string;
  gps?: Coordinates;
  photos: ProofAsset[];
  screenshots: ProofAsset[];
  receipts: ProofAsset[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}
