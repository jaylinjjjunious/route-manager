/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import { useAuth } from './auth/AuthProvider';
import { Job, Coordinates, RouteMetrics, EbikeConfig, DispatcherAction, JobType } from './types';
import {
  BAKERSFIELD_COORDINATES,
  DEFAULT_EBIKE_CONFIG,
  getDistanceInMiles,
  resolveCoordinates,
  optimizeRoute,
  optimizeRouteWithSmartMerge,
  calculateRouteMetrics,
  detectOutliers
} from './utils/routeUtils';
import {
  JOB_STATE_SCHEMA_VERSION,
  isJobCompleted,
  isJobFinished,
  isRevisionJob,
  normalizeJobState,
  normalizeJobsForStorage,
  recordStatusTransition,
  migrateJobSchedules
} from './features/jobs/jobState';
import {
  addDays,
  effectiveDay,
  todayString,
  isValidScheduledDate,
  isActionableJob,
  formatScheduledDate,
  groupJobsByDay,
  isOverdue,
  SCHEDULE_MAX_DAYS_AHEAD
} from './features/jobs/jobSchedule';
import Header from './components/Header';
import JobCard from './features/jobs/JobCard';
import JobModal from './features/jobs/JobModal';
import AssistantProvider from './assistant/AssistantProvider';
import AssistantBubble from './assistant/AssistantBubble';
import AmbientLiquidBackground from './components/backgrounds/AmbientLiquidBackground';
import JobDetailModal from './features/jobs/JobDetailModal';
import ShowerGatePanel from './features/showerGate/ShowerGatePanel';
import RideModeSurface from './features/rideTracker/RideModeSurface';
import RideTrackerTab from './features/rideTracker/RideTrackerTab';
import { useRideTracker } from './features/rideTracker/useRideTracker';
import ScreenshotImportModal from './components/ScreenshotImportModal';
import SmartAisleScan from './components/SmartAisleScan';
import InventoryCustodyPanel from './components/InventoryCustodyPanel';
import { getInventoryDomain, inventoryDomainLabel } from './services/inventory/domain';
import SmartAisleScanTestLab from './components/SmartAisleScanTestLab';
import { RouteFilter, filterJobsByType } from './features/jobs/RouteFilter';
import type { RouteFilterType } from './features/jobs/RouteFilter';
import { BusModeToggle } from './components/BusModeToggle';
import { TransitTripCard } from './components/TransitTripCard';
import { useTransitTrip } from './hooks/useTransitTrip';
import { TransitDashboardCard } from './components/transit/TransitDashboardCard';
import { MoveToDaySheet } from './features/jobs/MoveToDaySheet';
import AioHeader from './components/aio/AioHeader';
import TodayScreen from './components/aio/TodayScreen';
import JobsScreen from './features/jobs/JobsScreen';
import MoreScreen from './components/aio/MoreScreen';
import { BottomTabBar } from './components/aio/primitives';
import { getPreviewGuide } from './features/previewGuide/storage';
import PreviewGuideModal from './features/previewGuide/PreviewGuideModal';
import { getPreviewGuideReadiness } from './components/aio/roadReadiness';
import { TransitToolsPanel } from './components/transit/TransitToolsPanel';
import { TransitStatusCard } from './components/transit/TransitStatusCard';
import type { TravelMode } from './types';
import { getLocalDateKey } from './utils/showerCycle';
import HabitsTab from './features/habits/HabitsTab';
import { useHabits } from './features/habits/useHabits';
import safeStorage from './utils/safeStorage';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import type { ShowerProofRecord } from './features/showerGate/showerProofApi';
import type { ShowerProof } from './features/showerGate/types';
import { useShowerGate } from './features/showerGate/useShowerGate';
import { authFetch, authFetchJson } from './services/apiClient';
import { isTransitApiEnabled } from './services/transit';
import DebugCenter from './components/settings/DebugCenter';
import {
  Plus, Sliders, Play, Moon, Sun, Layers, ShieldCheck, MapPin, CheckSquare,
  LayoutDashboard, Briefcase, Battery, Settings, AlertTriangle, ArrowRightLeft,
  TrendingUp, HelpCircle, ShieldAlert, Sparkles, Compass, ExternalLink, Navigation, CheckCircle2,
  ChevronDown, ChevronUp, ChevronRight, DollarSign, Zap, Award, Volume2, VolumeX,
  FolderOpen, Camera, FileImage, ReceiptText, StickyNote, X, Hourglass, Bug, FlaskConical, PackageCheck
} from 'lucide-react';

const isSmartAisleTestLabEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_SMART_AISLE_TEST_LAB === 'true';

type ProofAssetKind = 'photos' | 'screenshots' | 'receipts';

interface ProofAsset {
  id: string;
  name: string;
  dataUrl: string;
  addedAt: string;
}

