import type { Coordinates } from '../../types';

export type ProofAssetKind = 'photos' | 'screenshots' | 'receipts';

export interface ProofAsset {
  id: string;
  name: string;
  dataUrl: string;
  addedAt: string;
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
