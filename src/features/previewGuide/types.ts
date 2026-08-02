export type PreviewGuideStage =
  | 'no_preview'
  | 'importing'
  | 'processing'
  | 'preview_ready'
  | 'summary_selecting'
  | 'summary_processing'
  | 'summary_review'
  | 'preparation'
  | 'ready_to_travel'
  | 'travel_planning'
  | 'traveling'
  | 'arrived'
  | 'job_guide'
  | 'completed';

export type PreviewPageTag =
  | 'important' | 'bring' | 'dress-code' | 'required-photo'
  | 'reference-image' | 'warning' | 'stop-condition' | 'training'
  | 'authorization' | 'store-information' | 'question' | 'other';

export type ConfirmationMode = 'photo' | 'one_tap' | 'review' | 'none';
export type RequirementStatus = 'incomplete' | 'in_progress' | 'complete' | 'needs_review';

export interface PreviewRequirement {
  id: string;
  text: string;
  type: 'physical_item' | 'dress_code' | 'training' | 'authorization' | 'device' | 'other';
  confirmationMode: ConfirmationMode;
  required: boolean;
  sourcePageIds: string[];
  confidence: number;
}

export interface PreviewTask {
  id: string;
  text: string;
  sourcePageIds: string[];
  confidence: number;
}

export interface PreviewProofRequirement extends PreviewTask {
  required: boolean;
}

export interface PreviewWarning extends PreviewTask {}

export interface PreviewUncertainty extends PreviewTask {}

export interface JobPreviewSummary {
  title?: string;
  estimatedMinutes?: number;
  payText?: string;
  beforeYouGo: PreviewRequirement[];
  whatYouWillDo: PreviewTask[];
  proofRequirements: PreviewProofRequirement[];
  warnings: PreviewWarning[];
  referenceTopics: string[];
  uncertainItems: PreviewUncertainty[];
  sourcePageIds: string[];
  generatedAt: string;
  reviewedByUser: boolean;
}

export interface PreviewPage {
  id: string;
  guideId: string;
  order: number;
  imageRef: string;
  thumbnailRef: string;
  sourceTimeSeconds: number;
  status: 'included' | 'removed';
  selectedForSummary: boolean;
  tags: PreviewPageTag[];
  extractedText?: string;
  extractionConfidence?: number;
  userNote?: string;
}

export interface PreparationState {
  requirementId: string;
  status: RequirementStatus;
  confirmedAt?: string;
  photoRef?: string;
}

export interface JobPreviewGuide {
  id: string;
  jobId: string;
  status: 'empty' | 'processing' | 'ready' | 'needs_review' | 'failed';
  stage: PreviewGuideStage;
  sourceType: 'screen_recording';
  sourceVideoRef?: string;
  pageIds: string[];
  pages: PreviewPage[];
  coverPageId?: string;
  summary?: JobPreviewSummary;
  preparation: PreparationState[];
  extractionVersion: number;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
  completedAt?: string;
  travelStartedAt?: string;
  arrivedAt?: string;
}

export interface ExtractedFrame {
  image: Blob;
  thumbnail: Blob;
  sourceTimeSeconds: number;
  difference: number;
  blurScore: number;
}
