/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type JobType = 'retail_audit' | 'merchandising' | 'mystery_shop' | 'field_task' | 'process_serve';

export type JobStatus = 'ready' | 'revisit' | 'under_review' | 'completed' | 'pending' | 'postponed' | 'outlier' | 'finished';

export interface StatusEvent {
  timestamp: string;
  from: JobStatus;
  to: JobStatus;
  note?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ProcessServeDetails {
  company?: string;
  caseNumber?: string;
  partyName?: string;
  documentType?: string;
  clientMatter?: string;
  attemptWindow?: string;
  courtDiligence?: string;
  specialHandling?: string;
  addressStatus?: 'unknown' | 'confirmed' | 'bad_address' | 'vacant' | 'gated' | 'business' | 'residential';
  attemptStatus?: 'not_attempted' | 'served' | 'not_home' | 'no_answer' | 'refused' | 'moved' | 'unable_to_access' | 'unsafe' | 'needs_more_info';
  proofOfResidence?: string;
  servedPersonName?: string;
  relationshipToParty?: string;
  recipientDescription?: string;
  attemptNotes?: string;
  photoRequired?: boolean;
  gpsRequired?: boolean;
  printedDocs?: boolean;
  needsNotary?: boolean;
  proofReady?: boolean;
}

export interface Job {
  id: string;
  storeName: string;
  address: string;
  pay: number;
  estimatedMinutes: number; // Time spent inside store
  jobType: JobType;
  dueTime: string; // e.g. "17:00" or "05:00 PM"
  notes: string;
  status: JobStatus;
  routeId: 'A' | 'B';
  coordinates: Coordinates;
  smartMergeExplanation?: string;
  smartMergeSavedMinutes?: number;
  priority?: 'low' | 'medium' | 'high';
  isRevisionRequired?: boolean;
  isCompleted?: boolean;
  deadline?: string;
  revisionStatus?: string; // e.g. "Draft", "Approved", "Needs Revision", "Under Review"
  statusHistory?: StatusEvent[];
  processServe?: ProcessServeDetails;
  captureMode?: 'single_photo' | 'manual_multiple' | 'smart_aisle_scan';
  scanSessionId?: string;
}

export interface RouteMetrics {
  totalPay: number;
  totalRideTime: number; // in minutes
  totalWorkTime: number; // in minutes
  totalTime: number; // total ride + work time in minutes
  totalDistance: number; // in miles
  estimatedBatteryUsage: number; // percentage (0-100+)
  earningsPerHour: number;
  completedJobsCount: number;
  totalJobsCount: number;
  isGoogleLive?: boolean;
}

export type OutlierStatus = 'do_now' | 'push_to_b' | 'wait_for_more';

export interface OutlierReport {
  jobId: string;
  storeName: string;
  status: OutlierStatus;
  distanceToNearest: number; // miles
  avgDistanceToOthers: number; // miles
  timeIncreaseMinutes: number;
  batteryCostPercent: number;
  explanation: string;
}

export interface RouteScoreReport {
  score: number; // 0 to 100
  payRating: 'excellent' | 'good' | 'fair' | 'poor';
  distanceRating: 'excellent' | 'good' | 'fair' | 'poor';
  batterySafetyRating: 'excellent' | 'good' | 'fair' | 'poor';
  clusteringRating: 'excellent' | 'good' | 'fair' | 'poor';
  suggestions: string[];
}

export interface EbikeConfig {
  model: string;
  batteryCapacityWh: number;
  avgSpeedMph: number;
  batteryPercentPerMile: number; // standard battery drainage rate per mile
  maxRangeMiles: number;
}

export type DispatcherIntentType = 
  | 'COMPLETE_JOB'
  | 'ADD_JOB'
  | 'EDIT_JOB'
  | 'MOVE_TO_TOMORROW'
  | 'MOVE_TO_ROUTE_B'
  | 'UPDATE_BATTERY'
  | 'GET_NEXT_STOP'
  | 'GET_REMAINING_JOBS'
  | 'REOPTIMIZE_ROUTE'
  | 'END_DAY_SUMMARY'
  | 'NONE';

export interface DispatcherAction {
  type: DispatcherIntentType;
  jobTarget?: string;
  jobData?: Partial<Job>;
  batteryValue?: number;
  requiresConfirmation?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  action?: DispatcherAction;
  undone?: boolean;
}

export interface ExtractedJob {
  temporaryId: string;
  sourceImageIds: string[];
  companyName: string | null;
  title: string | null;
  address: {
    street: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    formatted: string | null;
  };
  pay: {
    amount: number | null;
    currency: 'USD' | null;
  };
  dueAt: string | null;
  estimatedDurationMinutes: number | null;
  jobType: string | null;
  instructions: string | null;
  notes: string | null;
  status: string | null;
  assignmentId: string | null;
  sourcePlatform: string | null;
  confidence: {
    overall: number;
    fields: Record<string, number>;
  };
  warnings: string[];
  selected: boolean;
  duplicateOf?: string;
}

export interface ScreenshotImage {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

export type TravelMode = 'bicycling' | 'driving' | 'walking' | 'transit';

export interface TransitPoint {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface TransitStop {
  stopId: string;
  stopName: string;
  latitude: number;
  longitude: number;
}

export interface TransitInstruction {
  text: string;
  distanceMeters?: number;
}

export interface TransitAlert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface TransitWalkLeg {
  type: 'walk';
  from: TransitPoint;
  to: TransitPoint;
  durationMinutes: number;
  distanceMeters: number;
  instructions: TransitInstruction[];
  polyline?: string;
}

export interface TransitRideLeg {
  type: 'transit';
  routeShortName?: string;
  routeLongName?: string;
  headsign?: string;
  agencyName?: string;
  boardingStop: TransitStop;
  exitStop: TransitStop;
  departureTime: string;
  predictedDepartureTime?: string;
  arrivalTime: string;
  predictedArrivalTime?: string;
  stopCount?: number;
}

export type TransitLeg = TransitWalkLeg | TransitRideLeg;

export type OnTimeStatus = 'early' | 'on-time' | 'late' | 'unknown';

export interface TransitTrip {
  tripId: string;
  origin: TransitPoint;
  destination: TransitPoint;
  departureTime: string;
  arrivalTime: string;
  totalDurationMinutes: number;
  totalWalkingMinutes: number;
  totalWalkingDistanceMeters: number;
  transferCount: number;
  onTimeStatus: OnTimeStatus;
  deadlineDifferenceMinutes: number | null;
  legs: TransitLeg[];
  alerts: TransitAlert[];
  provider: string;
  fetchedAt: string;
}

export interface TransitTripRequest {
  origin: { latitude: number; longitude: number };
  destination: { latitude?: number; longitude?: number; address?: string };
  departureTime?: string;
  arrivalTime?: string;
  preferredMode: 'transit';
}

export type BusModeStatus = 'idle' | 'loading' | 'active' | 'error' | 'stale';

// ─── Smart Aisle Scan Types ───────────────────────────────────────────

export type CaptureDirection = 'left_to_right' | 'right_to_left';
export type AisleSide = 'left' | 'right' | 'both' | 'endcap';
export type PhotoRole = 'beginning' | 'section' | 'ending' | 'context' | 'retake';

export type ScanSessionStatus =
  | 'setup'
  | 'capturing'
  | 'coverage_review'
  | 'stitching'
  | 'stitch_review'
  | 'ready_to_submit'
  | 'submitted'
  | 'paused'
  | 'failed';

export type ValidationStatus = 'not_checked' | 'ready' | 'review_required' | 'blocked';
export type StitchStatus = 'not_started' | 'processing' | 'successful' | 'review_recommended' | 'failed';

export interface PhotoValidation {
  focusScore: number | null;
  brightnessScore: number | null;
  motionScore: number | null;
  levelScore: number | null;
  obstructionScore: number | null;
  topShelfVisible: boolean | null;
  bottomShelfVisible: boolean | null;
  meaningfulCoverage: boolean | null;
  passed: boolean;
  warnings: string[];
}

export interface OverlapInfo {
  score: number | null;
  estimatedPercent: number | null;
  confidence: number | null;
}

export interface AisleScanPhoto {
  id: string;
  sessionId: string;
  sequenceNumber: number;
  role: PhotoRole;
  dataUrl: string;
  analysisDataUrl: string;
  capturedAt: string;
  captureDirection: CaptureDirection;
  aisleSide: AisleSide;
  captureMethod: 'automatic' | 'manual' | 'test_import';
  width: number;
  height: number;
  validation: PhotoValidation;
  overlapWithPrevious: OverlapInfo | null;
  retakeOfPhotoId: string | null;
  isActive: boolean;
}

export interface AisleScanWarning {
  id: string;
  photoId: string;
  type: 'gap' | 'weak_overlap' | 'duplicate' | 'blur' | 'dark' | 'cutoff' | 'low_confidence' | 'obstruction';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  resolved: boolean;
}

export interface AisleScanSession {
  id: string;
  jobId: string;
  mode: AisleScanSessionMode;
  status: ScanSessionStatus;
  captureDirection: CaptureDirection;
  aisleSide: AisleSide;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  photoSequence: string[];
  warnings: AisleScanWarning[];
  validationStatus: ValidationStatus;
  stitchStatus: StitchStatus;
  stitchedPreviewDataUrl: string | null;
  stitchVersion: number;
  reviewConfirmedAt: string | null;
  override: {
    reason: string;
    note: string | null;
    confirmedAt: string;
  } | null;
  checklist: ScanChecklist;
}

export interface ScanChecklist {
  beginningCaptured: boolean;
  endingCaptured: boolean;
  continuousSequence: boolean;
  overlapPresent: boolean;
  topShelvesVisible: boolean;
  bottomShelvesVisible: boolean;
  noMajorSkips: boolean;
  photosClear: boolean;
  contextPhotoCaptured: boolean;
  warningsReviewed: boolean;
  stitchReviewed: boolean;
  criticalFailuresResolved: boolean;
}

export type SmartAisleScanPhase =
  | 'setup'
  | 'beginning'
  | 'capturing'
  | 'ending'
  | 'context'
  | 'coverage_review'
  | 'stitching'
  | 'stitch_review'
  | 'final_checklist'
  | 'submitting'
  | 'complete';

// ─── Smart Aisle Scan Test Lab Types ────────────────────────────────

export type AisleScanSessionMode = 'audit' | 'test_lab';

export type TestLabScreen =
  | 'home'
  | 'live_practice'
  | 'live_practice_instructions'
  | 'import_sequence'
  | 'import_defects'
  | 'controlled_scenarios'
  | 'scenario_run'
  | 'markers'
  | 'diagnostics'
  | 'results'
  | 'cleanup';

export type TestDifficulty = 'basic' | 'standard' | 'stress';
export type PracticeSubject = 'bookshelf' | 'cabinets' | 'product_row' | 'wall' | 'custom';
export type TestExpectedResult = 'successful' | 'review_recommended' | 'failed';

export interface SmartAisleTestScenario {
  id: string;
  name: string;
  description: string;
  captureDirection: CaptureDirection;
  expectedResult: TestExpectedResult;
  expectedWarnings: string[];
  forbiddenWarnings?: string[];
  imageCount: number;
  difficulty: TestDifficulty;
}

export interface TestLabDiagnostics {
  deviceOrientation: string | null;
  levelDeviation: number | null;
  motionMagnitude: number | null;
  cameraReady: boolean;
  detectedLens: string | null;
  frameDimensions: string | null;
  focusAvailable: boolean;
  brightnessScore: number | null;
  steadyHoldProgress: number;
  overlapScore: number | null;
  matchConfidence: number | null;
  meaningfulNewCoverage: boolean | null;
  autoCaptureCooldown: boolean;
  captureLocked: boolean;
  activeWorker: boolean;
  memoryWarnings: string[];
  processingQueueLength: number;
}

export interface TestLabResult {
  sessionId: string;
  appVersion: string;
  processingVersion: string;
  deviceClass: string;
  captureMode: string;
  photoCount: number;
  activeSequenceCount: number;
  direction: CaptureDirection;
  averageOverlapScore: number | null;
  weakestPair: string | null;
  duplicateDetections: number;
  imageQualityWarnings: string[];
  stitchStatus: StitchStatus;
  stitchDurationMs: number | null;
  coverageStatus: string;
  reviewConfirmed: boolean;
  interruptionRecoveryStatus: string;
  offlineSyncStatus: string;
  passedChecks: string[];
  failedChecks: string[];
  notSupportedChecks: string[];
  manualNotes: string[];
}

export interface TestLabScorecardItem {
  label: string;
  status: 'passed' | 'failed' | 'not_tested' | 'not_supported';
}


