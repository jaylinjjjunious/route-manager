/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import { useAuth } from './auth/AuthProvider';
import { Job, Coordinates, DispatcherAction } from './types';
import {
  optimizeRouteWithSmartMerge,
} from './features/routePlanning/routeUtils';
import { useRoutePlanning } from './features/routePlanning/useRoutePlanning';
import { getDistanceInMiles } from './utils/geoUtils';
import { BAKERSFIELD_COORDINATES, resolveCoordinates } from './utils/bakersfieldCoordinates';
import {
  isJobCompleted,
  isJobFinished,
  isRevisionJob,
  normalizeJobsForStorage,
} from './features/jobs/jobState';
import {
  addDays,
  effectiveDay,
  todayString,
  isActionableJob,
  formatScheduledDate,
  SCHEDULE_MAX_DAYS_AHEAD
} from './features/jobs/jobSchedule';
import { useJobs, SEED_JOBS } from './features/jobs/useJobs';
import { JOB_LIFECYCLE_HARNESS_JOB_ID, isJobLifecycleHarnessEnabled } from './features/jobs/jobLifecycleHarness';
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
import BatteryTab from './features/battery/BatteryTab';
import { useBattery } from './features/battery/useBattery';
import ProofVaultModal from './features/proofVault/ProofVaultModal';
import { useProofVault } from './features/proofVault/useProofVault';
import ScreenshotImportModal from './components/ScreenshotImportModal';
import SmartAisleScan from './components/SmartAisleScan';
import InventoryCustodyPanel from './components/InventoryCustodyPanel';
import { getInventoryDomain, inventoryDomainLabel } from './services/inventory/domain';
import SmartAisleScanTestLab from './components/SmartAisleScanTestLab';
import { RouteFilter } from './features/jobs/RouteFilter';
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
  Plus, Moon, Sun, Layers, ShieldCheck, MapPin, CheckSquare,
  LayoutDashboard, Briefcase, Battery, Settings, AlertTriangle, ArrowRightLeft,
  Sparkles, Compass, ExternalLink, Navigation, CheckCircle2,
  ChevronDown, ChevronUp, ChevronRight, DollarSign, Zap, Award, Volume2, VolumeX,
  FolderOpen, Camera, FileImage, Hourglass, Bug, FlaskConical, PackageCheck
} from 'lucide-react';

const isSmartAisleTestLabEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_SMART_AISLE_TEST_LAB === 'true';
const isLifecycleHarnessEnabled = isJobLifecycleHarnessEnabled(import.meta.env);

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

