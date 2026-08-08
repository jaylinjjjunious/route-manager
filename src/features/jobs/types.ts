import type { Job } from '../../types';

export interface JobMutationResult {
  previousJob: Job | null;
  updatedJob: Job | null;
  nextJobs: Job[];
  becameCompleted: boolean;
  becameFinished: boolean;
}