interface ProofRecord {
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

const SHOWER_HABIT_TASK_ID = 'habit-task-mandatory-shower';
const SHOWER_HABIT_NAME = 'Mandatory Shower';
// Temporary operational bypass. Set true to restore the scan/access gate without removing its implementation.
const SHOWER_GATE_REQUIRED = false;

type AppTab = 'dashboard' | 'jobs' | 'more' | 'inventory' | 'battery' | 'tracker' | 'habits' | 'tools' | 'settings';

const APP_TABS: AppTab[] = ['dashboard', 'jobs', 'more', 'inventory', 'battery', 'tracker', 'habits', 'tools', 'settings'];
const SHOWER_PROTECTED_TABS: AppTab[] = ['battery', 'tracker'];

const RETIRED_ROUTE_DESTINATIONS = new Set(['route', 'routes']);

const isRetiredRouteDestination = (value: string): boolean => {
  const normalized = value.toLowerCase().replace(/^[/#]+/, '').replace(/\/$/, '');
  return RETIRED_ROUTE_DESTINATIONS.has(normalized);
};

const redirectRetiredRouteDestination = (): boolean => {
  if (typeof window === 'undefined') return false;

  if (isRetiredRouteDestination(window.location.pathname) || isRetiredRouteDestination(window.location.hash)) {
    window.history.replaceState(null, '', '/#dashboard');
    return true;
  }

  return false;
};

const getTabFromHash = (): AppTab | null => {
  if (typeof window === 'undefined') return null;
  if (redirectRetiredRouteDestination()) return 'dashboard';
  const tab = window.location.hash.replace('#', '') as AppTab;
  return APP_TABS.includes(tab) ? tab : null;
};

interface BarcodeDetectorResult {
  rawValue?: string;
  format?: string;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): {
    detect: (source: CanvasImageSource) => Promise<BarcodeDetectorResult[]>;
  };
  getSupportedFormats?: () => Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

const SEED_JOBS: Job[] = [
  {
    id: 'seed-1',
    storeName: 'Family Dollar',
    address: 'Family Dollar 600 Norris Rd',
    pay: 11.50,
    estimatedMinutes: 15,
    jobType: 'field_task',
    dueTime: '12:00 PM',
    notes: 'Verify shelf placement of laundry detergents.',
    status: 'ready',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Family Dollar 600 Norris Rd']
  },
  {
    id: 'seed-2',
    storeName: 'Family Dollar',
    address: 'Family Dollar 2151 S Chester Ave',
    pay: 14.00,
    estimatedMinutes: 20,
    jobType: 'retail_audit',
    dueTime: '02:00 PM',
    notes: 'Photograph endcap displaying seasonal candy.',
    status: 'ready',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Family Dollar 2151 S Chester Ave']
  },
  {
    id: 'seed-3',
    storeName: 'Dollar General',
    address: 'Dollar General 5101 White Ln',
    pay: 16.50,
    estimatedMinutes: 25,
    jobType: 'merchandising',
    dueTime: '03:30 PM',
    notes: 'Restock soda displays and apply promotional price stickers.',
    status: 'ready',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Dollar General 5101 White Ln']
  },
  {
    id: 'seed-4',
    storeName: 'Vons Revisit',
    address: 'Vons 9000 Ming Ave',
    pay: 23.00,
    estimatedMinutes: 30,
    jobType: 'mystery_shop',
    dueTime: '05:00 PM',
    notes: 'Re-audit photo quality of customer service evaluation at bakery.',
    status: 'revisit',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Vons 9000 Ming Ave']
  },
  {
    id: 'seed-5',
    storeName: 'Target',
    address: 'Target 9100 Rosedale Hwy',
    pay: 18.00,
    estimatedMinutes: 20,
    jobType: 'retail_audit',
    dueTime: '06:00 PM',
    notes: 'Audit electronics displays and verify lockbox keys present.',
    status: 'ready',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Target 9100 Rosedale Hwy']
  },
  {
    id: 'seed-6',
    storeName: 'Albertsons Revisit',
    address: 'Albertsons 13045 Rosedale Hwy',
    pay: 12.00,
    estimatedMinutes: 20,
    jobType: 'merchandising',
    dueTime: '04:00 PM',
    notes: 'Resubmit photo proof of greeting card displays.',
    status: 'revisit',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Albertsons 13045 Rosedale Hwy']
  },
  {
    id: 'seed-7',
    storeName: 'Tractor Supply / Buck Café Revisit',
    address: 'Tractor Supply / Buck Café Revisit: 2620 Buck Owens Blvd',
    pay: 15.00,
    estimatedMinutes: 15,
    jobType: 'field_task',
    dueTime: '01:30 PM',
    notes: 'Confirm display corrected at front register area.',
    status: 'revisit',
    routeId: 'A',
    coordinates: BAKERSFIELD_COORDINATES['Tractor Supply / Buck Café Revisit: 2620 Buck Owens Blvd']
  },
  {
    id: 'seed-8',
    storeName: 'BevMo',
    address: 'BevMo 10650 Stockdale Hwy #500',
    pay: 42.00,
    estimatedMinutes: 35,
    jobType: 'mystery_shop',
    dueTime: '08:00 PM',
    notes: 'Evaluate wine cellar stocking and purchase age verification.',
    status: 'ready',
    routeId: 'B',
    coordinates: BAKERSFIELD_COORDINATES['BevMo 10650 Stockdale Hwy #500']
  }
];

export default function App({ debugCenterOpen, onCloseDebugCenter, onOpenDebugCenter }: { debugCenterOpen?: boolean; onCloseDebugCenter?: () => void; onOpenDebugCenter?: () => void } = {}) {
  const { signOut, user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [startAddress, setStartAddress] = useState('1951 Golden State Ave');
  const [startCoord, setStartCoord] = useState<Coordinates>({ lat: 35.3904, lng: -119.0255 });
  const [ebikeConfig, setEbikeConfig] = useState<EbikeConfig>(DEFAULT_EBIKE_CONFIG);
  const [currentBattery, setCurrentBattery] = useState<number>(100);
  const [assistLevel, setAssistLevel] = useState<number>(3);
  const [riderWeight, setRiderWeight] = useState<number>(175);
  const [cargoWeight, setCargoWeight] = useState<number>(15);
  const [weatherWind, setWeatherWind] = useState<string>('none');
  const [terrain, setTerrain] = useState<string>('flat');
  const [travelMode, setTravelMode] = useState<TravelMode>(() => {
    return (safeStorage.getItem('travel_mode') as TravelMode) || 'bicycling';
  });
  const [learnedBatteryPercentPerMile, setLearnedBatteryPercentPerMile] = useState<number>(() => {
    return Number(safeStorage.getItem('battery_tracker_learned_percent_per_mile') || DEFAULT_EBIKE_CONFIG.batteryPercentPerMile);
  });

  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'all'>('A');
  const [currentTab, setCurrentTab] = useState<AppTab>(() => getTabFromHash() || 'dashboard');

  const [today, setToday] = useState<string>(() => todayString());
  const [selectedStripDate, setSelectedStripDate] = useState<string | null>(null);
  const [showScheduleReview, setShowScheduleReview] = useState<'overdue' | 'unscheduled' | null>(null);
  const [moveToDayJob, setMoveToDayJob] = useState<Job | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [proofVault, setProofVault] = useState<Record<string, ProofRecord>>(() => {
    try {
      const saved = safeStorage.getItem('proof_vault_records');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [selectedProofJobId, setSelectedProofJobId] = useState<string | null>(null);

  // Voice and Dispatcher Sync States
  const { isSpeaking, isLoadingAudio, speak, stop, errorMessage: ttsError } = useTextToSpeech();
  const defaultDispatcherMessage = "Good morning. Route A is ready. Start with the next stop and keep the day moving safely.";
  const [dispatcherMessage, setDispatcherMessage] = useState(defaultDispatcherMessage);
  const [completingJobIds, setCompletingJobIds] = useState<string[]>([]);

  // Bento Dashboard Expansion States
  const [bentoNextStopDetails, setBentoNextStopDetails] = useState(false);
  const [bentoNextStopCompleted, setBentoNextStopCompleted] = useState(false);
  const [bentoBatteryDetails, setBentoBatteryDetails] = useState(false);
  const [bentoRevisionDetails, setBentoRevisionDetails] = useState(false);

  // Simulation States
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedDistance, setSimulatedDistance] = useState(0);
  const [simulatedBattery, setSimulatedBattery] = useState(100);
  const [simulationStatus, setSimulationStatus] = useState<string>('');
  const [simulatedJobsCompleted, setSimulatedJobsCompleted] = useState<string[]>([]);
  const simTimerRef = useRef<number | null>(null);
  const mobileActivationRef = useRef({ key: '', time: 0 });

  // Real-time Optimization Alerts & explains
  const [lastOptimizationLog, setLastOptimizationLog] = useState<{
    why: string;
    minutesSaved: number;
    batteryDifference: number;
    earningsDifference: number;
    timestamp: string;
  } | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Refs for tracking changes
  const prevJobsRef = useRef<Job[]>([]);
  const prevMetricsRef = useRef<RouteMetrics | null>(null);
  
  // Modal configurations
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScreenshotImportOpen, setIsScreenshotImportOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scanJobId, setScanJobId] = useState<string | null>(null);
  const [isTestLabOpen, setIsTestLabOpen] = useState(false);
  const [routeFilter, setRouteFilter] = useState<RouteFilterType>('today');
  const [routeDetailJobId, setRouteDetailJobId] = useState<string | null>(null);
  const [previewGuideJobId, setPreviewGuideJobId] = useState<string | null>(null);
  const [inventoryJobId, setInventoryJobId] = useState<string | null>(null);
  const [inventoryDomain, setInventoryDomain] = useState<'merchandising' | 'contract_parts'>('merchandising');
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [defaultJobType, setDefaultJobType] = useState<JobType>('retail_audit');
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);

  // Day rollover: recompute the local date on focus/visibility and on a
  // foreground minute tick. Only derived filters change — no job data is
  // mutated, so an active ride is never silently re-sorted.
  useEffect(() => {
    const refresh = () => setToday((prev) => (prev === todayString() ? prev : todayString()));
    const id = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // Load from local storage
  useEffect(() => {
    const savedJobs = safeStorage.getItem('route_optimizer_jobs');
    const savedStart = safeStorage.getItem('route_optimizer_start');
    const savedConfig = safeStorage.getItem('route_optimizer_config');
    const savedTheme = safeStorage.getItem('route_optimizer_theme');

    const savedBattery = safeStorage.getItem('ebike_current_battery');
    const savedAssist = safeStorage.getItem('ebike_assist_level');
    const savedRiderWeight = safeStorage.getItem('ebike_rider_weight');
    const savedCargoWeight = safeStorage.getItem('ebike_cargo_weight');
    const savedWeather = safeStorage.getItem('ebike_weather_wind');
    const savedTerrain = safeStorage.getItem('ebike_terrain');

    if (savedBattery) setCurrentBattery(Number(savedBattery));
    if (savedAssist) setAssistLevel(Number(savedAssist));
    if (savedRiderWeight) setRiderWeight(Number(savedRiderWeight));
    if (savedCargoWeight) setCargoWeight(Number(savedCargoWeight));
    if (savedWeather) setWeatherWind(savedWeather);
    if (savedTerrain) setTerrain(savedTerrain);

    if (savedJobs) {
      try {
        const parsedJobs = JSON.parse(savedJobs);
        const rawJobs = Array.isArray(parsedJobs) && parsedJobs.length > 0
          ? parsedJobs
          : SEED_JOBS;
        let legacyMovedIds: string[] = [];
        try {
          const moved = safeStorage.getItem('jobs_moved_to_tomorrow');
          if (moved) {
            const parsed = JSON.parse(moved);
            if (Array.isArray(parsed)) legacyMovedIds = parsed;
          }
        } catch {
          // Legacy list unreadable — fall through with no migration targets.
        }
        const migrated = migrateJobSchedules(rawJobs, legacyMovedIds, today);
        setJobs(migrated.jobs);
        safeStorage.setItem('route_optimizer_jobs', JSON.stringify(migrated.jobs));
        safeStorage.setItem('route_optimizer_jobs_schema_version', JOB_STATE_SCHEMA_VERSION);
        if (migrated.changed) {
          safeStorage.removeItem('jobs_moved_to_tomorrow');
        }
      } catch (e) {
        const seededJobs = normalizeJobsForStorage(SEED_JOBS);
        setJobs(seededJobs);
        safeStorage.setItem('route_optimizer_jobs', JSON.stringify(seededJobs));
        safeStorage.setItem('route_optimizer_jobs_schema_version', JOB_STATE_SCHEMA_VERSION);
      }
    } else {
      const seededJobs = normalizeJobsForStorage(SEED_JOBS);
      setJobs(seededJobs);
      safeStorage.setItem('route_optimizer_jobs', JSON.stringify(seededJobs));
      safeStorage.setItem('route_optimizer_jobs_schema_version', JOB_STATE_SCHEMA_VERSION);
    }

    if (savedStart) {
      setStartAddress(savedStart);
      setStartCoord(resolveCoordinates(savedStart));
    }

    if (savedConfig) {
      try {
        setEbikeConfig(JSON.parse(savedConfig));
      } catch (e) {}
    }

    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!addMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-add-menu]')) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addMenuOpen]);

  const handleTabChange = (tab: AppTab) => {
    setCurrentTab(tab);
    if (typeof window === 'undefined') return;

    window.history.replaceState(null, '', `#${tab}`);
    window.setTimeout(() => {
      document.getElementById(`tab-view-${tab}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 0);
  };

  const activateTabFromTap = (tab: AppTab, event?: React.SyntheticEvent<HTMLElement>) => {
    event?.preventDefault();
    event?.stopPropagation();

    const nowMs = Date.now();
    const key = `tab:${tab}`;
    if (mobileActivationRef.current.key === key && nowMs - mobileActivationRef.current.time < 350) {
      return;
    }

    mobileActivationRef.current = { key, time: nowMs };
    handleTabChange(tab);
  };

  useEffect(() => {
    redirectRetiredRouteDestination();

    const handleHashChange = () => {
      const tab = getTabFromHash();
      if (tab) {
        setCurrentTab(tab);
        window.setTimeout(() => {
          document.getElementById(`tab-view-${tab}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 0);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Synchronize Operations dashboard message with the latest assistant message
  useEffect(() => {
    try {
      const saved = safeStorage.getItem('dispatcher_chat_messages');
      if (saved) {
        const msgs = JSON.parse(saved);
        const assistantMsgs = msgs.filter((m: any) => m.sender === 'assistant');
        if (assistantMsgs.length > 0) {
          const latestAssistantText = assistantMsgs[assistantMsgs.length - 1].text;
          setDispatcherMessage(latestAssistantText.includes('highly optimized') || latestAssistantText.toLowerCase().includes('battery') ? defaultDispatcherMessage : latestAssistantText);
        }
      }
    } catch (err) {
      console.error('Error loading latest dispatcher message:', err);
    }
  }, [currentTab]);

  // Persist e-bike battery settings
  useEffect(() => {
    safeStorage.setItem('ebike_current_battery', currentBattery.toString());
    safeStorage.setItem('ebike_assist_level', assistLevel.toString());
    safeStorage.setItem('ebike_rider_weight', riderWeight.toString());
    safeStorage.setItem('ebike_cargo_weight', cargoWeight.toString());
    safeStorage.setItem('ebike_weather_wind', weatherWind);
    safeStorage.setItem('ebike_terrain', terrain);
    safeStorage.setItem('travel_mode', travelMode);
  }, [currentBattery, assistLevel, riderWeight, cargoWeight, weatherWind, terrain]);

  useEffect(() => {
    safeStorage.setItem('proof_vault_records', JSON.stringify(proofVault));
  }, [proofVault]);

  // Computed metrics & analysis
  const routeAJobs = jobs.filter(j => j.routeId === 'A');
  const routeBJobs = jobs.filter(j => j.routeId === 'B');

  // Scheduling derivations (local day in America/Los_Angeles).
  const tomorrow = addDays(today, 1);
  // Today's Route pool: Route A jobs whose effective day is today — includes
  // actionable jobs plus under-review jobs (reviewable, but never the next
  // stop). Postponed jobs are intentionally excluded and surface through the
  // unscheduled review list.
  const todayRouteJobs = jobs.filter(j => j.routeId === 'A' && effectiveDay(j, today) === today);
  const executableRouteJobs = todayRouteJobs.filter(isActionableJob);
  const tomorrowJobs = jobs.filter(j => effectiveDay(j, today) === tomorrow);
  const overdueJobs = jobs.filter(j => isOverdue(j, today));
  const unscheduledJobs = jobs.filter(j => effectiveDay(j, today) === null && !isJobCompleted(j) && !isJobFinished(j));
  const weeklyDays = groupJobsByDay(jobs, today);
  const todayDay = weeklyDays[0];
  const selectedDay = selectedStripDate ? weeklyDays.find(day => day.date === selectedStripDate) || null : null;

  useEffect(() => {
    jobs
      .filter(isJobCompleted)
      .forEach(job => {
        if (!proofVault[job.id]) createProofFolder(job);
      });
  }, [jobs]);

  const getCombinedBatteryFactor = () => {
    let assistFactor = 1.0;
    if (assistLevel === 1) assistFactor = 0.55;
    else if (assistLevel === 2) assistFactor = 0.75;
    else if (assistLevel === 3) assistFactor = 1.0;
    else if (assistLevel === 4) assistFactor = 1.25;
    else if (assistLevel === 5) assistFactor = 1.55;

    const weightFactor = (riderWeight + cargoWeight) / 190;

    let windFactor = 1.0;
    if (weatherWind === 'headwind_light') windFactor = 1.15;
    else if (weatherWind === 'headwind_strong') windFactor = 1.35;
    else if (weatherWind === 'tailwind') windFactor = 0.90;

    let terrainFactor = 1.0;
    if (terrain === 'rolling') terrainFactor = 1.15;
    else if (terrain === 'hilly') terrainFactor = 1.35;

    return assistFactor * weightFactor * windFactor * terrainFactor;
  };

  const batteryFactor = getCombinedBatteryFactor();

  const tracker = useRideTracker(ebikeConfig, learnedBatteryPercentPerMile, batteryFactor);

  // Metrics are computed based on current order of elements in jobs state.
  // When users click "Optimize Route", they get sequential nearest neighbor, yielding better metrics.
  const baseStandardMetrics = calculateRouteMetrics(startCoord, routeAJobs, ebikeConfig);
  const standardMetrics = {
    ...baseStandardMetrics,
    estimatedBatteryUsage: parseFloat((baseStandardMetrics.estimatedBatteryUsage * batteryFactor).toFixed(1))
  };
  

  const activeMetrics = standardMetrics;


  const outliersReport = detectOutliers(startCoord, routeAJobs, ebikeConfig);
  const outlierIds = outliersReport.map(r => r.jobId);
  const projectedBatteryAfterRoute = Math.max(0, Math.round(currentBattery - activeMetrics.estimatedBatteryUsage));
  const usableRangeRemaining = Math.max(0, (projectedBatteryAfterRoute / 100) * ebikeConfig.maxRangeMiles);
  const reserveLabel = projectedBatteryAfterRoute >= 25 ? 'OK' : projectedBatteryAfterRoute >= 15 ? 'WATCH' : 'CHARGE';
  const reserveColorClass = projectedBatteryAfterRoute >= 25
    ? 'bg-emerald-500 text-white'
    : projectedBatteryAfterRoute >= 15
      ? 'bg-amber-400 text-slate-950'
      : 'bg-rose-600 text-white ';
  const eb5SpecLine = 'Jasion EB5 Standard | 350W | 36V 10Ah | 20 mph cap | PAS 1-5';
  const isJobDone = isJobCompleted;
  const getStreetName = (address: string) => {
    const trimmed = address.trim();
    const streetMatch = trimmed.match(/\d+\s+(.+)/);
    return (streetMatch?.[1] || trimmed).replace(/,\s*Bakersfield.*$/i, '');
  };
  const isProcessServeJob = (job: Job) => job.jobType === 'process_serve';
  const getJobTypeLabel = (job: Job) => {
    if (job.jobType === 'process_serve') return 'Process Serve';
    return job.jobType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  const getRouteBadgeClasses = (job: Job) => {
    if (isRevisionJob(job)) {
      return 'bg-rose-600 text-white dark:bg-rose-500 dark:text-white';
    }
    if (isProcessServeJob(job)) {
      return 'bg-red-600 text-white dark:bg-red-500 dark:text-white';
    }
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
  };
  const getRouteBadgeLabel = (job: Job) => {
    if (isRevisionJob(job)) return 'Revision';
    if (isProcessServeJob(job)) return 'Serve';
    return 'Ready';
  };
  const completedRouteAJobs = routeAJobs.filter(isJobDone);
  const remainingRouteAJobs = todayRouteJobs;
  const activeRouteAJobs = executableRouteJobs;
  const nextRouteAJob = activeRouteAJobs[0] || null;
  const liveEarnedToday = completedRouteAJobs.reduce((sum, job) => sum + job.pay, 0);
  const allRouteAJobsCompleted = routeAJobs.length > 0 && completedRouteAJobs.length === routeAJobs.length;
  const showLiveEarnings = (tracker.isWorkSessionActive || completedRouteAJobs.length > 0) && !allRouteAJobsCompleted;
  const earningsTileAmount = showLiveEarnings ? liveEarnedToday : activeMetrics.totalPay;
  const earningsTileTitle = showLiveEarnings ? 'Earned Today' : 'Estimated Earnings Today';
  const earningsTileSubtext = showLiveEarnings
    ? `${completedRouteAJobs.length} of ${routeAJobs.length} jobs paid`
    : 'Projected Route Pay';
  const earningsTileFooter = showLiveEarnings
    ? `$${Math.max(0, activeMetrics.totalPay - liveEarnedToday).toFixed(2)} still on route`
    : `$${activeMetrics.earningsPerHour.toFixed(2)}/h expected`;

  // Filter counts
  const routeFilterCounts = {
    today: todayRouteJobs.filter(j => j.status !== 'finished' && j.status !== 'completed').length,
    under_review: todayRouteJobs.filter(j => j.status === 'under_review').length,
    revisions: todayRouteJobs.filter(j => j.status === 'revisit').length,
    finished: routeAJobs.filter(j => j.status === 'finished' || j.status === 'completed').length,
  };

  const filteredRouteJobs = filterJobsByType(todayRouteJobs, routeFilter);

  const transitOrigin = { latitude: startCoord.lat, longitude: startCoord.lng };
  const transitDest = nextRouteAJob ? { latitude: nextRouteAJob.coordinates.lat, longitude: nextRouteAJob.coordinates.lng } : null;
  const transit = useTransitTrip(transitOrigin, transitDest, nextRouteAJob || undefined);

  // Auto-fetch transit trip when Bus Mode is on and destination changes
  useEffect(() => {
    if (travelMode === 'transit' && transitDest) {
      transit.fetchTrip(transitOrigin, transitDest, nextRouteAJob || undefined);
    }
  }, [travelMode, transitDest?.latitude, transitDest?.longitude, nextRouteAJob?.id]);

  // Save changes to local storage
  const saveJobsToStorage = (updatedJobs: Job[]) => {
    const normalizedJobs = normalizeJobsForStorage(updatedJobs);
    const routeAJobs = normalizedJobs.filter(j => j.routeId === 'A' && j.status !== 'finished');
    // Only today's executable work joins the optimized route order;
    // future-dated Route A jobs keep their relative position and never enter
    // today's sequence.
    const todayPool = routeAJobs.filter(j => effectiveDay(j, today) === today && isActionableJob(j));
    const futurePool = routeAJobs.filter(j => effectiveDay(j, today) !== today);
    const finishedRouteAJobs = normalizedJobs.filter(j => j.routeId === 'A' && j.status === 'finished');
    const restJobs = normalizedJobs.filter(j => j.routeId !== 'A');
    
    // Automatically apply Smart Revision Merge & Continuous Route Optimization (exclude finished)
    const optimizedRouteA = optimizeRouteWithSmartMerge(startCoord, todayPool, ebikeConfig);
    const finalized = normalizeJobsForStorage([...optimizedRouteA, ...futurePool, ...finishedRouteAJobs, ...restJobs]);

    setJobs(finalized);
    safeStorage.setItem('route_optimizer_jobs', JSON.stringify(finalized));
    safeStorage.setItem('route_optimizer_jobs_schema_version', JOB_STATE_SCHEMA_VERSION);
  };

  // Continuous Route Optimization & Explanations Monitor
  useEffect(() => {
    if (jobs.length === 0) {
      prevJobsRef.current = jobs;
      prevMetricsRef.current = activeMetrics;
      return;
    }

    if (prevJobsRef.current.length === 0) {
      prevJobsRef.current = jobs;
      prevMetricsRef.current = activeMetrics;
      return;
    }

    const prevRouteA = prevJobsRef.current.filter(j => j.routeId === 'A');
    const currRouteA = jobs.filter(j => j.routeId === 'A');

    const prevIds = prevRouteA.map(j => `${j.id}-${j.status}-${j.routeId}`).join(',');
    const currIds = currRouteA.map(j => `${j.id}-${j.status}-${j.routeId}`).join(',');

    if (prevIds === currIds) {
      return;
    }

    let why = "Continuous Route Optimization executed.";
    const addedJob = currRouteA.find(j => !prevRouteA.some(p => p.id === j.id));
    const removedJob = prevRouteA.find(p => !currRouteA.some(j => j.id === p.id));
    const completedJob = currRouteA.find(j => isJobCompleted(j) && prevRouteA.some(p => p.id === j.id && !isJobCompleted(p)));
    const uncompletedJob = currRouteA.find(j => !isJobCompleted(j) && prevRouteA.some(p => p.id === j.id && isJobCompleted(p)));
    const movedRevision = currRouteA.find(j => {
      const isRevision = isRevisionJob(j);
      if (!isRevision) return false;
      const prevIndex = prevRouteA.findIndex(p => p.id === j.id);
      const currIndex = currRouteA.findIndex(c => c.id === j.id);
      return prevIndex !== -1 && currIndex !== -1 && prevIndex !== currIndex;
    });

    if (addedJob) {
      if (isRevisionJob(addedJob)) {
        why = addedJob.smartMergeExplanation || `Required revision at '${addedJob.storeName}' was added. Smart Revision Merge automatically slotted it into the optimal position.`;
      } else {
        why = `New stop '${addedJob.storeName}' registered. Sequenced into the most efficient slot.`;
      }
    } else if (removedJob) {
      why = `Stop '${removedJob.storeName}' removed from Route A. Sequence recalculated to eliminate empty miles.`;
    } else if (completedJob) {
      if (isRevisionJob(completedJob)) {
        why = `Revision stop at '${completedJob.storeName}' marked completed. Sequence condensed.`;
      } else {
        why = `Stop '${completedJob.storeName}' marked completed. Active route updated.`;
      }
    } else if (uncompletedJob) {
      why = `Stop '${uncompletedJob.storeName}' marked pending. Route re-optimized.`;
    } else if (movedRevision) {
      why = movedRevision.smartMergeExplanation || `Revision '${movedRevision.storeName}' moved into the lowest-impact slot in today's route.`;
    } else {
      const editedJob = currRouteA.find(j => {
        const prev = prevRouteA.find(p => p.id === j.id);
        return prev && (prev.address !== j.address || prev.pay !== j.pay || prev.estimatedMinutes !== j.estimatedMinutes);
      });
      if (editedJob) {
        why = `Details for stop '${editedJob.storeName}' were edited. Re-evaluated route efficiency.`;
      } else {
        const movedToB = prevRouteA.find(p => !currRouteA.some(j => j.id === p.id) && jobs.some(j => j.id === p.id && j.routeId === 'B'));
        if (movedToB) {
          why = `Outlier stop '${movedToB.storeName}' shifted to standby Route B. Route A recalculated.`;
        } else {
          why = `Route A sequence modified. Re-optimized to protect hourly yield.`;
        }
      }
    }

    const prevMetrics = prevMetricsRef.current || standardMetrics;
    const newMetrics = standardMetrics;

    const rideTimeDiff = Math.round(prevMetrics.totalRideTime - newMetrics.totalRideTime);
    const batteryDiff = parseFloat((prevMetrics.estimatedBatteryUsage - newMetrics.estimatedBatteryUsage).toFixed(1));
    const earningsDiff = parseFloat((newMetrics.earningsPerHour - prevMetrics.earningsPerHour).toFixed(2));

    setIsOptimizing(true);
    const timer = setTimeout(() => {
      setIsOptimizing(false);
    }, 1200);

    setLastOptimizationLog({
      why,
      minutesSaved: rideTimeDiff,
      batteryDifference: batteryDiff,
      earningsDifference: earningsDiff,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });

    prevJobsRef.current = jobs;
    prevMetricsRef.current = activeMetrics;

    return () => clearTimeout(timer);
  }, [jobs, activeMetrics, startCoord, ebikeConfig]);

  const handleUpdateStart = (newAddr: string) => {
    setStartAddress(newAddr);
    const resolved = resolveCoordinates(newAddr);
    setStartCoord(resolved);
    safeStorage.setItem('route_optimizer_start', newAddr);
  };

  const handleSaveConfig = (updated: EbikeConfig) => {
    setEbikeConfig(updated);
    safeStorage.setItem('route_optimizer_config', JSON.stringify(updated));
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    safeStorage.setItem('route_optimizer_theme', nextTheme);
  };

  // Ride simulation controls
  const handleStartSimulation = () => {
    if (routeAJobs.length === 0) {
      alert("No active jobs on Route A to simulate!");
      return;
    }
    
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
    }
    
    setIsSimulating(true);
    setSimulatedDistance(0);
    setSimulatedBattery(currentBattery);
    setSimulatedJobsCompleted([]);
    setSimulationStatus("Departing 1951 Golden State Ave Hub...");
    
    let currentPos = startCoord;
    const segments: { name: string; distance: number; jobId?: string }[] = [];
    
    for (const job of routeAJobs) {
      const dist = getDistanceInMiles(currentPos, job.coordinates);
      segments.push({
        name: `${job.storeName} at ${job.address.split(' ').slice(2).join(' ') || job.address}`,
        distance: dist,
        jobId: job.id
      });
      currentPos = job.coordinates;
    }
    
    const returnDist = getDistanceInMiles(currentPos, startCoord);
    segments.push({
      name: "Returning to Bakersfield Hub",
      distance: returnDist
    });
    
    const totalDistToCover = activeMetrics.totalDistance;
    let distanceCovered = 0;
    
    const interval = window.setInterval(() => {
      const tickDist = 0.4;
      distanceCovered += tickDist;
      
      if (distanceCovered >= totalDistToCover) {
        setSimulatedDistance(totalDistToCover);
        const finalBattery = Math.max(0, currentBattery - (totalDistToCover * ebikeConfig.batteryPercentPerMile * batteryFactor));
        setSimulatedBattery(parseFloat(finalBattery.toFixed(1)));
        setSimulationStatus("Route Completed! Returned safely to the Golden State Ave Hub.");
        setIsSimulating(false);
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        return;
      }
      
      let tempCovered = distanceCovered;
      let activeSeg = segments[0];
      for (let i = 0; i < segments.length; i++) {
        if (tempCovered <= segments[i].distance) {
          activeSeg = segments[i];
          break;
        }
        tempCovered -= segments[i].distance;
      }
      
      const currentSegmentProgressPercent = Math.round((tempCovered / activeSeg.distance) * 100);
      
      const newlyCompleted: string[] = [];
      let accumulatedDist = 0;
      for (let i = 0; i < segments.length; i++) {
        accumulatedDist += segments[i].distance;
        if (distanceCovered >= accumulatedDist && segments[i].jobId) {
          newlyCompleted.push(segments[i].jobId!);
        }
      }
      setSimulatedJobsCompleted(newlyCompleted);
      
      const currentSimBattery = Math.max(0, currentBattery - (distanceCovered * ebikeConfig.batteryPercentPerMile * batteryFactor));
      
      setSimulatedDistance(parseFloat(distanceCovered.toFixed(1)));
      setSimulatedBattery(parseFloat(currentSimBattery.toFixed(1)));
      
      if (currentSimBattery <= 0) {
        setSimulationStatus(`Stranded! Battery depleted at ${parseFloat(distanceCovered.toFixed(1))} mi. Please recharge first.`);
        setIsSimulating(false);
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        return;
      }
      
      setSimulationStatus(`Riding to ${activeSeg.name}... ${currentSegmentProgressPercent}% complete.`);
    }, 300);
    
    simTimerRef.current = interval;
  };

  const handleStopSimulation = () => {
    setIsSimulating(false);
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  const createProofFolder = (job: Job) => {
    const now = new Date();
    const completionTime = now.toISOString();
    const arrivalTime = new Date(now.getTime() - (job.estimatedMinutes * 60 * 1000)).toISOString();
    const processServeProofNotes = job.jobType === 'process_serve' && job.processServe
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
      : job.notes || '';

    setProofVault(prev => {
      const existing = prev[job.id];
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
        notes: processServeProofNotes,
        createdAt: completionTime,
        updatedAt: completionTime
      };

      return {
        ...prev,
        [job.id]: {
          ...baseRecord,
          storeName: job.storeName,
          address: job.address,
          completionTime: existing?.completionTime || completionTime,
          arrivalTime: existing?.arrivalTime || arrivalTime,
          gps: job.coordinates,
          updatedAt: completionTime
        }
      };
    });
  };

  const handleAddProofAssets = (jobId: string, kind: ProofAssetKind, files: FileList | null) => {
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
  };

  const handleUpdateProofNotes = (jobId: string, notes: string) => {
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
  };

  // Job Actions
  const handleUpdateJobStatus = (id: string, updates: Partial<Job>) => {
    if ((updates.status === 'completed' || updates.status === 'under_review' || updates.status === 'finished' || updates.isCompleted === true) && blockJobAccess('job status changes')) {
      return;
    }
    const targetJob = jobs.find(job => job.id === id);
    const updated = jobs.map(job => {
      if (job.id !== id) return job;
      let patched = { ...job, ...updates };
      if (updates.status && updates.status !== job.status) {
        patched = recordStatusTransition(patched, updates.status);
      }
      return normalizeJobState(patched);
    });
    const updatedTarget = updated.find(job => job.id === id);
    if (targetJob && updatedTarget && isJobCompleted(updatedTarget) && !isJobCompleted(targetJob)) {
      createProofFolder(updatedTarget);
      setDispatcherMessage(buildCompletionReadback(updatedTarget, updated));
    }
    if (targetJob && updatedTarget && updatedTarget.status === 'finished' && targetJob.status !== 'finished') {
      setDispatcherMessage(`${updatedTarget.storeName} finished and removed from active route.`);
    }
    saveJobsToStorage(updated);
  };

  const handleMarkUnderReview = (id: string) => {
    if (blockJobAccess('job review')) return;
    handleUpdateJobStatus(id, {
      status: 'under_review',
      isCompleted: false,
      isRevisionRequired: false,
      revisionStatus: 'Under Review'
    });
    const targetJob = jobs.find(job => job.id === id);
    if (targetJob) {
      setDispatcherMessage(`${targetJob.storeName} marked under review. Press Complete once the review clears and the check is confirmed.`);
    }
  };

  const buildCompletionReadback = (completedJob: Job, updatedJobs: Job[]) => {
    const updatedRouteA = updatedJobs.filter(job => job.routeId === 'A');
    const optimizedRoute = optimizeRouteWithSmartMerge(startCoord, updatedRouteA, ebikeConfig);
    const pendingRoute = optimizedRoute.filter(job => !isJobCompleted(job));
    const nextStop = pendingRoute[0] || null;

    if (!nextStop) {
      return [
        'Great job.',
        '',
        'Route complete.',
        '',
        'Jobs remaining: 0'
      ].join('\n');
    }

    const rideDistance = getDistanceInMiles(completedJob.coordinates, nextStop.coordinates);
    const rideMinutes = Math.max(1, Math.round((rideDistance / ebikeConfig.avgSpeedMph) * 60));

    return [
      'Great job.',
      '',
      'Next stop:',
      `${nextStop.storeName}.`,
      '',
      `${rideMinutes} minute ride.`
    ].join('\n');
  };

  const handleToggleComplete = (id: string) => {
    if (blockJobAccess('job completion')) return;
    const targetJob = jobs.find(job => job.id === id);
    if (!targetJob) return;

    const updated = jobs.map(job =>
      job.id === id
        ? normalizeJobState({
            ...job,
            status: isJobCompleted(job) ? 'ready' : 'completed',
            isCompleted: !isJobCompleted(job),
            revisionStatus: isJobCompleted(job) ? undefined : 'Approved'
          })
        : job
    );

    if (!isJobCompleted(targetJob)) {
      setCompletingJobIds(prev => prev.includes(id) ? prev : [...prev, id]);
      createProofFolder(targetJob);
      setDispatcherMessage(buildCompletionReadback(targetJob, updated));
      if (tracker.rideModeActive) {
        tracker.trackJobCompletion(id, targetJob.estimatedMinutes);
      }

      window.setTimeout(() => {
        saveJobsToStorage(updated);
        setCompletingJobIds(prev => prev.filter(jobId => jobId !== id));
      }, 520);

      return;
    }

    saveJobsToStorage(updated);
  };

  const handleToggleRoute = (id: string) => {
    const updated = jobs.map(job =>
      job.id === id ? { ...job, routeId: (job.routeId === 'A' ? 'B' : 'A') as 'A' | 'B' } : job
    );
    saveJobsToStorage(updated);
  };

  const handleDeleteJob = (id: string) => {
    const updated = jobs.filter(job => job.id !== id);
    saveJobsToStorage(updated);
  };

  const handleSaveJobModal = (jobData: Omit<Job, 'id'> & { id?: string }) => {
    if (jobData.id) {
      // Edit
      const updated = jobs.map(job =>
        job.id === jobData.id ? { ...job, ...jobData } : job
      ) as Job[];
      saveJobsToStorage(updated);
    } else {
      // Add
      const newJob: Job = {
        ...jobData,
        id: `job-${Date.now()}`
      };
      saveJobsToStorage([...jobs, newJob]);
    }
  };

  const handleImportJobs = (newJobsData: Omit<Job, 'id'>[]) => {
    const newJobs: Job[] = newJobsData.map((jd, index) => ({
      ...jd,
      id: `job-imported-${Date.now()}-${index}`
    }));
    saveJobsToStorage([...jobs, ...newJobs]);
  };

  const handleDuplicateJob = (job: Job) => {
    const duplicate: Job = {
      ...job,
      id: `job-${Date.now()}`,
      storeName: `${job.storeName} (Copy)`,
      status: 'ready',
      isCompleted: false,
      isRevisionRequired: false
    };
    saveJobsToStorage([...jobs, duplicate]);
  };

  // Re-order Route A using nearest-neighbor greedy routing from home
  const handleOptimizeRouteSequence = () => {
    const routeAJobs = jobs.filter(j => j.routeId === 'A');
    const restJobs = jobs.filter(j => j.routeId !== 'A');
    const todayPool = routeAJobs.filter(j => effectiveDay(j, today) === today && isActionableJob(j));
    const futurePool = routeAJobs.filter(j => effectiveDay(j, today) !== today);
    const optimized = optimizeRouteWithSmartMerge(startCoord, todayPool, ebikeConfig);
    saveJobsToStorage([...optimized, ...futurePool, ...restJobs]);
  };

  const handleResetSeeds = () => {
    saveJobsToStorage(SEED_JOBS);
    setStartAddress('1951 Golden State Ave');
    setStartCoord({ lat: 35.3904, lng: -119.0255 });
    safeStorage.removeItem('route_optimizer_start');
  };

  const handleOpenAddModal = () => {
    setEditingJob(null);
    setDefaultJobType('retail_audit');
    setIsModalOpen(true);
  };

  const handleOpenProofHistory = () => {
    const records = Object.values(proofVault);
    if (records.length > 0) {
      const sorted = [...records].sort(
        (a, b) => new Date(b.completionTime).getTime() - new Date(a.completionTime).getTime()
      );
      setSelectedProofJobId(sorted[0].jobId);
    }
  };

  const handleOpenProcessServeModal = () => {
    setEditingJob(null);
    setDefaultJobType('process_serve');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (job: Job) => {
    setEditingJob(job);
    setDefaultJobType(job.jobType);
    setIsModalOpen(true);
  };

  // Quick helper to move an outlier immediately to Route B
  const handleQuickMoveToB = (id: string) => {
    const updated = jobs.map(job =>
      job.id === id ? { ...job, routeId: 'B' as const } : job
    );
    saveJobsToStorage(updated);
  };

  const handleMoveJobRoute = (id: string, routeId: 'A' | 'B') => {
    const updated = jobs.map(job =>
      job.id === id ? { ...job, routeId } : job
    );
    saveJobsToStorage(updated);
  };

  /**
   * Moves a job to a scheduled day. Future days put the job on standby
   * (Route B); today pulls it into the active route and re-optimizes. The
   * single job record is updated in place — id unchanged, so the job never
   * duplicates and proof/inventory/notes/status history are preserved.
   */
  const handleMoveJobToDate = (id: string, date: string | null) => {
    const target = jobs.find(j => j.id === id);
    if (!target) return;
    if (date !== null && !isValidScheduledDate(date)) return;
    const isToday = date === today;
    const updated = jobs.map(job =>
      job.id === id
        ? {
            ...job,
            scheduledDate: date ?? undefined,
            routeId: date === null ? job.routeId : isToday ? ('A' as const) : ('B' as const),
          }
        : job
    );
    saveJobsToStorage(updated);
    setMoveToDayJob(null);
    if (date) setSelectedStripDate(date);
  };

  const handleMoveUnfinishedToTomorrow = () => {
    const unfinishedRouteAJobs = jobs.filter(
      j => j.routeId === 'A' && !isJobCompleted(j) && effectiveDay(j, today) === today
    );
    const updatedJobs = jobs.map(j => {
      if (unfinishedRouteAJobs.some(u => u.id === j.id)) {
        return { ...j, scheduledDate: tomorrow, routeId: 'B' as const };
      }
      if (j.routeId === 'A' && isJobCompleted(j)) {
        return { ...j, routeId: 'B' as const };
      }
      return j;
    });

    saveJobsToStorage(updatedJobs);
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getDateKey = (date: Date) => {
    return getLocalDateKey(date);
  };

  const now = new Date(nowTick);
  const todayKey = getDateKey(now);
  const habits = useHabits(todayKey);
  const showerGate = useShowerGate(now);
  const showerHabitLogs = habits.habitLogs.filter(log => log.taskId === SHOWER_HABIT_TASK_ID || log.taskName === SHOWER_HABIT_NAME);
  const showerHabitLoggedForCycle = showerHabitLogs.some(log => log.date === showerGate.showerCycleKey);

  const blockJobAccess = (action: string) => {
    if (showerGate.showerGateAccessReady) return false;
    setCurrentTab('dashboard');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '#dashboard');
    }
    setDispatcherMessage(`Shower proof required before ${action}. Verify today's shower in Mission Control to unlock jobs.`);
    return true;
  };

  const handleConfirmDailyShower = async () => {
    const result = await showerGate.confirmShower();
    if (!result.success) {
      setDispatcherMessage(result.error!);
      return;
    }

    const { proof } = result;
    const confirmedAt = proof.confirmedAt || new Date().toISOString();

    habits.addHabitTask({
      id: SHOWER_HABIT_TASK_ID,
      name: SHOWER_HABIT_NAME,
      targetMinutes: 1,
      lastMinutes: 1,
      createdAt: confirmedAt
    });

    habits.addHabitLog({
      id: `habit-shower-${showerGate.showerCycleKey}-${Date.now()}`,
      taskId: SHOWER_HABIT_TASK_ID,
      taskName: SHOWER_HABIT_NAME,
      minutes: 1,
      date: showerGate.showerCycleKey,
      note: `Proof confirmed: ${proof.proofName || 'attached proof'}. Product barcode verified.`,
      createdAt: confirmedAt
    });

    habits.setActiveHabitTaskId(SHOWER_HABIT_TASK_ID);
    setDispatcherMessage(`Shower confirmed. Jobs are unlocked for this daily cycle.${proof.backendFolderPath ? ` Backend folder: ${proof.backendFolderPath}` : ''}`);
  };

  const handleMissionControlShowerVerified = useCallback((record: ShowerProofRecord) => {
    const proof = showerGate.handleMissionControlVerified(record);
    if (!proof) return;

    const confirmedAt = proof.confirmedAt || new Date().toISOString();

    habits.addHabitTask({
      id: SHOWER_HABIT_TASK_ID,
      name: SHOWER_HABIT_NAME,
      targetMinutes: 1,
      lastMinutes: 1,
      createdAt: confirmedAt
    });

    habits.addHabitLog({
      id: `habit-shower-${showerGate.showerCycleKey}-${Date.now()}`,
      taskId: SHOWER_HABIT_TASK_ID,
      taskName: SHOWER_HABIT_NAME,
      minutes: 1,
      date: showerGate.showerCycleKey,
      note: 'Mission Control shower proof saved. Product barcode verified.',
      createdAt: confirmedAt
    });

    setDispatcherMessage('Shower verified in Mission Control. Jobs are unlocked for this daily cycle.');
  }, [showerGate.handleMissionControlVerified, showerGate.showerCycleKey, habits]);

  useEffect(() => {
    if (!showerGate.showerGateAccessReady && tracker.rideModeActive) {
      tracker.exitRideMode();
      setDispatcherMessage('Daily shower gate reset at 6:00 AM. Confirm shower proof before continuing jobs.');
    }
  }, [showerGate.showerGateAccessReady, tracker.rideModeActive]);

  const handleStartRideMode = () => {
    if (blockJobAccess('ride mode')) return;
    tracker.enterRideMode(new Date().toISOString(), currentBattery);
    setDispatcherMessage("Ride Mode active. Start with the next stop and keep the screen focused.");
  };

  const handleEndRideMode = () => {
    const distance = tracker.rideDistance;
    const batteryUsed = tracker.rideBatteryUsed;
    const observedBatteryUsed = Math.max(0, tracker.startBattery - currentBattery);
    const learningBatteryUsed = observedBatteryUsed > 0 ? observedBatteryUsed : batteryUsed;
    if (distance > 0 && learningBatteryUsed > 0) {
      const sampleRate = learningBatteryUsed / distance;
      const blendedRate = parseFloat(((learnedBatteryPercentPerMile * 0.75) + (sampleRate * 0.25)).toFixed(2));
      setLearnedBatteryPercentPerMile(blendedRate);
      safeStorage.setItem('battery_tracker_learned_percent_per_mile', blendedRate.toString());
    }
    const earned = completedRouteAJobs.reduce((sum, job) => sum + job.pay, 0);
    const elapsedHours = Math.max(tracker.totalDayTime / 3600, 0.01);
    const avgSpeed = tracker.rideTime > 0 ? parseFloat((distance / (tracker.rideTime / 3600)).toFixed(1)) : 0;
    const routeScore = Math.max(0, Math.min(100, Math.round(100 - (activeMetrics.totalDistance * 1.4) - Math.max(0, batteryUsed - 35))));
    const efficiencyScore = Math.max(0, Math.min(100, Math.round((earned / Math.max(activeMetrics.totalPay, 1)) * 55 + routeProgressPct * 0.45)));
    const endedAt = new Date().toISOString();
    const sessionLog = {
      id: `ride-${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      startedAt: tracker.rideStartedAt,
      endedAt,
      rideTime: tracker.rideTime,
      storeTime: tracker.storeTime,
      totalDayTime: tracker.totalDayTime,
      startBattery: tracker.startBattery,
      endBattery: Math.max(0, Math.round(tracker.startBattery - batteryUsed)),
      batteryUsed,
      jobsCompletedCount: completedRouteAJobs.length,
      completedJobNames: completedRouteAJobs.map(job => job.storeName),
      distance,
      estimatedEarnings: earned,
      earningsPerHour: parseFloat((earned / elapsedHours).toFixed(2)),
      avgRideSpeed: avgSpeed,
      routeScore,
      efficiencyScore,
      timeSaved: Math.max(0, lastOptimizationLog?.minutesSaved || 0),
      jobsMovedToTomorrow: tomorrowJobs.length,
      learnedRange: batteryUsed > 0 ? parseFloat(((distance / batteryUsed) * 100).toFixed(1)) : null
    };

    tracker.setRideSummary({
      totalRideTime: formatDuration(tracker.rideTime),
      totalStoreTime: formatDuration(tracker.storeTime),
      totalJobsCompleted: completedRouteAJobs.length,
      totalDistance: distance,
      estimatedBatteryUsed: batteryUsed,
      estimatedEarnings: earned,
      earningsPerHour: parseFloat((earned / elapsedHours).toFixed(2)),
      routeScore,
      efficiencyScore,
      timeSaved: Math.max(0, lastOptimizationLog?.minutesSaved || 0),
      jobsMovedToTomorrow: tomorrowJobs.length,
      avgRideSpeed: avgSpeed,
      stopsCompleted: completedRouteAJobs.length,
      startedAt: tracker.rideStartedAt,
      endedAt
    });
    tracker.addSession(sessionLog);
    tracker.exitRideMode();
    setDispatcherMessage("Ride ended. Summary generated. Planning Mode restored.");
    setCurrentTab('dashboard');
  };

  const handleStartTrackerRide = () => {
    tracker.startSession(currentBattery);
    safeStorage.removeItem('jobs_moved_to_tomorrow');
  };

  const handleTrackerArrivedAtStore = () => {
    tracker.setAtStore();
  };

  const handleTrackerResumeRide = () => {
    tracker.setRiding();
  };

  const handleTrackerEndDay = () => {
    const completedJobNames = routeAJobs
      .filter(job => tracker.jobsCompleted.includes(job.id) || isJobDone(job))
      .map(job => job.storeName);
    const estimatedEarnings = completedRouteAJobs.reduce((sum, job) => sum + job.pay, 0);
    tracker.finishTrackerDay({
      endBattery: currentBattery,
      completedJobNames,
      estimatedEarnings,
    });
  };

  const handleResetCurrentTrackerSession = () => {
    if (window.confirm('Are you sure you want to reset the current active tracking session? This will not clear saved history.')) {
      tracker.resetSession();
      setSelectedStripDate(null);
    }
  };

  const handleTrackerToggleJobComplete = (jobId: string) => {
    handleToggleComplete(jobId);
    tracker.toggleJobInSession(jobId);
  };

  const handleClearTrackerHistory = () => {
    if (window.confirm('Delete all tracked ride history?')) {
      tracker.clearHistory();
    }
  };

  // Stack to store state snapshots for "Undo" functionality
  const [historyStack, setHistoryStack] = useState<{ jobs: Job[]; battery: number }[]>([]);

  const handleEndDayFromDispatcher = () => {
    setCurrentTab('tracker');
    tracker.setCompleted();
  };

  const handleExecuteDispatcherAction = (action: DispatcherAction): string | null => {
    // Save current state snapshot before modifying
    setHistoryStack(prev => [...prev, { jobs: JSON.parse(JSON.stringify(jobs)), battery: currentBattery }]);

    switch (action.type) {
      case 'COMPLETE_JOB': {
        const target = action.jobTarget?.toLowerCase();
        if (!target) return 'No target specified for completion.';
        const matchedJob = jobs.find(j => 
          j.id === action.jobTarget || 
          j.storeName.toLowerCase().includes(target) || 
          j.address.toLowerCase().includes(target)
        );
        if (matchedJob) {
          if (isJobCompleted(matchedJob)) {
            handleUpdateJobStatus(matchedJob.id, { status: 'completed', isCompleted: true });
          } else {
            handleToggleComplete(matchedJob.id);
          }
          return `Successfully marked ${matchedJob.storeName} as completed.`;
        }
        return `Could not find job matching "${action.jobTarget}".`;
      }
      case 'ADD_JOB': {
        if (!action.jobData) return 'No job details provided for addition.';
        const storeName = action.jobData.storeName || "New Store Stop";
        const address = action.jobData.address || "Bakersfield, CA";
        const coordinates = action.jobData.coordinates || resolveCoordinates(address);
        
        const newJob: Job = {
          id: `job-${Date.now()}`,
          storeName,
          address,
          pay: action.jobData.pay || 15.00,
          estimatedMinutes: action.jobData.estimatedMinutes || 20,
          jobType: action.jobData.jobType || 'retail_audit',
          dueTime: action.jobData.dueTime || 'Flexible',
          notes: action.jobData.notes || '',
          status: 'ready',
          routeId: 'A',
          coordinates
        };
        saveJobsToStorage([...jobs, newJob]);
        return `Added new active stop at ${storeName}.`;
      }
      case 'EDIT_JOB': {
        const target = action.jobTarget?.toLowerCase();
        if (!target || !action.jobData) return 'Missing target or update details for editing.';
        const matchedIndex = jobs.findIndex(j => 
          j.id === action.jobTarget || 
          j.storeName.toLowerCase().includes(target)
        );
        if (matchedIndex !== -1) {
          const updated = [...jobs];
          updated[matchedIndex] = { ...updated[matchedIndex], ...action.jobData };
          saveJobsToStorage(updated);
          return `Successfully updated stop ${updated[matchedIndex].storeName}.`;
        }
        return `Could not find job matching "${action.jobTarget}".`;
      }
      case 'MOVE_TO_TOMORROW': {
        const target = action.jobTarget?.toLowerCase();
        if (!target) return 'No target specified to move to tomorrow.';
        const matchedJob = jobs.find(j => 
          j.id === action.jobTarget || 
          j.storeName.toLowerCase().includes(target)
        );
        if (matchedJob) {
          handleMoveJobToDate(matchedJob.id, tomorrow);
          return `Postponed ${matchedJob.storeName} to tomorrow's standby list.`;
        }
        return `Could not find job matching "${action.jobTarget}".`;
      }
      case 'MOVE_TO_ROUTE_B': {
        const target = action.jobTarget?.toLowerCase();
        if (!target) return 'No target specified for route shift.';
        const matchedJob = jobs.find(j => 
          j.id === action.jobTarget || 
          j.storeName.toLowerCase().includes(target)
        );
        if (matchedJob) {
          handleUpdateJobStatus(matchedJob.id, { routeId: 'B' });
          return `Shifted ${matchedJob.storeName} to Standby Route B.`;
        }
        return `Could not find job matching "${action.jobTarget}".`;
      }
      case 'UPDATE_BATTERY': {
        if (action.batteryValue !== undefined && !isNaN(action.batteryValue)) {
          const val = Math.max(0, Math.min(100, action.batteryValue));
          setCurrentBattery(val);
          safeStorage.setItem('ebike_current_battery', val.toString());
          return `Updated battery status to ${val}%.`;
        }
        return 'No battery percentage specified.';
      }
      case 'REOPTIMIZE_ROUTE': {
        handleOptimizeRouteSequence();
        return 'Re-optimized active Route A based on current priority sequence rules.';
      }
      case 'END_DAY_SUMMARY': {
        handleEndDayFromDispatcher();
        return 'Shifted active workspace to End of Day Summary. Ready to move remaining jobs!';
      }
      default:
        return null;
    }
  };

  const handleUndoLastAction = (): boolean => {
    if (historyStack.length === 0) return false;
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, -1));
    
    setJobs(previous.jobs);
    safeStorage.setItem('route_optimizer_jobs', JSON.stringify(previous.jobs));
    setCurrentBattery(previous.battery);
    safeStorage.setItem('ebike_current_battery', previous.battery.toString());
    return true;
  };

  const nextStopIndex = nextRouteAJob ? routeAJobs.findIndex(j => j.id === nextRouteAJob.id) : -1;
  const nextStopOrigin = nextStopIndex <= 0 ? startCoord : routeAJobs[nextStopIndex - 1].coordinates;
  const nextStopDistance = nextRouteAJob ? getDistanceInMiles(nextStopOrigin, nextRouteAJob.coordinates) : 0;
  const nextStopRideMinutes = nextRouteAJob ? Math.max(1, Math.round((nextStopDistance / ebikeConfig.avgSpeedMph) * 60)) : 0;
  const nextStopNavLink = nextRouteAJob
    ? `https://www.google.com/maps/dir/?api=1&origin=${nextStopOrigin.lat},${nextStopOrigin.lng}&destination=${nextRouteAJob.coordinates.lat},${nextRouteAJob.coordinates.lng}&travelmode=${travelMode}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(startAddress)}`;
  const revisionAlertJobs = remainingRouteAJobs.filter(isRevisionJob);
  const routeProgressPct = routeAJobs.length > 0 ? Math.round((completedRouteAJobs.length / routeAJobs.length) * 100) : 100;
  const routeListStops = remainingRouteAJobs;
  const proofRecords = (Object.values(proofVault) as ProofRecord[]).sort((a, b) => new Date(b.completionTime).getTime() - new Date(a.completionTime).getTime());
  const selectedProofRecord = selectedProofJobId ? proofVault[selectedProofJobId] : null;
  const routeDetailJob = routeDetailJobId ? jobs.find(job => job.id === routeDetailJobId) || null : null;
  const previewGuideJob = previewGuideJobId ? jobs.find(job => job.id === previewGuideJobId) || null : null;
  const inventoryJobs = jobs.filter(job => getInventoryDomain(job) === inventoryDomain);
  const inventoryJob = inventoryJobs.find(job => job.id === inventoryJobId) || inventoryJobs.find(job => job.routeId === 'A') || inventoryJobs[0] || null;
  const getRouteStopNavLink = (job: Job, idx: number) => {
    const origin = idx === 0
      ? startCoord
      : routeListStops[idx - 1]?.coordinates || startCoord;

    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${job.coordinates.lat},${job.coordinates.lng}&travelmode=${travelMode}`;
  };
  const dispatcherBrief = dispatcherMessage.length > 118 ? `${dispatcherMessage.slice(0, 115).trim()}...` : dispatcherMessage;
  const rideDistance = tracker.rideDistance;
  const rideBatteryUsed = tracker.rideBatteryUsed;
  const rideAverageSpeed = tracker.rideAverageSpeed;
  const rideEarned = completedRouteAJobs.reduce((sum, job) => sum + job.pay, 0);
  const rideEarningsPerHour = tracker.formatRideEarningsPerHour(rideEarned);
  const learnedBatteryRate = learnedBatteryPercentPerMile * batteryFactor;
  const batteryTrackerUsed = rideBatteryUsed;
  const batteryTrackerCurrent = Math.max(0, Math.round(currentBattery - batteryTrackerUsed));
  const estimatedMilesRemaining = learnedBatteryRate > 0 ? parseFloat((batteryTrackerCurrent / learnedBatteryRate).toFixed(1)) : 0;
  const routeMilesRemaining = Math.max(0, activeMetrics.totalDistance - rideDistance);
  const batteryRisk = batteryTrackerCurrent < 15 || estimatedMilesRemaining < routeMilesRemaining
    ? 'High'
    : batteryTrackerCurrent < 25 || estimatedMilesRemaining < routeMilesRemaining + 3
      ? 'Watch'
      : 'Low';
  const canFinishRoute = estimatedMilesRemaining >= routeMilesRemaining && batteryTrackerCurrent >= 15;
  const rechargeRecommended = batteryRisk === 'High' || !canFinishRoute;
  const batteryToneClass = projectedBatteryAfterRoute >= 25
    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
    : projectedBatteryAfterRoute >= 15
      ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'
      : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100';

  // AIØ Today screen derivation (reuses existing route/schedule logic — no fabricated scoring).
  const currentJob = todayRouteJobs.find(job => job.status === 'under_review') || null;
  const hasCurrentJob = Boolean(currentJob);
  const nextJob = hasCurrentJob ? null : nextRouteAJob;
  const previewGuideReadiness = getPreviewGuideReadiness(nextRouteAJob ? getPreviewGuide(nextRouteAJob.id) : null);
  const userName = user?.email?.split('@')[0] || undefined;
  const handleToggleJobProgress = (job: Job) => {
    if (job.status === 'under_review') handleToggleComplete(job.id);
    else handleMarkUnderReview(job.id);
  };
  const handleSpeakRoute = (job: Job | null) => {
    if (!job) return;
    if (isSpeaking) {
      stop();
      return;
    }
    const street = getStreetName(job.address);
    const minutes = job.id === nextRouteAJob?.id ? nextStopRideMinutes : Math.max(1, Math.round((getDistanceInMiles(nextStopOrigin, job.coordinates) / ebikeConfig.avgSpeedMph) * 60));
    const text = `Next stop ${job.storeName} at ${street}. Pay ${job.pay.toFixed(2)} dollars. ${minutes} minutes by bike.` +
      (job.dueTime ? ` Due by ${job.dueTime}.` : ' No fixed due time.');
    speak(text);
  };

  return (
    <AssistantProvider
      jobs={jobs}
      routeAJobs={routeAJobs}
      routeBJobs={routeBJobs}
      currentBattery={currentBattery}
      ebikeConfig={ebikeConfig}
      activeMetrics={activeMetrics}
      showerGateUnlocked={showerGate.showerGateUnlocked}
      currentTab={currentTab}
      theme={theme}
      weatherWind={weatherWind}
      terrain={terrain}
      dayEarnings={activeMetrics.totalPay}
      onNavigate={(tab) => handleTabChange(tab as AppTab)}
      onOpenProofHistory={handleOpenProofHistory}
      onOpenAddJob={handleOpenAddModal}
      onOptimizeRoute={handleOptimizeRouteSequence}
    >
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="ios-app app-shell min-h-screen bg-transparent text-slate-950 transition-colors duration-300 dark:text-slate-100 font-sans">
        <AmbientLiquidBackground />
        
        {/* Header */}
        {currentTab === 'dashboard' || currentTab === 'jobs' || currentTab === 'more'
          ? <AioHeader userName={userName} onOpenProfile={() => handleTabChange('more')} />
          : <Header theme={theme} onToggleTheme={handleToggleTheme} />}

        {/* Main Content Body */}
        <main className="app-main mx-auto max-w-7xl px-3 py-4 pb-40 sm:px-6 sm:py-6 lg:px-8 space-y-6">
          {currentTab === 'dashboard' && !tracker.rideModeActive && SHOWER_GATE_REQUIRED && !showerGate.showerGateUnlocked && (
            <ShowerGatePanel
              cycleId={showerGate.showerCycleKey}
              cycleLabel={showerGate.showerCycleLabel}
              completedProof={showerGate.missionControlShowerProofRecord}
              onVerifiedProof={handleMissionControlShowerVerified}
            />
          )}

          {/* Ride Mode V2: Distraction-free execution surface */}
          {currentTab === 'dashboard' && tracker.rideModeActive && (
            <RideModeSurface
              onEndRideMode={handleEndRideMode}
              nextRouteAJob={nextRouteAJob}
              completingJobIds={completingJobIds}
              nextStopNavLink={nextStopNavLink}
              onToggleComplete={handleToggleComplete}
              onMarkUnderReview={handleMarkUnderReview}
              routeListStops={routeListStops}
              getRouteBadgeClasses={getRouteBadgeClasses}
              getRouteBadgeLabel={getRouteBadgeLabel}
              getStreetName={getStreetName}
              formatDuration={formatDuration}
              trackerTotalDayTime={tracker.totalDayTime}
              trackerRideTime={tracker.rideTime}
              trackerStoreTime={tracker.storeTime}
              rideBatteryUsed={rideBatteryUsed}
              remainingRouteAJobs={remainingRouteAJobs}
              completedRouteAJobs={completedRouteAJobs}
              rideDistance={rideDistance}
              rideEarningsPerHour={rideEarningsPerHour}
              rideAverageSpeed={rideAverageSpeed}
              rideEarned={rideEarned}
              trackerJobsCompleted={tracker.jobsCompleted}
            />
          )}

          {/* Tab 1: AIØ Today Screen */}
          {currentTab === 'dashboard' && !tracker.rideModeActive && (
            <div className="animate-fade-in" id="tab-view-dashboard">
              <TodayScreen
                theme={theme}
                userName={userName}
                onToggleTheme={handleToggleTheme}
                onOpenMore={() => handleTabChange('more')}
                jobsTodayCount={todayRouteJobs.length}
                weatherWind={weatherWind}
                currentJob={currentJob}
                hasCurrentJob={hasCurrentJob}
                nextJob={nextJob}
                remainingJobs={todayRouteJobs.filter(job => !isJobCompleted(job) && !isJobFinished(job))}
                completedJobsCount={completedRouteAJobs.length}
                routeTotalJobs={routeAJobs.length}
                completingJobIds={completingJobIds}
                nextStopDistance={nextStopDistance}
                nextStopRideMinutes={nextStopRideMinutes}
                nextStopNavLink={nextStopNavLink}
                jobAccessLocked={!showerGate.showerGateAccessReady}
                onBlockJobAccess={() => blockJobAccess('navigation')}
                onToggleJobProgress={handleToggleJobProgress}
                onOpenJob={(job) => setRouteDetailJobId(job.id)}
                onStartRideMode={handleStartRideMode}
                actionableJob={nextRouteAJob}
                onOpenPreviewGuide={(job) => setPreviewGuideJobId(job.id)}
                transit={transit}
                transitOrigin={transitOrigin}
                onSpeakRoute={handleSpeakRoute}
                isSpeaking={isSpeaking}
                onOptimizeRoute={handleOptimizeRouteSequence}
                onAddJob={handleOpenAddModal}
                previewGuideReadiness={previewGuideReadiness}
                weeklyDays={weeklyDays}
                today={today}
                selectedStripDate={selectedStripDate}
                onSelectStripDate={setSelectedStripDate}
                overdueCount={overdueJobs.length}
                unscheduledCount={unscheduledJobs.length}
                onReviewOverdue={() => handleTabChange('jobs')}
                onReviewUnscheduled={() => handleTabChange('jobs')}
                startCoord={startCoord}
                avgSpeedMph={ebikeConfig.avgSpeedMph}
                onMoveToDay={setMoveToDayJob}
                onPlanThisDay={handleOptimizeRouteSequence}
                onMoveExisting={() => handleTabChange('jobs')}
                batteryPct={batteryTrackerCurrent}
                batteryMilesLeft={estimatedMilesRemaining}
                batteryRisk={batteryRisk}
                earningsAmount={earningsTileAmount}
                earningsTitle={earningsTileTitle}
                earningsFooter={earningsTileFooter}
                routeProgressPct={routeProgressPct}
                revisionAlerts={revisionAlertJobs}
              />
            </div>
          )}

          {/* Jobs Screen */}
          {currentTab === 'jobs' && (
            <div className="animate-fade-in">
              <JobsScreen
                today={today}
                todayJobs={todayRouteJobs}
                weekDays={weeklyDays}
                routeBJobs={routeBJobs}
                overdueJobs={overdueJobs}
                unscheduledJobs={unscheduledJobs}
                onOpenJob={(job) => setRouteDetailJobId(job.id)}
                onAddJob={handleOpenAddModal}
                onOptimizeRoute={handleOptimizeRouteSequence}
                onMoveToDay={setMoveToDayJob}
              />
            </div>
          )}

          {/* More Screen */}
          {currentTab === 'more' && (
            <div className="animate-fade-in">
              <MoreScreen
                theme={theme}
                onToggleTheme={handleToggleTheme}
                userEmail={user?.email}
                onNavigate={(tab) => handleTabChange(tab)}
                onOpenProofHistory={handleOpenProofHistory}
                onOpenDebugCenter={() => onOpenDebugCenter?.()}
                onAddProcessServe={handleOpenProcessServeModal}
                onImportScreenshots={() => setIsScreenshotImportOpen(true)}
                onSignOut={async () => {
                  if (window.confirm("Sign out of AIØ?")) await signOut();
                }}
              />
            </div>
          )}

          {/* Previous dashboard preserved but not rendered */}
          {false && currentTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in" id="tab-view-dashboard">

              {/* Bento Dashboard Layout Grid */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6" id="bento-dashboard-grid">
                
                {/* 1. Next Stop Card — primary field action */}
                <div id="bento-tile-next-stop" className="col-span-2 lg:col-span-2 road-card p-6 sm:p-7 flex flex-col justify-between space-y-5 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Navigation size={12} className="text-indigo-500 " />
                        <span>Next Stop Navigation</span>
                      </span>
                      {routeAJobs.find(j => !isJobDone(j)) && (
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">
                          Stop #{routeAJobs.indexOf(routeAJobs.find(j => !isJobDone(j))!) + 1} of {routeAJobs.length}
                        </span>
                      )}
                    </div>

                    {(() => {
                      const nextStop = routeAJobs.find(j => !isJobDone(j));
                      if (!nextStop) {
                        return (
                          <div className="py-8 text-center space-y-3">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30">
                              <CheckCircle2 size={28} />
                            </div>
                            <h4 className="font-extrabold text-slate-800 dark:text-white text-base">All Stops Completed!</h4>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">Great job. Return safely back to the Starting Hub.</p>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(startAddress)}`}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline cursor-pointer bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-lg"
                            >
                              <span>Navigate back to Hub</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        );
                      }

                      const nextStopIdx = routeAJobs.indexOf(nextStop);
                      const prevCoordForNextStop = nextStopIdx <= 0 ? startCoord : routeAJobs[nextStopIdx - 1].coordinates;
                      const nextStopDist = getDistanceInMiles(prevCoordForNextStop, nextStop.coordinates);
                      const nextStopRideMin = (nextStopDist / ebikeConfig.avgSpeedMph) * 60;
                      const nextStopNavLink = `https://www.google.com/maps/dir/?api=1&origin=${prevCoordForNextStop.lat},${prevCoordForNextStop.lng}&destination=${nextStop.coordinates.lat},${nextStop.coordinates.lng}&travelmode=${travelMode}`;

                      return (
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-black text-slate-900 dark:text-white text-3xl sm:text-4xl truncate tracking-tight">{nextStop.storeName}</h4>
                              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">${nextStop.pay.toFixed(2)}</span>
                            </div>
                            <p className="text-base font-bold text-slate-500 dark:text-slate-400 truncate mt-2">{nextStop.address}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-[18px] border border-slate-200/70 bg-[#F5F5F7] p-4 text-center dark:border-white/10 dark:bg-white/[0.06]">
                              <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">Distance</span>
                              <p className="mt-2 text-4xl font-black leading-none text-slate-950 dark:text-white">{nextStopDist.toFixed(1)}</p>
                              <span className="mt-1 block text-xs font-black uppercase text-slate-400">mi</span>
                            </div>
                            <div className="rounded-[18px] border border-slate-200/70 bg-[#F5F5F7] p-4 text-center dark:border-white/10 dark:bg-white/[0.06]">
                              <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">Travel</span>
                              <p className="mt-2 text-4xl font-black leading-none text-slate-950 dark:text-white">{nextStopRideMin.toFixed(0)}</p>
                              <span className="mt-1 block text-xs font-black uppercase text-slate-400">min</span>
                            </div>
                            <div className="rounded-[18px] border border-slate-200/70 bg-[#F5F5F7] p-4 text-center dark:border-white/10 dark:bg-white/[0.06]">
                              <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">Store</span>
                              <p className="mt-2 text-4xl font-black leading-none text-[#007AFF] dark:text-blue-400">{nextStop.estimatedMinutes}</p>
                              <span className="mt-1 block text-xs font-black uppercase text-slate-400">min</span>
                            </div>
                            <div className="rounded-[18px] border border-amber-200/80 bg-amber-50 p-4 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
                              <span className="block text-[10px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">Due</span>
                              <p className="mt-2 text-3xl font-black leading-none text-amber-500 sm:text-4xl">{nextStop.dueTime || 'Flex'}</p>
                              <span className="mt-1 block text-xs font-black uppercase text-amber-500/80">time</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {isRevisionJob(nextStop) && (
                              <span className="bg-rose-50 border border-rose-200/60 text-rose-600 dark:bg-rose-950/20 dark:border-rose-500/20 dark:text-rose-400 text-[9px] font-black uppercase px-2.5 py-1 rounded-md">
                                Revision Required
                              </span>
                            )}
                            {nextStop.dueTime && (
                              <span className="bg-amber-50 border border-amber-200/60 text-amber-600 dark:bg-amber-950/20 dark:border-amber-500/20 dark:text-amber-400 text-[9px] font-black uppercase px-2.5 py-1 rounded-md">
                                Deadline Priority
                              </span>
                            )}
                            {outlierIds.includes(nextStop.id) && (
                              <span className="bg-slate-50 border border-slate-200/60 text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 text-[9px] font-black uppercase px-2.5 py-1 rounded-md">
                                Outlier
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <a
                              href={nextStopNavLink}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="road-action-lg flex-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer"
                            >
                              <Compass size={14} />
                              <span>NAVIGATE NOW</span>
                              <ExternalLink size={12} />
                            </a>

                            <button
                              onClick={() => nextStop.status === 'under_review' ? handleToggleComplete(nextStop.id) : handleMarkUnderReview(nextStop.id)}
                              className={`flex-1 text-white flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-black transition-all shadow-md cursor-pointer ${
                                nextStop.status === 'under_review'
                                  ? 'bg-blue-700 hover:bg-blue-600'
                                  : 'bg-indigo-600 hover:bg-indigo-500'
                              }`}
                            >
                              {nextStop.status === 'under_review' ? <CheckSquare size={14} /> : <Hourglass size={14} />}
                              <span>{nextStop.status === 'under_review' ? 'COMPLETE JOB' : 'UNDER REVIEW'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {travelMode === 'transit' && nextRouteAJob && (
                  <div className="col-span-2 lg:col-span-2 road-card p-5 sm:p-6 transition-all">
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">
                      Transit to Next Job
                    </span>
                    <div className="mt-2">
                      <TransitTripCard transit={transit} currentJob={nextRouteAJob} onRefresh={transit.refreshTrip} />
                    </div>
                  </div>
                )}

                {isTransitApiEnabled() && (
                  <div className="col-span-2 lg:col-span-2">
                    <TransitDashboardCard onOpenTools={() => setCurrentTab('tools')} />
                  </div>
                )}

                {/* 2. Today's Route — compact remaining route in work order */}
                <div id="bento-tile-todays-route" className="col-span-2 lg:col-span-2 road-card p-5 sm:p-6 flex flex-col gap-4 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        Today's Route
                      </span>
                      <h3 className="mt-1 text-2xl font-black leading-tight text-slate-950 dark:text-white">
                        What&apos;s Left After This
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-600 dark:bg-white/10 dark:text-slate-200">
                        {filteredRouteJobs.length} left
                      </span>
                      <div className="relative" data-add-menu>
                        <button
                          type="button"
                          onClick={() => setAddMenuOpen((prev) => !prev)}
                          className="flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white shadow-md hover:bg-blue-500 transition-all"
                        >
                          <Plus size={13} />
                          <span>Add</span>
                        </button>
                        {addMenuOpen && (
                          <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#17181b]" style={{ maxHeight: 'min(80dvh, 340px)' }}>
                            <button
                              type="button"
                              onClick={() => { setAddMenuOpen(false); handleOpenAddModal(); }}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                            >
                              <Plus size={14} className="text-blue-500" />
                              Add Stop
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAddMenuOpen(false); handleOpenProcessServeModal(); }}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                            >
                              <Briefcase size={14} className="text-red-500" />
                              Add Process Serve
                            </button>
                            <div className="border-t border-slate-200 dark:border-white/10" />
                            <button
                              type="button"
                              onClick={() => { setAddMenuOpen(false); setIsScreenshotImportOpen(true); }}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                            >
                              <FileImage size={14} className="text-violet-500" />
                              <span className="flex flex-col">
                                <span>Import Job Screenshots</span>
                                <span className="text-[9px] font-bold text-slate-400">Upload screenshots of assignments</span>
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <RouteFilter activeFilter={routeFilter} onFilterChange={setRouteFilter} counts={routeFilterCounts} />

                  {filteredRouteJobs.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-emerald-200/70 bg-emerald-50 p-6 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
                      <p className="mt-3 text-xl font-black text-slate-900 dark:text-white">
                        {routeFilter === 'today' && 'Route Clear'}
                        {routeFilter === 'under_review' && 'No Under Review'}
                        {routeFilter === 'revisions' && 'No Revisions'}
                        {routeFilter === 'finished' && 'No Finished Jobs'}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
                        {routeFilter === 'today' && 'All Route A jobs are complete.'}
                        {routeFilter === 'under_review' && 'No jobs are currently under review.'}
                        {routeFilter === 'revisions' && 'No jobs require revisions.'}
                        {routeFilter === 'finished' && 'No jobs have been finished yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto pr-1 lg:max-h-[430px]">
                      {filteredRouteJobs.map((job, idx) => {
                        const isNext = job.id === nextRouteAJob?.id;
                        const prevJob = idx === 0 ? null : remainingRouteAJobs[idx - 1];
                        const origin = idx === 0
                          ? startCoord
                          : prevJob?.coordinates || startCoord;
                        const navLink = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${job.coordinates.lat},${job.coordinates.lng}&travelmode=${travelMode}`;

                        return (
                          <div
                            key={job.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setRouteDetailJobId(job.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setRouteDetailJobId(job.id);
                              }
                            }}
                            className={`rounded-2xl border p-2.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#0A0A0A] ${
                              isNext
                                ? 'border-indigo-300 bg-indigo-50 shadow-sm hover:border-indigo-400 hover:bg-indigo-100/80 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15'
                                : 'border-slate-200/70 bg-white/70 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.07]'
                            }`}
                            aria-label={`Open details for ${job.storeName}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                                isNext
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'
                              }`}>
                                {idx + 1}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <h4 className="truncate text-base font-black leading-tight text-slate-950 dark:text-white sm:text-lg">
                                    {job.storeName}
                                  </h4>
                                  {isNext && (
                                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                                      Next
                                    </span>
                                  )}
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${getRouteBadgeClasses(job)}`}>
                                    {getRouteBadgeLabel(job)}
                                  </span>
                                </div>
                                <p className="mt-0.5 truncate text-sm font-bold text-slate-500 dark:text-slate-400">
                                  {getStreetName(job.address)}
                                </p>
                                {isProcessServeJob(job) && (
                                  <p className="mt-1 truncate text-[11px] font-black uppercase text-red-600 dark:text-red-300">
                                    Process serve proof required
                                  </p>
                                )}
                              </div>

                              <div className="grid shrink-0 grid-cols-3 gap-1.5">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    job.status === 'under_review' ? handleToggleComplete(job.id) : handleMarkUnderReview(job.id);
                                  }}
                                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-white transition sm:w-auto sm:px-2.5 ${
                                    job.status === 'under_review'
                                      ? 'bg-blue-700 hover:bg-blue-600'
                                      : 'bg-indigo-700 hover:bg-indigo-600'
                                  }`}
                                  title={job.status === 'under_review' ? `Complete ${job.storeName}` : `Mark ${job.storeName} under review`}
                                  aria-label={job.status === 'under_review' ? `Complete ${job.storeName}` : `Mark ${job.storeName} under review`}
                                >
                                  {job.status === 'under_review' ? <CheckSquare size={16} /> : <Hourglass size={16} />}
                                  <span className="ml-1.5 hidden text-[10px] font-black uppercase sm:inline">{job.status === 'under_review' ? 'Done' : 'Review'}</span>
                                </button>
                                <a
                                  href={navLink}
                                  target="_blank"
                                  onClick={(event) => event.stopPropagation()}
                                  referrerPolicy="no-referrer"
                                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-500 sm:w-auto sm:px-2.5"
                                  title={`Navigate to ${job.storeName}`}
                                  aria-label={`Navigate to ${job.storeName}`}
                                >
                                  <Navigation size={16} />
                                  <span className="ml-1.5 hidden text-[10px] font-black uppercase sm:inline">Go</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleMoveJobRoute(job.id, 'B');
                                  }}
                                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 transition hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-200 sm:w-auto sm:px-2.5"
                                  title={`Move ${job.storeName} to standby`}
                                  aria-label={`Move ${job.storeName} to standby`}
                                >
                                  <ArrowRightLeft size={16} />
                                  <span className="ml-1.5 hidden text-[10px] font-black uppercase sm:inline">Move</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {completedRouteAJobs.length > 0 && (
                    <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm font-black text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                      {completedRouteAJobs.length} completed hidden
                    </div>
                  )}
                </div>

                {/* 3. Jobs Left Card — compact status tile */}
                <div id="bento-tile-jobs-left" className="col-span-1 md:col-span-1 lg:col-span-1 road-card p-5  flex flex-col justify-between transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Jobs Left</span>
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      <CheckSquare size={13} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="block text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                      {routeAJobs.filter(j => !isJobDone(j)).length}
                    </span>
                    <span className="block text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      of {routeAJobs.length} Remaining
                    </span>
                  </div>
                  <div className="border-t border-slate-100 dark:border-white/5 pt-2 mt-2">
                    {(() => {
                      const completed = routeAJobs.filter(isJobDone).length;
                      const total = routeAJobs.length || 1;
                      const pct = (completed / total) * 100;
                      return (
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 flex-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[9px] font-mono font-black text-slate-400">{pct.toFixed(0)}%</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>


                {/* 3. Battery Status Card — compact dashboard tile */}
                <div id="bento-tile-battery-status" className="col-span-1 md:col-span-1 lg:col-span-1 road-card p-5 flex flex-col justify-between transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Battery Status</span>
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <Battery size={13} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="block text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                      {projectedBatteryAfterRoute}%
                    </span>
                    <span className="block text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      after route
                    </span>
                  </div>
                  <div className="border-t border-slate-100 dark:border-white/5 pt-2 mt-2 flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${reserveColorClass}`}>
                      {reserveLabel}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 font-mono">
                      {usableRangeRemaining.toFixed(0)} mi reserve
                    </span>
                  </div>
                </div>

                {/* 4. Earnings Card — switches from expected pay to live earned pay during work */}
                <div id="bento-tile-earnings" className="col-span-1 md:col-span-1 lg:col-span-1 road-card p-5  flex flex-col justify-between transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{earningsTileTitle}</span>
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <DollarSign size={13} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="block text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                      ${earningsTileAmount.toFixed(2)}
                    </span>
                    <span className="block text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      {earningsTileSubtext}
                    </span>
                  </div>
                  <div className="border-t border-slate-100 dark:border-white/5 pt-2 mt-2">
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {earningsTileFooter}
                    </span>
                  </div>
                </div>

                {/* 6. Urgent Alerts / Revisions — Spans 2 columns on mobile/desktop */}
                <div id="bento-tile-revisions" className="col-span-2 md:col-span-2 lg:col-span-2 road-card p-6  flex flex-col justify-between space-y-3 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const revisionJobs = routeAJobs.filter(isRevisionJob);
                        return (
                          <>
                            <div className={`p-3 rounded-2xl flex-shrink-0 ${
                              revisionJobs.length > 0 
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' 
                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                            }`}>
                              <AlertTriangle size={24} className={revisionJobs.length > 0 ? 'animate-bounce' : ''} />
                            </div>
                            <div>
                              <h3 className="text-sm font-black uppercase text-slate-500 tracking-wide dark:text-slate-400">Operational Integrity</h3>
                              <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Urgent Alerts & Revisions</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="space-y-2">
                      {(() => {
                        const revisionJobs = routeAJobs.filter(isRevisionJob);
                        if (revisionJobs.length === 0) {
                          return (
                            <div className="p-3 rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                              <CheckCircle2 size={14} />
                              <span>No revisions required. Active route is clear and stable.</span>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                            {revisionJobs.map((job) => (
                              <div key={job.id} className="p-4 rounded-2xl bg-rose-500/[0.03] border border-rose-500/15 text-base flex items-start gap-3 animate-fade-in">
                                <AlertTriangle size={18} className="text-rose-500 mt-1 flex-shrink-0" />
                                <div>
                                  <span className="font-black text-lg text-slate-900 dark:text-slate-100 block leading-tight">{job.storeName}</span>
                                  <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-1 leading-snug">Notes: {job.notes || 'Revisit required.'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Dedicated inventory workspace */}
          {currentTab === 'inventory' && (
            <section id='tab-view-inventory' className='space-y-5 animate-fade-in'>
              <div className='road-card p-5 sm:p-6'>
                <div className='flex items-start gap-3'>
                  <div className='rounded-xl bg-cyan-500/10 p-3 text-cyan-500'><PackageCheck size={24} /></div>
                  <div>
                    <p className='text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-300'>Inventory custody</p>
                    <h2 className='mt-1 text-3xl font-black text-slate-950 dark:text-white'>Track equipment by job</h2>
                    <p className='mt-2 max-w-2xl text-sm font-bold text-slate-500 dark:text-slate-300'>Receive, install, remove, and return equipment while preserving its evidence trail.</p>
                  </div>
                </div>
                <label className='mt-5 block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400'>Company inventory domain</label>
                <select value={inventoryDomain} onChange={event => { setInventoryDomain(event.target.value as 'merchandising' | 'contract_parts'); setInventoryJobId(null); }} className='mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/5 dark:text-white'>
                  <option value='merchandising'>{inventoryDomainLabel('merchandising')}</option>
                  <option value='contract_parts'>{inventoryDomainLabel('contract_parts')}</option>
                </select>
                <label className='mt-4 block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400'>Store job</label>
                <select value={inventoryJob?.id || ''} onChange={event => setInventoryJobId(event.target.value)} className='mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/5 dark:text-white'>
                  {inventoryJobs.length === 0 ? <option value=''>No jobs in this company domain</option> : inventoryJobs.map(job => <option key={job.id} value={job.id}>{job.storeName} - {job.address}</option>)}
                </select>
              </div>
              {inventoryJob ? <InventoryCustodyPanel job={inventoryJob} /> : <div className='road-card p-6 text-sm font-bold text-slate-500'>{inventoryDomain === 'contract_parts' ? 'No contract-parts job is explicitly assigned to this company domain yet.' : 'Add or import a store job to begin package custody.'}</div>}
            </section>
          )}

          {/* Tab 4: Battery Safety Parameters */}
          {currentTab === 'battery' && !showerGate.showerGateAccessReady && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-8 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
              <ShieldCheck size={40} className="mx-auto mb-4 text-amber-500" />
              <h3 className="text-lg font-black text-amber-900 dark:text-amber-100">Daily Verification Required</h3>
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Complete your daily shower verification in Mission Control to unlock Battery features.</p>
              <button onClick={() => handleTabChange('dashboard')} className="mt-4 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-black text-white hover:bg-amber-500 transition-all">Go to Mission Control</button>
            </div>
          )}
          {currentTab === 'battery' && showerGate.showerGateAccessReady && (
            <div className="space-y-6 animate-fade-in" id="tab-view-battery">
              {/* Top Summary Banner */}
              <div className="road-card p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                      <Battery className="w-6 h-6 " />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Jasion EB5 Battery-Aware Routing</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Calculate precision state-of-charge limits, range factors, and run live-ride simulation telemetry.</p>
                    </div>
                  </div>
                  
                  {/* Quick Status Pill */}
                  <div className="flex items-center gap-3">
                    {(() => {
                      const needed = activeMetrics.estimatedBatteryUsage;
                      const remaining = parseFloat((currentBattery - needed).toFixed(1));
                      let bg = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                      let statusText = 'ROUTE IS SAFE';
                      let icon = <ShieldCheck size={16} />;
                      
                      if (remaining <= 0) {
                        bg = 'bg-red-500/10 text-red-500 border border-red-500/20';
                        statusText = 'INSUFFICIENT BATTERY';
                        icon = <ShieldAlert size={16} />;
                      } else if (remaining < 15) {
                        bg = 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
                        statusText = 'CRITICAL RANGE RISK';
                        icon = <AlertTriangle size={16} />;
                      } else if (remaining < 30) {
                        bg = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                        statusText = 'MODERATE RANGE RISK';
                        icon = <AlertTriangle size={16} />;
                      }
                      
                      return (
                        <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase ${bg}`}>
                          {icon}
                          <span>{statusText}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className={`rounded-[8px] border-2 p-5 ${batteryToneClass}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest">Battery Tracker V1</p>
                    <h3 className="text-4xl font-black leading-none">Range Decision Center</h3>
                  </div>
                  <span className="rounded-[8px] bg-slate-950 px-4 py-2 text-xl font-black uppercase text-white dark:bg-white dark:text-slate-950">
                    Risk: {batteryRisk}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <div className="rounded-[8px] bg-white/70 p-4 dark:bg-black/20">
                    <p className="text-sm font-black uppercase opacity-70">Battery %</p>
                    <p className="text-5xl font-black">{batteryTrackerCurrent}%</p>
                  </div>
                  <div className="rounded-[8px] bg-white/70 p-4 dark:bg-black/20">
                    <p className="text-sm font-black uppercase opacity-70">Ride Time</p>
                    <p className="text-3xl font-black">{formatDuration(tracker.rideTime)}</p>
                  </div>
                  <div className="rounded-[8px] bg-white/70 p-4 dark:bg-black/20">
                    <p className="text-sm font-black uppercase opacity-70">Store Time</p>
                    <p className="text-3xl font-black">{formatDuration(tracker.storeTime)}</p>
                  </div>
                  <div className="rounded-[8px] bg-white/70 p-4 dark:bg-black/20">
                    <p className="text-sm font-black uppercase opacity-70">Estimated Range</p>
                    <p className="text-5xl font-black">{estimatedMilesRemaining}</p>
                    <p className="text-lg font-black">mi</p>
                  </div>
                  <div className="rounded-[8px] bg-white/70 p-4 dark:bg-black/20">
                    <p className="text-sm font-black uppercase opacity-70">Assist Level</p>
                    <p className="text-5xl font-black">PAS {assistLevel}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-[8px] bg-slate-950 p-4 text-white dark:bg-white dark:text-slate-950">
                    <p className="text-sm font-black uppercase">Can finish route?</p>
                    <p className="text-3xl font-black">{canFinishRoute ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="rounded-[8px] bg-slate-950 p-4 text-white dark:bg-white dark:text-slate-950">
                    <p className="text-sm font-black uppercase">Recharge recommended?</p>
                    <p className="text-3xl font-black">{rechargeRecommended ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="rounded-[8px] bg-slate-950 p-4 text-white dark:bg-white dark:text-slate-950">
                    <p className="text-sm font-black uppercase">Learned performance</p>
                    <p className="text-3xl font-black">{learnedBatteryRate.toFixed(2)}%/mi</p>
                  </div>
                </div>
              </div>

              {/* Dual-Column Layout */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Column: Interactive Inputs */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Inputs Card */}
                  <div className="road-card p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <Sliders size={18} className="text-blue-500" />
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Configure Ride Variables</h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">Jasion EB5: 1x 360Wh Battery</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Current Battery Level Input */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label htmlFor="input-current-battery" className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                            Current Battery Percentage
                          </label>
                          <span className={`text-xs font-black ${
                            currentBattery > 50 ? 'text-emerald-500' : currentBattery > 20 ? 'text-amber-500' : 'text-red-500'
                          }`}>{currentBattery}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Battery Visual Cell */}
                          <div className="relative w-14 h-7 border-2 border-slate-300 dark:border-white/20 rounded-md p-0.5 flex-shrink-0 flex items-center bg-slate-50 dark:bg-neutral-950">
                            <div 
                              className={`h-full rounded-xs transition-all ${
                                currentBattery > 50 ? 'bg-emerald-500' : currentBattery > 20 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${currentBattery}%` }}
                            />
                            <div className="absolute -right-1 top-2 w-1 h-2 bg-slate-300 dark:bg-white/20 rounded-r-xs" />
                          </div>
                          <input
                            id="input-current-battery"
                            type="range"
                            min="0"
                            max="100"
                            value={currentBattery}
                            onChange={(e) => setCurrentBattery(Number(e.target.value))}
                            className="road-slider"
                          />
                        </div>
                      </div>

                      {/* Assist Level Selector */}
                      <div className="space-y-2">
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          Pedal Assist Level (PAS 1–5)
                        </label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((level) => {
                            const labels = ['Eco (PAS 1)', 'Tour (PAS 2)', 'Norm (PAS 3)', 'Sport (PAS 4)', 'Turbo (PAS 5)'];
                            const selectedColors = [
                              'bg-emerald-500 text-white border-emerald-500',
                              'bg-blue-500 text-white border-blue-500',
                              'bg-indigo-500 text-white border-indigo-500',
                              'bg-amber-500 text-white border-amber-500',
                              'bg-red-500 text-white border-red-500'
                            ];
                            
                            return (
                              <button
                                key={level}
                                onClick={() => setAssistLevel(level)}
                                title={labels[level-1]}
                                className={`min-h-12 rounded-2xl border text-sm font-black flex items-center justify-center transition-all ${
                                  assistLevel === level
                                    ? selectedColors[level-1]
                                    : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400'
                                }`}
                              >
                                {level}
                              </button>
                            );
                          })}
                        </div>
                        <span className="block text-[10px] text-slate-400 italic">
                          {assistLevel === 1 && "Eco PAS 1: Minimal draw, 0.55x consumption. Maximum range."}
                          {assistLevel === 2 && "Tour PAS 2: Moderate help, 0.75x consumption."}
                          {assistLevel === 3 && "Normal PAS 3: Default config, 1.0x consumption."}
                          {assistLevel === 4 && "Sport PAS 4: High output, 1.25x consumption."}
                          {assistLevel === 5 && "Turbo PAS 5: Max speed & throttle, 1.55x heavy battery drain!"}
                        </span>
                      </div>

                      {/* Rider Weight Input */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label htmlFor="input-rider-weight" className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                            Rider Weight (lbs)
                          </label>
                          <span className="text-xs font-black text-slate-900 dark:text-white">{riderWeight} lbs</span>
                        </div>
                        <input
                          id="input-rider-weight"
                          type="range"
                          min="100"
                          max="300"
                          step="5"
                          value={riderWeight}
                          onChange={(e) => setRiderWeight(Number(e.target.value))}
                          className="road-slider"
                        />
                      </div>

                      {/* Cargo Weight Input */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label htmlFor="input-cargo-weight" className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                            Cargo / Backpack Weight (lbs)
                          </label>
                          <span className="text-xs font-black text-slate-900 dark:text-white">{cargoWeight} lbs</span>
                        </div>
                        <input
                          id="input-cargo-weight"
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={cargoWeight}
                          onChange={(e) => setCargoWeight(Number(e.target.value))}
                          className="road-slider"
                        />
                      </div>

                      {/* Wind Placeholder Selectors */}
                      <div className="space-y-2">
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          Bakersfield Wind Forecast
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'none', label: 'Calm / Light (0% draw)' },
                            { value: 'tailwind', label: 'Tailwind (-10% draw)' },
                            { value: 'headwind_light', label: 'Light Headwind (+15%)' },
                            { value: 'headwind_strong', label: 'Strong Headwind (+35%)' }
                          ].map((windItem) => (
                            <button
                              key={windItem.value}
                              onClick={() => setWeatherWind(windItem.value)}
                              className={`p-2 rounded-xl border text-xs font-bold text-left transition-all ${
                                weatherWind === windItem.value
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                              }`}
                            >
                              {windItem.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Terrain Placement Selectors */}
                      <div className="space-y-2">
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          Route Terrain Profile
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'flat', label: 'Flat Valley' },
                            { value: 'rolling', label: 'Rolling Hills' },
                            { value: 'hilly', label: 'Steep Slopes' }
                          ].map((terrainItem) => (
                            <button
                              key={terrainItem.value}
                              onClick={() => setTerrain(terrainItem.value)}
                              className={`p-2 rounded-xl border text-xs font-bold text-center transition-all ${
                                terrain === terrainItem.value
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                              }`}
                            >
                              {terrainItem.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-white/5 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Adjust Typical Speed Limits</span>
                        <p className="text-[10px] text-slate-400">Tune average speed limits in city stop-and-go.</p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-64">
                        <input
                          id="speed-limit-range"
                          type="range"
                          min="10"
                          max="25"
                          value={ebikeConfig.avgSpeedMph}
                          onChange={(e) => handleSaveConfig({ ...ebikeConfig, avgSpeedMph: Number(e.target.value) })}
                          className="road-slider"
                        />
                        <span className="text-xs font-black text-slate-900 dark:text-white w-12 text-right">{ebikeConfig.avgSpeedMph} MPH</span>
                      </div>
                    </div>
                  </div>

                  {/* Ride Telemetry Simulator Panel */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6  space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Compass className="text-blue-500 animate-spin" size={18} style={{ animationDuration: isSimulating ? '3s' : '0s' }} />
                        <div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Ride Tracking Telemetry Simulator</h3>
                          <p className="text-[10px] text-slate-400">Test battery depletion rate and safety margin on live Route A stops.</p>
                        </div>
                      </div>

                      {!isSimulating ? (
                        <button
                          onClick={handleStartSimulation}
                          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-500 shadow-md transition-all active:scale-95"
                        >
                          <Play size={12} className="fill-white" />
                          <span>Start Ride Simulation</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleStopSimulation}
                          className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-500 shadow-md transition-all"
                        >
                          <span className="h-2 w-2 rounded-full bg-white  mr-0.5" />
                          <span>Abort Simulation</span>
                        </button>
                      )}
                    </div>

                    {/* Simulation Console Screen */}
                    {(isSimulating || simulatedDistance > 0) ? (
                      <div className="p-4 rounded-xl border border-blue-500/10 bg-slate-50 dark:bg-neutral-950 space-y-3 font-mono text-xs">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pb-2 border-b border-slate-200/50 dark:border-white/5">
                          <span>SYSTEM STATUS: {isSimulating ? "SIMULATING LIVE RIDE..." : "SIMULATION COMPLETED"}</span>
                          <span className=" text-blue-500">● LIVE FEED</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-slate-700 dark:text-slate-300">
                          <div>
                            <span className="text-[10px] text-slate-400 block">DISTANCE COVERED:</span>
                            <span className="font-bold text-slate-900 dark:text-white text-sm">{simulatedDistance} / {activeMetrics.totalDistance} mi</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">SIMULATED BATTERY:</span>
                            <span className={`font-bold text-sm ${simulatedBattery > 50 ? 'text-emerald-500' : simulatedBattery > 20 ? 'text-amber-500' : 'text-red-500'}`}>
                              {simulatedBattery}%
                            </span>
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <span className="text-[10px] text-slate-400 block">STOPS VISITED:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {simulatedJobsCompleted.length} / {routeAJobs.length} Completed
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full bg-slate-200 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(100, (simulatedDistance / activeMetrics.totalDistance) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 font-bold mt-1 text-[11px]">
                          <Sliders size={12} className="" />
                          <span>{simulationStatus}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-white/5 bg-slate-50/50 dark:bg-transparent">
                        <Compass className="mx-auto text-slate-400 mb-2" size={24} />
                        <p className="text-xs font-bold text-slate-500">No active simulation running</p>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                          Click "Start Ride Simulation" to run a diagnostic telemetry check over Route A stops to verify real-time battery drain rates before hitting the pavement.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Battery Audit Dashboard */}
                <div className="space-y-6">
                  {/* Performance Indicators */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6  space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-indigo-500" />
                      <span>Safety Margin Audit</span>
                    </h3>

                    {(() => {
                      const needed = activeMetrics.estimatedBatteryUsage;
                      const remaining = parseFloat((currentBattery - needed).toFixed(1));
                      let meterColor = 'bg-emerald-500';
                      let labelColor = 'text-emerald-500';
                      let riskLevel = 'SAFE';
                      let isSafe = true;
                      let recommendation = 'You have a healthy battery reserve. Safe to complete full Route A sequence!';
                      let icon = <CheckCircle2 className="text-emerald-500" size={16} />;
                      
                      if (remaining <= 0) {
                        meterColor = 'bg-red-500';
                        labelColor = 'text-red-500';
                        riskLevel = 'CRITICAL (DEPLETED)';
                        isSafe = false;
                        recommendation = 'DO NOT DEPART! Your battery will drain fully before completion. Recharge to 100% or adjust to PAS 1 (Eco) mode.';
                        icon = <ShieldAlert className="text-red-500" size={16} />;
                      } else if (remaining < 15) {
                        meterColor = 'bg-rose-500';
                        labelColor = 'text-rose-500';
                        riskLevel = 'HIGH RANGE RISK';
                        isSafe = false;
                        recommendation = 'Plug into the 2A charger immediately! Postpone outliers, or switch to PAS 1/2 to preserve charge.';
                        icon = <AlertTriangle className="text-rose-500" size={16} />;
                      } else if (remaining < 30) {
                        meterColor = 'bg-amber-500';
                        labelColor = 'text-amber-500';
                        riskLevel = 'MODERATE RANGE RISK';
                        isSafe = true;
                        recommendation = 'Tight safety margin. Maintain steady pedaling, drop speed to 14 MPH, and keep stops brief.';
                        icon = <AlertTriangle className="text-amber-500" size={16} />;
                      }

                      return (
                        <div className="space-y-5">
                          {/* Main Stats Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 dark:bg-white/2 rounded-xl border border-slate-100 dark:border-white/5 text-center">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Estimated Needed</span>
                              <span className="block text-lg font-black text-slate-900 dark:text-white mt-1">{needed}%</span>
                              <span className="block text-[9px] text-slate-400 mt-0.5 font-mono">{(needed * 3.6).toFixed(0)} Wh used</span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-white/2 rounded-xl border border-slate-100 dark:border-white/5 text-center">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">Estimated Remaining</span>
                              <span className={`block text-lg font-black mt-1 ${labelColor}`}>{remaining}%</span>
                              <span className="block text-[9px] text-slate-400 mt-0.5 font-mono">{Math.max(0, remaining * 3.6).toFixed(0)} Wh left</span>
                            </div>
                          </div>

                          {/* Battery Progress Meter */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                              <span>Range safety buffer</span>
                              <span className={`font-black ${labelColor}`}>{riskLevel}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-white/5 h-3 rounded-full overflow-hidden flex">
                              <div 
                                className={`${meterColor} h-full rounded-l-full transition-all`}
                                style={{ width: `${Math.min(100, Math.max(0, remaining))}%` }}
                              />
                              <div 
                                className="bg-slate-300/35 dark:bg-white/10 h-full flex-1 transition-all"
                                style={{ width: `${Math.min(100, needed)}%` }}
                              />
                            </div>
                          </div>

                          {/* Advice Card */}
                          <div className="p-4 bg-slate-50 dark:bg-neutral-900 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-800 dark:text-slate-100">
                              {icon}
                              <span>Recharge & Speed Plan</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
                              {recommendation}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Outlier Job Action Advice Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6  space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                      <ArrowRightLeft size={14} className="text-amber-500" />
                      <span>Postpone Outlier Jobs</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Geographically isolated stops drain massive charge. Moving them to standby Route B ensures you complete local clusters safely.
                    </p>

                    {outliersReport.length > 0 ? (
                      <div className="space-y-3">
                        {outliersReport.map((rep) => {
                          const jobToMove = routeAJobs.find(j => j.id === rep.jobId);
                          if (!jobToMove) return null;
                          return (
                            <div key={rep.jobId} className="p-3 bg-rose-500/[0.02] border border-rose-500/10 rounded-xl space-y-2.5">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-tight">
                                    {rep.storeName}
                                  </span>
                                  <span className="block text-[10px] text-slate-400 mt-0.5 leading-none font-mono">
                                    {rep.distanceToNearest} mi from neighbors (+{rep.batteryCostPercent}% battery)
                                  </span>
                                </div>
                                <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 font-mono text-[9px] font-black uppercase flex-shrink-0">
                                  -{rep.batteryCostPercent}% cost
                                </span>
                              </div>
                              <button
                                onClick={() => handleUpdateJobStatus(rep.jobId, { routeId: 'B' })}
                                className="w-full flex items-center justify-center gap-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                              >
                                <span>Postpone to Standby Route B</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 text-center">
                        <span className="block text-xs font-bold text-emerald-500">Perfectly Clustered Route!</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          No geographic outliers detected in active Route A. Minimal travel energy penalty.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Playbook remains as advice */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6  space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                      <HelpCircle size={14} className="text-indigo-500" />
                      <span>Conservation Playbook</span>
                    </h3>
                    <div className="space-y-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      <div className="p-2.5 bg-emerald-500/[0.01] border border-emerald-500/5 rounded-xl">
                        <span className="font-black text-lg text-slate-900 dark:text-slate-100 block leading-tight">1. Steady PAS 2 on Chester Ave</span>
                        Chester Ave is extremely flat. Avoid throttle bursts and hold assist Level 2 to keep consumption under 2.2% per mile.
                      </div>
                      <div className="p-2.5 bg-amber-500/[0.01] border border-amber-500/5 rounded-xl">
                        <span className="font-black text-lg text-slate-900 dark:text-slate-100 block leading-tight">2. Wind management on Rosedale</span>
                        Rosedale has major crosswinds. Drop average speed limit down by 2 MPH to cut wind resistance by 30%.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Ride Tracker */}
          {currentTab === 'tracker' && !showerGate.showerGateAccessReady && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-8 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
              <ShieldCheck size={40} className="mx-auto mb-4 text-amber-500" />
              <h3 className="text-lg font-black text-amber-900 dark:text-amber-100">Daily Verification Required</h3>
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Complete your daily shower verification in Mission Control to unlock Tracker features.</p>
              <button onClick={() => handleTabChange('dashboard')} className="mt-4 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-black text-white hover:bg-amber-500 transition-all">Go to Mission Control</button>
            </div>
          )}
          {currentTab === 'tracker' && showerGate.showerGateAccessReady && (
            <RideTrackerTab
              trackerStatus={tracker.status}
              trackerRideTime={tracker.rideTime}
              trackerStoreTime={tracker.storeTime}
              trackerTotalDayTime={tracker.totalDayTime}
              trackerStartBattery={tracker.startBattery}
              currentBattery={currentBattery}
              trackerJobsCompleted={tracker.jobsCompleted}
              trackerSessions={tracker.sessions}
              rideStartedAt={tracker.rideStartedAt}
              ebikeConfig={ebikeConfig}
              jobs={jobs}
              routeAJobs={routeAJobs}
              completedRouteAJobs={completedRouteAJobs}
              isJobDone={isJobDone}
              tomorrowJobs={tomorrowJobs}
              onStartRide={handleStartTrackerRide}
              onArrivedAtStore={handleTrackerArrivedAtStore}
              onResumeRide={handleTrackerResumeRide}
              onEndDay={handleTrackerEndDay}
              onResetCurrentSession={handleResetCurrentTrackerSession}
              onToggleJobComplete={handleTrackerToggleJobComplete}
              onClearHistory={handleClearTrackerHistory}
              onMoveUnfinishedToTomorrow={handleMoveUnfinishedToTomorrow}
            />
          )}

          {currentTab === 'habits' && (
            <HabitsTab
              habitGoalComplete={habits.habitGoalComplete}
              todayHabitMinutes={habits.todayHabitMinutes}
              habitTargetMinutes={habits.habitTargetMinutes}
              habitSyncStatus={habits.habitSyncStatus}
              habitTasks={habits.habitTasks}
              habitLogs={habits.habitLogs}
              activeHabitTask={habits.activeHabitTask}
              todayKey={todayKey}
              habitTasksHitToday={habits.habitTasksHitToday}
              allHabitMinutesToday={habits.allHabitMinutesToday}
              todayHabitTaskName={habits.todayHabitTaskName}
              todayHabitTaskMinutes={habits.todayHabitTaskMinutes}
              todayHabitTaskNote={habits.todayHabitTaskNote}
              habitTaskName={habits.habitTaskName}
              habitLogMinutes={habits.habitLogMinutes}
              habitLogNote={habits.habitLogNote}
              habitStreakDays={habits.habitStreakDays}
              habitConsistencyPct={habits.habitConsistencyPct}
              habitDaysComplete={habits.habitDaysComplete}
              habitTotalMinutes={habits.habitTotalMinutes}
              habitTotalSessions={habits.habitTotalSessions}
              habitLast7Days={habits.habitLast7Days}
              habitRecentLogs={habits.habitRecentLogs}
              showerGateRequired={SHOWER_GATE_REQUIRED}
              showerGateUnlocked={showerGate.showerGateUnlocked}
              barcodeVerifiedForCycle={showerGate.barcodeVerifiedForCycle}
              showerProofRequiredSatisfied={showerGate.showerProofRequiredSatisfied}
              barcodeScanMessage={showerGate.barcodeScanMessage}
              showerCycleLabel={showerGate.showerCycleLabel}
              showerHabitLoggedForCycle={showerHabitLoggedForCycle}
              showerProofForCycle={showerGate.showerProofForCycle}
              showerProofAttachmentForCycle={showerGate.showerProofAttachmentForCycle}
              showerProofInputKey={showerGate.showerProofInputKey}
              showerProofSyncMessage={showerGate.showerProofSyncMessage}
              showerProofSyncStatus={showerGate.showerProofSyncStatus}
              showerProofBackendFolder={showerGate.showerProofBackendFolder}
              barcodeScannerActive={showerGate.barcodeScannerActive}
              barcodePermissionStatus={showerGate.barcodePermissionStatus}
              barcodeTorchOn={showerGate.barcodeTorchOn}
              barcodeTorchAvailable={showerGate.barcodeTorchAvailable}
              barcodeVideoRef={showerGate.barcodeVideoRef}
              setActiveHabitTaskId={habits.setActiveHabitTaskId}
              updateActiveHabitTask={habits.updateActiveHabitTask}
              setHabitLogNote={habits.setHabitLogNote}
              setTodayHabitTaskName={habits.setTodayHabitTaskName}
              setTodayHabitTaskMinutes={habits.setTodayHabitTaskMinutes}
              setTodayHabitTaskNote={habits.setTodayHabitTaskNote}
              handleAddHabitTask={habits.handleAddHabitTask}
              handleAddTodayHabitTask={habits.handleAddTodayHabitTask}
              handleLogHabitSession={habits.handleLogHabitSession}
              handleDeleteHabitLog={habits.handleDeleteHabitLog}
              handleShowerProofFile={showerGate.handleShowerProofFile}
              handleConfirmDailyShower={handleConfirmDailyShower}
              stopBarcodeScanner={showerGate.stopBarcodeScanner}
              startBarcodeScanner={showerGate.startBarcodeScanner}
              toggleBarcodeTorch={showerGate.toggleBarcodeTorch}
            />
          )}

          {/* Tab 5.5: Tools */}
          {currentTab === 'tools' && (
            <div className="space-y-6 animate-fade-in" id="tab-view-tools">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#17181b] space-y-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Field Tools</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Camera capture, screenshot import, and transit mode controls.
                </p>
              </div>

              {/* Smart Aisle Scan */}
              <div className="rounded-2xl border border-cyan-200 bg-white p-6 dark:border-cyan-500/20 dark:bg-[#17181b] space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-cyan-500/10 p-3">
                    <Camera size={22} className="text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Smart Aisle Scan</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Camera-guided aisle photography with alignment, auto-capture, coverage review, and panorama stitching.
                    </p>
                  </div>
                </div>

                {(() => {
                  const compatibleJobs = jobs.filter(j =>
                    ['retail_audit', 'mystery_shop', 'merchandising'].includes(j.jobType) &&
                    !isJobCompleted(j) && j.status !== 'finished'
                  );
                  if (compatibleJobs.length === 0) {
                    return (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs font-bold text-slate-400">No compatible jobs available</p>
                        <p className="text-[10px] text-slate-400 mt-1">Add a retail audit, mystery shop, or merchandising job to use Smart Aisle Scan.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select a job to scan</p>
                      <div className="space-y-2">
                        {compatibleJobs.map(job => (
                          <button
                            key={job.id}
                            onClick={() => { setScanJobId(job.id); setIsScanOpen(true); }}
                            className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-cyan-500/30 dark:hover:bg-cyan-500/5"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                              <Camera size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-slate-900 dark:text-white truncate">{job.storeName}</p>
                              <p className="text-[10px] text-slate-400 truncate">{job.address}</p>
                            </div>
                            <span className="text-[10px] font-bold text-cyan-500">Open →</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Import Job Screenshots */}
              <div className="rounded-2xl border border-violet-200 bg-white p-6 dark:border-violet-500/20 dark:bg-[#17181b] space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-violet-500/10 p-3">
                    <FileImage size={22} className="text-violet-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Import Job Screenshots</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Upload screenshots of job assignments to auto-extract store names, addresses, pay, and notes.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsScreenshotImportOpen(true)}
                  className="w-full rounded-xl bg-violet-600 py-3 text-xs font-black text-white hover:bg-violet-500 transition flex items-center justify-center gap-2"
                >
                  <FileImage size={14} />
                  Open Screenshot Import
                </button>
              </div>

              {/* Bus / Transit Mode */}
              <div className="rounded-2xl border border-amber-200 bg-white p-6 dark:border-amber-500/20 dark:bg-[#17181b] space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-500/10 p-3">
                    <ArrowRightLeft size={22} className="text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Transit Mode</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Switch between bike and bus transit. When bus mode is active, trip planning uses public transit routes.
                    </p>
                  </div>
                </div>
                <BusModeToggle travelMode={travelMode} onModeChange={setTravelMode} />
                {travelMode === 'transit' && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-[11px] text-amber-300/80">
                      Transit mode active. The next stop card on the Dashboard will show bus trip details when available.
                    </p>
                  </div>
                )}
              </div>

              <TransitToolsPanel
                hubCoord={{ lat: startCoord.lat, lng: startCoord.lng }}
                jobs={jobs}
              />
            </div>
          )}

          {/* Tab 6: Settings and Instructions */}
          {currentTab === 'settings' && (
            <div className="space-y-6 animate-fade-in" id="tab-view-settings">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  {/* Start Location Config Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5  space-y-3">
                    <label htmlFor="hub-address-input" className="block text-xs font-black uppercase text-slate-400 tracking-wider">
                      STARTING HUB LOCATION (HOME ADDRESS)
                    </label>
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                      <MapPin className="text-blue-500 flex-shrink-0" size={16} />
                      <input
                        id="hub-address-input"
                        type="text"
                        value={startAddress}
                        onChange={(e) => handleUpdateStart(e.target.value)}
                        placeholder="Enter starting address in Bakersfield, CA"
                        className="flex-1 bg-transparent py-0.5 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none dark:text-slate-100"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      Precise coordinates: Lat {startCoord.lat.toFixed(4)}, Lng {startCoord.lng.toFixed(4)} (Bakersfield Hub)
                    </p>
                  </div>

                  {/* Theme Switcher tile */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5  space-y-3">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Interface Theme Presets</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          if (theme !== 'light') handleToggleTheme();
                        }}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                          theme === 'light'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
                        }`}
                      >
                        <Sun size={20} />
                        <span className="text-xs font-bold">High Contrast Light Theme</span>
                      </button>
                      <button
                        onClick={() => {
                          if (theme !== 'dark') handleToggleTheme();
                        }}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                          theme === 'dark'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
                        }`}
                      >
                        <Moon size={20} />
                        <span className="text-xs font-bold">Dark Slate Theme</span>
                      </button>
                    </div>
                  </div>

                  {/* System Tools */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5  space-y-3">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Database Maintenance</h3>
                    <p className="text-xs text-slate-500">Resets system to seed stops. This clears custom stops from localStorage and sets the default Bakersfield mock landmarks.</p>
                    <button
                      onClick={handleResetSeeds}
                      className="rounded-xl border border-dashed border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 bg-red-500/[0.01] hover:bg-red-500/[0.04] px-4 py-2.5 text-xs font-bold transition-all"
                    >
                      Purge Custom stops and Reset Seeds
                    </button>
                  </div>

                  <TransitStatusCard />

                  {/* Account */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5  space-y-3">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Account</h3>
                    <p className="text-xs text-slate-500">Sign out of your account. You will need to enter your credentials again.</p>
                    <button
                      onClick={async () => {
                        if (window.confirm("Sign out of All in One 667?")) {
                          await signOut();
                        }
                      }}
                      className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-slate-500/[0.01] hover:bg-slate-500/[0.04] px-4 py-2.5 text-xs font-bold transition-all"
                    >
                      Sign Out
                    </button>
                  </div>

                  {/* Developer Tools */}
                  {isSmartAisleTestLabEnabled && (
                    <div className="rounded-2xl border border-amber-200 bg-white p-5 space-y-3 dark:border-amber-500/20 dark:bg-[#17181b]">
                      <h3 className="text-xs font-black uppercase text-amber-500 tracking-widest flex items-center gap-2">
                        <FlaskConical size={14} /> Developer Tools
                      </h3>
                      <button
                        onClick={() => setIsTestLabOpen(true)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                      >
                        <FlaskConical size={16} className="text-amber-500" />
                        <div>
                          <p className="text-xs font-black uppercase text-amber-400 tracking-wider">Smart Aisle Scan Test Lab</p>
                          <p className="text-[10px] text-amber-400/60 mt-0.5">Practice camera, test imports, run controlled scenarios</p>
                        </div>
                        <ChevronRight size={14} className="text-amber-400/40 ml-auto" />
                      </button>
                    </div>
                  )}

                  {/* Debug Center */}
                  {debugCenterOpen && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 dark:bg-slate-900 dark:border-white/10">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Debug Center</h3>
                        <button
                          onClick={onCloseDebugCenter}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          Close
                        </button>
                      </div>
                      <DebugCenter />
                    </div>
                  )}
                  {!debugCenterOpen && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 space-y-3">
                      <button
                        onClick={() => onOpenDebugCenter?.()}
                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <Bug size={16} className="text-slate-400" />
                        <div>
                          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Debug Center</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">System diagnostics, auth status, and error logs</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* FAQ Instructions */}
                <div className="space-y-6">
                  <div className="road-card p-5 space-y-4">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">Command Manual</h3>
                    <div className="space-y-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 dark:text-slate-200">How do Outliers work?</p>
                        <p>Our algorithm flags stops that significantly increase travel time without contributing enough payout. We classify them under a Red Badge so you can push them to Standby.</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 dark:text-slate-200">What are status codes?</p>
                        <p>Visual indicators help you prioritize: Green is Ready, Yellow needs a Revisit, Red is a travel Outlier, Blue is Completed, and Gray is Route B Standby.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* AIØ Bottom Navigation (Today / Jobs / More) */}
        {!tracker.rideModeActive && (
          <BottomTabBar
            current={currentTab === 'dashboard' ? 'today' : currentTab === 'jobs' ? 'jobs' : 'more'}
            onChange={(tab) => handleTabChange(tab === 'today' ? 'dashboard' : tab === 'jobs' ? 'jobs' : 'more')}
            jobsCount={todayRouteJobs.filter(job => !isJobCompleted(job) && !isJobFinished(job)).length}
          />
        )}

        {selectedProofRecord && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[8px] border-2 border-slate-300 bg-white p-5 shadow-2xl dark:border-white/20 dark:bg-[#17181b]">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-white/10">
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Proof Folder</p>
                  <h3 className="text-4xl font-black text-slate-950 dark:text-white">{selectedProofRecord.storeName}</h3>
                  <p className="text-lg font-black text-slate-600 dark:text-slate-300">{selectedProofRecord.address}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProofJobId(null)}
                  className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  aria-label="Close proof folder"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-[8px] bg-slate-100 p-3 dark:bg-white/10">
                  <p className="text-sm font-black uppercase text-slate-500">Completion Time</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{new Date(selectedProofRecord.completionTime).toLocaleString()}</p>
                </div>
                <div className="rounded-[8px] bg-slate-100 p-3 dark:bg-white/10">
                  <p className="text-sm font-black uppercase text-slate-500">Arrival Time</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{new Date(selectedProofRecord.arrivalTime).toLocaleString()}</p>
                </div>
                <div className="rounded-[8px] bg-slate-100 p-3 dark:bg-white/10">
                  <p className="text-sm font-black uppercase text-slate-500">GPS</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                    {selectedProofRecord.gps ? `${selectedProofRecord.gps.lat.toFixed(4)}, ${selectedProofRecord.gps.lng.toFixed(4)}` : 'Optional'}
                  </p>
                </div>
                <div className="rounded-[8px] bg-slate-100 p-3 dark:bg-white/10">
                  <p className="text-sm font-black uppercase text-slate-500">Evidence Count</p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                    {selectedProofRecord.photos.length + selectedProofRecord.screenshots.length + selectedProofRecord.receipts.length} files
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {([
                  ['photos', 'Photos', Camera],
                  ['screenshots', 'Screenshots', FileImage],
                  ['receipts', 'Receipts', ReceiptText]
                ] as const).map(([kind, label, Icon]) => (
                  <section key={kind} className="rounded-[8px] border-2 border-slate-200 p-4 dark:border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon size={22} className="text-blue-700 dark:text-blue-300" />
                        <h4 className="text-xl font-black text-slate-950 dark:text-white">{label}</h4>
                      </div>
                      <span className="rounded-[8px] bg-slate-100 px-2 py-1 text-sm font-black dark:bg-white/10">
                        {selectedProofRecord[kind].length}
                      </span>
                    </div>
                    <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center rounded-[8px] bg-blue-700 px-3 text-base font-black uppercase text-white transition hover:bg-blue-600">
                      Add {label}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          handleAddProofAssets(selectedProofRecord.jobId, kind, event.target.files);
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {selectedProofRecord[kind].map(asset => (
                        <a
                          key={asset.id}
                          href={asset.dataUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-[8px] border border-slate-200 bg-slate-50 p-2 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                        >
                          {asset.dataUrl.startsWith('data:image') && (
                            <img src={asset.dataUrl} alt={asset.name} className="mb-2 aspect-square w-full rounded-[8px] object-cover" />
                          )}
                          <span className="block truncate">{asset.name}</span>
                        </a>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <section className="mt-5 rounded-[8px] border-2 border-slate-200 p-4 dark:border-white/10">
                <div className="mb-3 flex items-center gap-2">
                  <StickyNote size={22} className="text-blue-700 dark:text-blue-300" />
                  <h4 className="text-xl font-black text-slate-950 dark:text-white">Notes</h4>
                </div>
                <textarea
                  value={selectedProofRecord.notes}
                  onChange={(event) => handleUpdateProofNotes(selectedProofRecord.jobId, event.target.value)}
                  placeholder="Add details, disputes, manager names, app confirmation notes, or anything you may need later."
                  className="min-h-32 w-full rounded-[8px] border-2 border-slate-300 bg-white p-3 text-base font-bold text-slate-950 outline-none focus:border-blue-700 dark:border-white/10 dark:bg-black/20 dark:text-white"
                />
              </section>
            </div>
          </div>
        )}

        {/* Job Detail Mini Page Modal */}
        {routeDetailJob && (() => {
          const routeIndex = routeAJobs.findIndex(job => job.id === routeDetailJob.id);
          const previousStop = routeIndex <= 0 ? null : routeAJobs[routeIndex - 1];
          const origin = previousStop?.coordinates || startCoord;
          const legDistance = getDistanceInMiles(origin, routeDetailJob.coordinates);
          const rideMinutes = Math.max(1, Math.round((legDistance / ebikeConfig.avgSpeedMph) * 60));
          const routeIdx = routeIndex >= 0 ? routeIndex : null;
          const navLink = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${routeDetailJob.coordinates.lat},${routeDetailJob.coordinates.lng}&travelmode=${travelMode}`;

          return (
            <JobDetailModal
              job={routeDetailJob}
              routeIndex={routeIdx}
              legDistance={legDistance}
              rideMinutes={rideMinutes}
              navLink={navLink}
              isOutlier={outlierIds.includes(routeDetailJob.id)}
              jobAccessLocked={!showerGate.showerGateAccessReady}
              onToggleComplete={handleToggleComplete}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteJob}
              onDuplicate={handleDuplicateJob}
              onToggleRoute={handleToggleRoute}
              onUpdateStatus={handleUpdateJobStatus}
              onOpenScan={(jobId) => { setScanJobId(jobId); setIsScanOpen(true); }}
              transitOrigin={{ latitude: origin.lat, longitude: origin.lng }}
              onMoveToDay={setMoveToDayJob}
              onClose={() => setRouteDetailJobId(null)}
            />
          );
        })()}

        {previewGuideJob && (() => {
          const routeIndex = routeAJobs.findIndex(job => job.id === previewGuideJob.id);
          const previousStop = routeIndex <= 0 ? null : routeAJobs[routeIndex - 1];
          const origin = previousStop?.coordinates || startCoord;
          const navLink = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${previewGuideJob.coordinates.lat},${previewGuideJob.coordinates.lng}&travelmode=${travelMode}`;

          return (
            <PreviewGuideModal
              job={previewGuideJob}
              navLink={navLink}
              transitOrigin={{ latitude: origin.lat, longitude: origin.lng }}
              onClose={() => setPreviewGuideJobId(null)}
            />
          );
        })()}

        {/* Job Creator / Updater modal */}
        <JobModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveJobModal}
          editingJob={editingJob}
          defaultRouteId={activeTab === 'all' ? 'A' : activeTab}
          defaultJobType={defaultJobType}
        />

        {/* Screenshot Import modal */}
        <ScreenshotImportModal
          isOpen={isScreenshotImportOpen}
          onClose={() => setIsScreenshotImportOpen(false)}
          onImportJobs={handleImportJobs}
          existingJobs={jobs}
        />

        {/* Smart Aisle Scan */}
        {scanJobId && (
          <SmartAisleScan
            jobId={scanJobId}
            jobName={jobs.find(j => j.id === scanJobId)?.storeName || ''}
            isOpen={isScanOpen}
            onClose={() => { setIsScanOpen(false); setScanJobId(null); }}
            onComplete={(sessionId) => {
              const updated = jobs.map(j =>
                j.id === scanJobId
                  ? { ...j, captureMode: 'smart_aisle_scan' as const, scanSessionId: sessionId }
                  : j
              );
              saveJobsToStorage(updated);
              setIsScanOpen(false);
              setScanJobId(null);
              setDispatcherMessage('Smart Aisle Scan submitted. Session saved locally.');
            }}
          />
        )}

        {/* Smart Aisle Scan Test Lab */}
        {isSmartAisleTestLabEnabled && (
          <SmartAisleScanTestLab
            isOpen={isTestLabOpen}
            onClose={() => setIsTestLabOpen(false)}
          />
        )}

        {/* Move-to-Day scheduling sheet */}
        <MoveToDaySheet
          job={moveToDayJob}
          today={today}
          onMove={handleMoveJobToDate}
          onClose={() => setMoveToDayJob(null)}
        />

        {/* Portable Footer */}
        {currentTab !== 'dashboard' && (
        <footer className="mt-12 border-t border-slate-200 bg-white py-6 dark:border-white/5 dark:bg-[#1C1C1E]/80">
          <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
            <p className="font-bold text-slate-500 dark:text-slate-400">All in One 667</p>
            <p>Built for fast stop review, sequencing, and field-ready route decisions.</p>
          </div>
        </footer>
        )}

      </div>
    </div>
    <AssistantBubble />
  </AssistantProvider>
  );
}






