export default function App({ debugCenterOpen, onCloseDebugCenter, onOpenDebugCenter }: { debugCenterOpen?: boolean; onCloseDebugCenter?: () => void; onOpenDebugCenter?: () => void } = {}) {
  const { signOut, user } = useAuth();
  const [startAddress, setStartAddress] = useState('1951 Golden State Ave');
  const [startCoord, setStartCoord] = useState<Coordinates>({ lat: 35.3904, lng: -119.0255 });
  const battery = useBattery();
  const {
    ebikeConfig,
    currentBattery,
    assistLevel,
    riderWeight,
    cargoWeight,
    weatherWind,
    terrain,
    learnedBatteryPercentPerMile,
    batteryFactor,
  } = battery;
  const [travelMode, setTravelMode] = useState<TravelMode>(() => {
    return (safeStorage.getItem('travel_mode') as TravelMode) || 'bicycling';
  });

  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'all'>('A');
  const [currentTab, setCurrentTab] = useState<AppTab>(() => getTabFromHash() || 'dashboard');

  const [today, setToday] = useState<string>(() => todayString());
  const jobs = useJobs(today, { includeLifecycleHarness: isLifecycleHarnessEnabled });
  const proofVault = useProofVault({ completedJobs: jobs.jobs.filter(isJobCompleted) });
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  // Voice and Dispatcher Sync States
  const { isSpeaking, isLoadingAudio, speak, stop, errorMessage: ttsError } = useTextToSpeech();
  const defaultDispatcherMessage = "Good morning. Route A is ready. Start with the next stop and keep the day moving safely.";
  const [dispatcherMessage, setDispatcherMessage] = useState(defaultDispatcherMessage);

  // Bento Dashboard Expansion States
  const [bentoNextStopDetails, setBentoNextStopDetails] = useState(false);
  const [bentoNextStopCompleted, setBentoNextStopCompleted] = useState(false);
  const [bentoBatteryDetails, setBentoBatteryDetails] = useState(false);
  const [bentoRevisionDetails, setBentoRevisionDetails] = useState(false);

  const mobileActivationRef = useRef({ key: '', time: 0 });

  // Modal configurations
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScreenshotImportOpen, setIsScreenshotImportOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scanJobId, setScanJobId] = useState<string | null>(null);
  const [isTestLabOpen, setIsTestLabOpen] = useState(false);
  const [routeDetailJobId, setRouteDetailJobId] = useState<string | null>(null);
  const [previewGuideJobId, setPreviewGuideJobId] = useState<string | null>(null);
  const [inventoryJobId, setInventoryJobId] = useState<string | null>(null);
  const [inventoryDomain, setInventoryDomain] = useState<'merchandising' | 'contract_parts'>('merchandising');
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

  // Load from local storage (non-job settings)
  useEffect(() => {
    const savedStart = safeStorage.getItem('route_optimizer_start');
    const savedTheme = safeStorage.getItem('route_optimizer_theme');

    if (savedStart) {
      setStartAddress(savedStart);
      setStartCoord(resolveCoordinates(savedStart));
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

  useEffect(() => {
    safeStorage.setItem('travel_mode', travelMode);
  }, [travelMode]);

  // Scheduling helper used by cross-feature orchestration
  const tomorrow = addDays(today, 1);

  const tracker = useRideTracker(ebikeConfig, learnedBatteryPercentPerMile, batteryFactor);

  const {
    lastOptimizationLog,
    isOptimizing,
    isSimulating,
    simulatedDistance,
    simulatedBattery,
    simulationStatus,
    simulatedJobsCompleted,
    activeMetrics,
    projectedBatteryAfterRoute,
    usableRangeRemaining,
    reserveLabel,
    reserveColorClass,
    completedRouteAJobs,
    remainingRouteAJobs,
    nextRouteAJob,
    routeProgressPct,
    routeMilesRemaining,
    outliersReport,
    outlierIds,
    nextStopOrigin,
    nextStopDistance,
    nextStopRideMinutes,
    nextStopNavLink,
    routeListStops,
    routeListNavLink,
    handleStartSimulation,
    handleStopSimulation,
  } = useRoutePlanning({
    allJobs: jobs.jobs,
    routeAJobs: jobs.routeAJobs,
    todayRouteJobs: jobs.todayRouteJobs,
    executableRouteJobs: jobs.executableRouteJobs,
    startAddress,
    startCoord,
    ebikeConfig,
    currentBattery,
    batteryFactor,
    rideDistance: tracker.rideDistance,
    travelMode,
  });

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
  const liveEarnedToday = completedRouteAJobs.reduce((sum, job) => sum + job.pay, 0);
  const allRouteAJobsCompleted = jobs.routeAJobs.length > 0 && completedRouteAJobs.length === jobs.routeAJobs.length;
  const showLiveEarnings = (tracker.isWorkSessionActive || completedRouteAJobs.length > 0) && !allRouteAJobsCompleted;
  const earningsTileAmount = showLiveEarnings ? liveEarnedToday : activeMetrics.totalPay;
  const earningsTileTitle = showLiveEarnings ? 'Earned Today' : 'Estimated Earnings Today';
  const earningsTileSubtext = showLiveEarnings
    ? `${completedRouteAJobs.length} of ${jobs.routeAJobs.length} jobs paid`
    : 'Projected Route Pay';
  const earningsTileFooter = showLiveEarnings
    ? `$${Math.max(0, activeMetrics.totalPay - liveEarnedToday).toFixed(2)} still on route`
    : `$${activeMetrics.earningsPerHour.toFixed(2)}/h expected`;



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
    const routeAWork = normalizedJobs.filter(j => j.routeId === 'A' && j.status !== 'finished');
    // Only today's executable work joins the optimized route order;
    // future-dated Route A jobs keep their relative position and never enter
    // today's sequence.
    const todayPool = routeAWork.filter(j => effectiveDay(j, today) === today && isActionableJob(j));
    const futurePool = routeAWork.filter(j => effectiveDay(j, today) !== today);
    const finishedRouteAJobs = normalizedJobs.filter(j => j.routeId === 'A' && j.status === 'finished');
    const restJobs = normalizedJobs.filter(j => j.routeId !== 'A');
    
    // Automatically apply Smart Revision Merge & Continuous Route Optimization (exclude finished)
    const optimizedRouteA = optimizeRouteWithSmartMerge(startCoord, todayPool, ebikeConfig);
    const finalized = normalizeJobsForStorage([...optimizedRouteA, ...futurePool, ...finishedRouteAJobs, ...restJobs]);

    jobs.replaceJobs(finalized);
  };

  const handleUpdateStart = (newAddr: string) => {
    setStartAddress(newAddr);
    const resolved = resolveCoordinates(newAddr);
    setStartCoord(resolved);
    safeStorage.setItem('route_optimizer_start', newAddr);
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    safeStorage.setItem('route_optimizer_theme', nextTheme);
  };

  // Job Actions
  const handleUpdateJobStatus = (id: string, updates: Partial<Job>) => {
    if ((updates.status === 'completed' || updates.status === 'under_review' || updates.status === 'finished' || updates.isCompleted === true) && blockJobAccess('job status changes')) {
      return;
    }
    const result = jobs.updateJobStatus(id, updates);
    if (result.becameCompleted && result.updatedJob) {
      proofVault.ensureProofForJob(result.updatedJob);
      setDispatcherMessage(buildCompletionReadback(result.updatedJob, result.nextJobs));
    }
    if (result.becameFinished && result.updatedJob) {
      setDispatcherMessage(`${result.updatedJob.storeName} finished and removed from active route.`);
    }
    saveJobsToStorage(result.nextJobs);
  };

  const handleMarkUnderReview = (id: string) => {
    if (blockJobAccess('job review')) return;
    const result = jobs.markJobUnderReview(id);
    if (result.previousJob) {
      setDispatcherMessage(`${result.previousJob.storeName} marked under review. Press Complete once the review clears and the check is confirmed.`);
    }
    saveJobsToStorage(result.nextJobs);
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
    const result = jobs.toggleJobComplete(id);
    if (!result.previousJob) return;

    if (result.becameCompleted && result.updatedJob) {
      jobs.setCompletingJobIds(prev => prev.includes(id) ? prev : [...prev, id]);
      proofVault.ensureProofForJob(result.previousJob);
      setDispatcherMessage(buildCompletionReadback(result.previousJob, result.nextJobs));
      if (tracker.rideModeActive) {
        tracker.trackJobCompletion(id, result.previousJob.estimatedMinutes);
      }

      window.setTimeout(() => {
        saveJobsToStorage(result.nextJobs);
        jobs.setCompletingJobIds(prev => prev.filter(jobId => jobId !== id));
      }, 520);

      return;
    }

    saveJobsToStorage(result.nextJobs);
  };



  // Re-order Route A using nearest-neighbor greedy routing from home
  const handleOptimizeRouteSequence = () => {
    const routeAWork = jobs.jobs.filter(j => j.routeId === 'A');
    const restJobs = jobs.jobs.filter(j => j.routeId !== 'A');
    const todayPool = routeAWork.filter(j => effectiveDay(j, today) === today && isActionableJob(j));
    const futurePool = routeAWork.filter(j => effectiveDay(j, today) !== today);
    const optimized = optimizeRouteWithSmartMerge(startCoord, todayPool, ebikeConfig);
    saveJobsToStorage([...optimized, ...futurePool, ...restJobs]);
  };

  const handleResetSeeds = () => {
    saveJobsToStorage(SEED_JOBS);
    setStartAddress('1951 Golden State Ave');
    setStartCoord(BAKERSFIELD_COORDINATES['1951 Golden State Ave']);
    safeStorage.removeItem('route_optimizer_start');
  };

  const handleResetLifecycleHarnessJob = () => {
    jobs.resetLifecycleHarnessJob();
    handleTabChange('jobs');
  };

  const handleOpenAddModal = () => {
    jobs.setEditingJob(null);
    jobs.setDefaultJobType('retail_audit');
    setIsModalOpen(true);
  };

  const handleOpenProcessServeModal = () => {
    jobs.setEditingJob(null);
    jobs.setDefaultJobType('process_serve');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (job: Job) => {
    jobs.setEditingJob(job);
    jobs.setDefaultJobType(job.jobType);
    setIsModalOpen(true);
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
    battery.learnFromRide({
      distance,
      estimatedBatteryUsed: batteryUsed,
      startBattery: tracker.startBattery,
    });
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
      jobsMovedToTomorrow: jobs.tomorrowJobs.length,
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
      jobsMovedToTomorrow: jobs.tomorrowJobs.length,
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
    const completedJobNames = jobs.routeAJobs
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
      jobs.setSelectedStripDate(null);
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
    setHistoryStack(prev => [...prev, { jobs: JSON.parse(JSON.stringify(jobs.jobs)), battery: currentBattery }]);

    switch (action.type) {
      case 'COMPLETE_JOB': {
        const target = action.jobTarget?.toLowerCase();
        if (!target) return 'No target specified for completion.';
        const matchedJob = jobs.jobs.find(j => 
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
        const next = jobs.saveJob(newJob);
        saveJobsToStorage(next);
        return `Added new active stop at ${storeName}.`;
      }
      case 'EDIT_JOB': {
        const target = action.jobTarget?.toLowerCase();
        if (!target || !action.jobData) return 'Missing target or update details for editing.';
        const matchedIndex = jobs.jobs.findIndex(j => 
          j.id === action.jobTarget || 
          j.storeName.toLowerCase().includes(target)
        );
        if (matchedIndex !== -1) {
          const matchedJob = jobs.jobs[matchedIndex];
          const result = jobs.updateJobStatus(matchedJob.id, action.jobData);
          saveJobsToStorage(result.nextJobs);
          return `Successfully updated stop ${result.updatedJob?.storeName || matchedJob.storeName}.`;
        }
        return `Could not find job matching "${action.jobTarget}".`;
      }
      case 'MOVE_TO_TOMORROW': {
        const target = action.jobTarget?.toLowerCase();
        if (!target) return 'No target specified to move to tomorrow.';
        const matchedJob = jobs.jobs.find(j => 
          j.id === action.jobTarget || 
          j.storeName.toLowerCase().includes(target)
        );
        if (matchedJob) {
          const next = jobs.moveJobToDate(matchedJob.id, tomorrow);
          saveJobsToStorage(next);
          return `Postponed ${matchedJob.storeName} to tomorrow's standby list.`;
        }
        return `Could not find job matching "${action.jobTarget}".`;
      }
      case 'MOVE_TO_ROUTE_B': {
        const target = action.jobTarget?.toLowerCase();
        if (!target) return 'No target specified for route shift.';
        const matchedJob = jobs.jobs.find(j => 
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
          const val = battery.setCurrentBattery(action.batteryValue);
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
    
    jobs.replaceJobs(previous.jobs);
    
    battery.restoreBattery(previous.battery);
    return true;
  };

  const revisionAlertJobs = remainingRouteAJobs.filter(isRevisionJob);
  const selectedProofRecord = proofVault.selectedProofRecord;
  const routeDetailJob = routeDetailJobId ? jobs.jobs.find(job => job.id === routeDetailJobId) || null : null;
  const previewGuideJob = previewGuideJobId ? jobs.jobs.find(job => job.id === previewGuideJobId) || null : null;
  const inventoryJobs = jobs.jobs.filter(job => getInventoryDomain(job) === inventoryDomain);
  const inventoryJob = inventoryJobs.find(job => job.id === inventoryJobId) || inventoryJobs.find(job => job.routeId === 'A') || inventoryJobs[0] || null;
  const getRouteStopNavLink = routeListNavLink;
  const dispatcherBrief = dispatcherMessage.length > 118 ? `${dispatcherMessage.slice(0, 115).trim()}...` : dispatcherMessage;
  const rideDistance = tracker.rideDistance;
  const rideBatteryUsed = tracker.rideBatteryUsed;
  const rideAverageSpeed = tracker.rideAverageSpeed;
  const rideEarned = completedRouteAJobs.reduce((sum, job) => sum + job.pay, 0);
  const rideEarningsPerHour = tracker.formatRideEarningsPerHour(rideEarned);
  const {
    learnedBatteryRate,
    batteryTrackerUsed,
    batteryTrackerCurrent,
    estimatedMilesRemaining,
    batteryRisk,
    canFinishRoute,
    rechargeRecommended,
    batteryToneClass,
  } = battery.getDecisionMetrics({
    rideBatteryUsed,
    routeMilesRemaining,
    projectedBatteryAfterRoute,
  });

  // AIØ Today screen derivation (reuses existing route/schedule logic — no fabricated scoring).
  const currentJob = jobs.todayRouteJobs.find(job => job.status === 'under_review') || null;
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
      jobs={jobs.jobs}
      routeAJobs={jobs.routeAJobs}
      routeBJobs={jobs.routeBJobs}
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
      onOpenProofHistory={proofVault.openProofHistory}
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
              completingJobIds={jobs.completingJobIds}
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
                jobsTodayCount={jobs.todayRouteJobs.length}
                weatherWind={weatherWind}
                currentJob={currentJob}
                hasCurrentJob={hasCurrentJob}
                nextJob={nextJob}
                remainingJobs={jobs.todayRouteJobs.filter(job => !isJobCompleted(job) && !isJobFinished(job))}
                completedJobsCount={completedRouteAJobs.length}
                routeTotalJobs={jobs.routeAJobs.length}
                completingJobIds={jobs.completingJobIds}
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
                weeklyDays={jobs.weeklyDays}
                today={today}
                selectedStripDate={jobs.selectedStripDate}
                onSelectStripDate={jobs.setSelectedStripDate}
                overdueCount={jobs.overdueJobs.length}
                unscheduledCount={jobs.unscheduledJobs.length}
                onReviewOverdue={() => handleTabChange('jobs')}
                onReviewUnscheduled={() => handleTabChange('jobs')}
                startCoord={startCoord}
                avgSpeedMph={ebikeConfig.avgSpeedMph}
                onMoveToDay={jobs.setMoveToDayJob}
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
                todayJobs={jobs.todayRouteJobs}
                weekDays={jobs.weeklyDays}
                routeBJobs={jobs.routeBJobs}
                overdueJobs={jobs.overdueJobs}
                unscheduledJobs={jobs.unscheduledJobs}
                onOpenJob={(job) => setRouteDetailJobId(job.id)}
                onAddJob={handleOpenAddModal}
                onOptimizeRoute={handleOptimizeRouteSequence}
                onMoveToDay={jobs.setMoveToDayJob}
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
                onOpenProofHistory={proofVault.openProofHistory}
                onOpenDebugCenter={() => onOpenDebugCenter?.()}
                onAddProcessServe={handleOpenProcessServeModal}
                onImportScreenshots={() => setIsScreenshotImportOpen(true)}
                lifecycleHarnessEnabled={isLifecycleHarnessEnabled}
                onResetLifecycleHarness={handleResetLifecycleHarnessJob}
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
                      {jobs.routeAJobs.find(j => !isJobDone(j)) && (
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">
                          Stop #{jobs.routeAJobs.indexOf(jobs.routeAJobs.find(j => !isJobDone(j))!) + 1} of {jobs.routeAJobs.length}
                        </span>
                      )}
                    </div>

                    {(() => {
                      const nextStop = jobs.routeAJobs.find(j => !isJobDone(j));
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

                      const nextStopIdx = jobs.routeAJobs.indexOf(nextStop);
                      const prevCoordForNextStop = nextStopIdx <= 0 ? startCoord : jobs.routeAJobs[nextStopIdx - 1].coordinates;
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
                        {jobs.filteredRouteJobs.length} left
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

                  <RouteFilter activeFilter={jobs.routeFilter} onFilterChange={jobs.setRouteFilter} counts={jobs.routeFilterCounts} />

                  {jobs.filteredRouteJobs.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-emerald-200/70 bg-emerald-50 p-6 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
                      <p className="mt-3 text-xl font-black text-slate-900 dark:text-white">
                        {jobs.routeFilter === 'today' && 'Route Clear'}
                        {jobs.routeFilter === 'under_review' && 'No Under Review'}
                        {jobs.routeFilter === 'revisions' && 'No Revisions'}
                        {jobs.routeFilter === 'finished' && 'No Finished Jobs'}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
                        {jobs.routeFilter === 'today' && 'All Route A jobs are complete.'}
                        {jobs.routeFilter === 'under_review' && 'No jobs are currently under review.'}
                        {jobs.routeFilter === 'revisions' && 'No jobs require revisions.'}
                        {jobs.routeFilter === 'finished' && 'No jobs have been finished yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto pr-1 lg:max-h-[430px]">
                      {jobs.filteredRouteJobs.map((job, idx) => {
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
                                    const next = jobs.moveJobRoute(job.id, 'B');
                                    saveJobsToStorage(next);
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
                      {jobs.routeAJobs.filter(j => !isJobDone(j)).length}
                    </span>
                    <span className="block text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      of {jobs.routeAJobs.length} Remaining
                    </span>
                  </div>
                  <div className="border-t border-slate-100 dark:border-white/5 pt-2 mt-2">
                    {(() => {
                      const completed = jobs.routeAJobs.filter(isJobDone).length;
                      const total = jobs.routeAJobs.length || 1;
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
                        const revisionJobs = jobs.routeAJobs.filter(isRevisionJob);
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
                        const revisionJobs = jobs.routeAJobs.filter(isRevisionJob);
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
              <BatteryTab
                activeMetrics={activeMetrics}
                currentBattery={currentBattery}
                onCurrentBatteryChange={battery.setCurrentBattery}
                batteryToneClass={batteryToneClass}
                batteryRisk={batteryRisk}
                batteryTrackerCurrent={batteryTrackerCurrent}
              trackerRideTime={tracker.rideTime}
              trackerStoreTime={tracker.storeTime}
                formatDuration={formatDuration}
                estimatedMilesRemaining={estimatedMilesRemaining}
                assistLevel={assistLevel}
                onAssistLevelChange={battery.setAssistLevel}
                canFinishRoute={canFinishRoute}
                rechargeRecommended={rechargeRecommended}
                learnedBatteryRate={learnedBatteryRate}
                riderWeight={riderWeight}
                onRiderWeightChange={battery.setRiderWeight}
                cargoWeight={cargoWeight}
                onCargoWeightChange={battery.setCargoWeight}
                weatherWind={weatherWind}
                onWeatherWindChange={battery.setWeatherWind}
                terrain={terrain}
                onTerrainChange={battery.setTerrain}
                ebikeConfig={ebikeConfig}
                onConfigChange={battery.updateConfig}
              isSimulating={isSimulating}
              handleStartSimulation={handleStartSimulation}
              handleStopSimulation={handleStopSimulation}
              simulatedDistance={simulatedDistance}
              simulatedBattery={simulatedBattery}
              simulatedJobsCompleted={simulatedJobsCompleted}
              routeAJobs={jobs.routeAJobs}
              simulationStatus={simulationStatus}
              outliersReport={outliersReport}
              onMoveOutlierToRouteB={(jobId) => handleUpdateJobStatus(jobId, { routeId: 'B' })}
            />
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
              jobs={jobs.jobs}
              routeAJobs={jobs.routeAJobs}
              completedRouteAJobs={completedRouteAJobs}
              isJobDone={isJobDone}
              tomorrowJobs={jobs.tomorrowJobs}
              onStartRide={handleStartTrackerRide}
              onArrivedAtStore={handleTrackerArrivedAtStore}
              onResumeRide={handleTrackerResumeRide}
              onEndDay={handleTrackerEndDay}
              onResetCurrentSession={handleResetCurrentTrackerSession}
              onToggleJobComplete={handleTrackerToggleJobComplete}
              onClearHistory={handleClearTrackerHistory}
              onMoveUnfinishedToTomorrow={() => {
                const next = jobs.moveUnfinishedToTomorrow();
                saveJobsToStorage(next);
              }}
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
                  const compatibleJobs = jobs.jobs.filter(j =>
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
                jobs={jobs.jobs}
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
            jobsCount={jobs.todayRouteJobs.filter(job => !isJobCompleted(job) && !isJobFinished(job)).length}
          />
        )}

        {selectedProofRecord && (
          <ProofVaultModal
            selectedProofRecord={selectedProofRecord}
            onClose={proofVault.closeProof}
            onAddAssets={proofVault.addProofAssets}
            onUpdateNotes={proofVault.updateProofNotes}
          />
        )}

        {/* Job Detail Mini Page Modal */}
        {routeDetailJob && (() => {
          const routeIndex = jobs.routeAJobs.findIndex(job => job.id === routeDetailJob.id);
          const previousStop = routeIndex <= 0 ? null : jobs.routeAJobs[routeIndex - 1];
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
              onDelete={(id) => {
                const next = jobs.deleteJob(id);
                saveJobsToStorage(next);
              }}
              onDuplicate={(job) => {
                const next = jobs.duplicateJob(job);
                saveJobsToStorage(next);
              }}
              onToggleRoute={(id) => {
                const next = jobs.toggleRoute(id);
                saveJobsToStorage(next);
              }}
              onUpdateStatus={handleUpdateJobStatus}
              onOpenScan={(jobId) => { setScanJobId(jobId); setIsScanOpen(true); }}
              transitOrigin={{ latitude: origin.lat, longitude: origin.lng }}
              onMoveToDay={jobs.setMoveToDayJob}
              onCheckInJob={jobs.checkInJob}
              onMarkJobReadyToStart={jobs.markJobReadyToStart}
              onBlockJobBeforeStart={jobs.blockJobBeforeStart}
              onStartJob={jobs.startJob}
              onPauseJobWork={jobs.pauseJobWork}
              onResumeJobWork={jobs.resumeJobWork}
              onAwaitJobSupport={jobs.awaitJobSupport}
              onMarkJobBlockedOnsite={jobs.markJobBlockedOnsite}
              onEndJobVisit={jobs.endJobVisit}
              onMarkJobWorkComplete={jobs.markJobWorkComplete}
              onCompleteJobCloseout={jobs.completeJobCloseout}
              onReopenCompletedJob={jobs.reopenCompletedJob}
              onSatisfyCloseoutRequirements={isLifecycleHarnessEnabled && routeDetailJob.id === JOB_LIFECYCLE_HARNESS_JOB_ID
                ? () => jobs.satisfyLifecycleHarnessCloseoutRequirements()
                : undefined}
              onClose={() => setRouteDetailJobId(null)}
            />
          );
        })()}

        {previewGuideJob && (() => {
          const routeIndex = jobs.routeAJobs.findIndex(job => job.id === previewGuideJob.id);
          const previousStop = routeIndex <= 0 ? null : jobs.routeAJobs[routeIndex - 1];
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
          onSave={(jobData) => {
            const next = jobs.saveJob(jobData);
            saveJobsToStorage(next);
          }}
          editingJob={jobs.editingJob}
          defaultRouteId={activeTab === 'all' ? 'A' : activeTab}
          defaultJobType={jobs.defaultJobType}
        />

        {/* Screenshot Import modal */}
        <ScreenshotImportModal
          isOpen={isScreenshotImportOpen}
          onClose={() => setIsScreenshotImportOpen(false)}
          onImportJobs={(newJobsData) => {
            const next = jobs.importJobs(newJobsData);
            saveJobsToStorage(next);
          }}
          existingJobs={jobs.jobs}
        />

        {/* Smart Aisle Scan */}
        {scanJobId && (
          <SmartAisleScan
            jobId={scanJobId}
            jobName={jobs.jobs.find(j => j.id === scanJobId)?.storeName || ''}
            isOpen={isScanOpen}
            onClose={() => { setIsScanOpen(false); setScanJobId(null); }}
            onComplete={(sessionId) => {
              const result = jobs.updateJobStatus(scanJobId, {
                captureMode: 'smart_aisle_scan',
                scanSessionId: sessionId
              });
              saveJobsToStorage(result.nextJobs);
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
          job={jobs.moveToDayJob}
          today={today}
          onMove={(id, date) => {
            const next = jobs.moveJobToDate(id, date);
            saveJobsToStorage(next);
          }}
          onClose={() => jobs.setMoveToDayJob(null)}
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






















