/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  isRevisionJob,
  normalizeJobState,
  normalizeJobsForStorage
} from './utils/jobState';
import Header from './components/Header';
import OutlierDetector from './components/OutlierDetector';
import BakersfieldMapPreview from './components/BakersfieldMapPreview';
import JobCard from './components/JobCard';
import JobModal from './components/JobModal';
import AIDispatcher from './components/AIDispatcher';
import JobImportSystem from './components/JobImportSystem';
import { EndOfDaySummary } from './components/EndOfDaySummary';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import {
  Plus, Sliders, Play, RotateCcw, Search, Moon, Sun, Layers, ShieldCheck, MapPin, CheckSquare,
  LayoutDashboard, Map, Briefcase, Battery, Settings, Info, AlertTriangle, ArrowRightLeft,
  TrendingUp, HelpCircle, ShieldAlert, Sparkles, Compass, ExternalLink, Navigation, CheckCircle2,
  Pause, Square, Timer, Clock, ChevronDown, ChevronUp, DollarSign, Zap, Award, Volume2, VolumeX,
  FolderOpen, Camera, FileImage, ReceiptText, StickyNote, X
} from 'lucide-react';

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

interface HabitLog {
  id: string;
  taskName: string;
  minutes: number;
  date: string;
  note: string;
  createdAt: string;
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

export default function App() {
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
  const [learnedBatteryPercentPerMile, setLearnedBatteryPercentPerMile] = useState<number>(() => {
    return Number(localStorage.getItem('battery_tracker_learned_percent_per_mile') || DEFAULT_EBIKE_CONFIG.batteryPercentPerMile);
  });

  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'all'>('A');
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'route' | 'jobs' | 'battery' | 'tracker' | 'habits' | 'settings'>('dashboard');
  
  // Ride Tracker States
  const [trackerStatus, setTrackerStatus] = useState<'idle' | 'riding' | 'at_store' | 'completed'>(() => {
    return (localStorage.getItem('ride_tracker_status') as any) || 'idle';
  });
  const [trackerRideTime, setTrackerRideTime] = useState<number>(() => {
    return Number(localStorage.getItem('ride_tracker_ride_time') || '0');
  });
  const [trackerStoreTime, setTrackerStoreTime] = useState<number>(() => {
    return Number(localStorage.getItem('ride_tracker_store_time') || '0');
  });
  const [trackerTotalDayTime, setTrackerTotalDayTime] = useState<number>(() => {
    return Number(localStorage.getItem('ride_tracker_total_day_time') || '0');
  });
  const [trackerStartBattery, setTrackerStartBattery] = useState<number>(() => {
    return Number(localStorage.getItem('ride_tracker_start_battery') || '100');
  });
  const [trackerJobsCompleted, setTrackerJobsCompleted] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ride_tracker_jobs_completed');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [rideModeActive, setRideModeActive] = useState(false);
  const [rideStartedAt, setRideStartedAt] = useState<string | null>(null);
  const [rideSummary, setRideSummary] = useState<any | null>(null);
  const [trackerSessions, setTrackerSessions] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('ride_tracker_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [jobsMovedToTomorrowIds, setJobsMovedToTomorrowIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jobs_moved_to_tomorrow');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const trackerTimerRef = useRef<number | null>(null);
  const [habitTaskName, setHabitTaskName] = useState<string>(() => localStorage.getItem('habit_tracker_task_name') || 'Daily Focus Task');
  const [habitTargetMinutes, setHabitTargetMinutes] = useState<number>(() => Number(localStorage.getItem('habit_tracker_target_minutes') || '30'));
  const [habitLogMinutes, setHabitLogMinutes] = useState<number>(() => Number(localStorage.getItem('habit_tracker_last_minutes') || '30'));
  const [habitLogNote, setHabitLogNote] = useState('');
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>(() => {
    try {
      const saved = localStorage.getItem('habit_tracker_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedEngine, setSelectedEngine] = useState<'mock' | 'google' | 'apple' | 'osrm' | 'mapbox'>('mock');
  const [engineNotification, setEngineNotification] = useState<string | null>(null);
  const [jobsSubTab, setJobsSubTab] = useState<'list' | 'import'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [proofVault, setProofVault] = useState<Record<string, ProofRecord>>(() => {
    try {
      const saved = localStorage.getItem('proof_vault_records');
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
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [defaultJobType, setDefaultJobType] = useState<JobType>('retail_audit');
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [googleMetrics, setGoogleMetrics] = useState<{ distance: number; duration: number } | null>(null);

  // Load from local storage
  useEffect(() => {
    const savedJobs = localStorage.getItem('route_optimizer_jobs');
    const savedStart = localStorage.getItem('route_optimizer_start');
    const savedConfig = localStorage.getItem('route_optimizer_config');
    const savedTheme = localStorage.getItem('route_optimizer_theme');

    const savedBattery = localStorage.getItem('ebike_current_battery');
    const savedAssist = localStorage.getItem('ebike_assist_level');
    const savedRiderWeight = localStorage.getItem('ebike_rider_weight');
    const savedCargoWeight = localStorage.getItem('ebike_cargo_weight');
    const savedWeather = localStorage.getItem('ebike_weather_wind');
    const savedTerrain = localStorage.getItem('ebike_terrain');

    if (savedBattery) setCurrentBattery(Number(savedBattery));
    if (savedAssist) setAssistLevel(Number(savedAssist));
    if (savedRiderWeight) setRiderWeight(Number(savedRiderWeight));
    if (savedCargoWeight) setCargoWeight(Number(savedCargoWeight));
    if (savedWeather) setWeatherWind(savedWeather);
    if (savedTerrain) setTerrain(savedTerrain);

    if (savedJobs) {
      try {
        const parsedJobs = JSON.parse(savedJobs);
        const migratedJobs = Array.isArray(parsedJobs) && parsedJobs.length > 0
          ? normalizeJobsForStorage(parsedJobs)
          : normalizeJobsForStorage(SEED_JOBS);
        setJobs(migratedJobs);
        localStorage.setItem('route_optimizer_jobs', JSON.stringify(migratedJobs));
        localStorage.setItem('route_optimizer_jobs_schema_version', JOB_STATE_SCHEMA_VERSION);
      } catch (e) {
        const seededJobs = normalizeJobsForStorage(SEED_JOBS);
        setJobs(seededJobs);
        localStorage.setItem('route_optimizer_jobs', JSON.stringify(seededJobs));
        localStorage.setItem('route_optimizer_jobs_schema_version', JOB_STATE_SCHEMA_VERSION);
      }
    } else {
      const seededJobs = normalizeJobsForStorage(SEED_JOBS);
      setJobs(seededJobs);
      localStorage.setItem('route_optimizer_jobs', JSON.stringify(seededJobs));
      localStorage.setItem('route_optimizer_jobs_schema_version', JOB_STATE_SCHEMA_VERSION);
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

    if (savedTheme === 'light') {
      setTheme('light');
    }
  }, []);

  // Synchronize Operations dashboard message with the latest assistant message
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dispatcher_chat_messages');
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
    localStorage.setItem('ebike_current_battery', currentBattery.toString());
    localStorage.setItem('ebike_assist_level', assistLevel.toString());
    localStorage.setItem('ebike_rider_weight', riderWeight.toString());
    localStorage.setItem('ebike_cargo_weight', cargoWeight.toString());
    localStorage.setItem('ebike_weather_wind', weatherWind);
    localStorage.setItem('ebike_terrain', terrain);
  }, [currentBattery, assistLevel, riderWeight, cargoWeight, weatherWind, terrain]);

  useEffect(() => {
    localStorage.setItem('proof_vault_records', JSON.stringify(proofVault));
  }, [proofVault]);

  // Persist Ride Tracker active state variables
  useEffect(() => {
    localStorage.setItem('ride_tracker_status', trackerStatus);
    localStorage.setItem('ride_tracker_ride_time', trackerRideTime.toString());
    localStorage.setItem('ride_tracker_store_time', trackerStoreTime.toString());
    localStorage.setItem('ride_tracker_total_day_time', trackerTotalDayTime.toString());
    localStorage.setItem('ride_tracker_start_battery', trackerStartBattery.toString());
    localStorage.setItem('ride_tracker_jobs_completed', JSON.stringify(trackerJobsCompleted));
  }, [trackerStatus, trackerRideTime, trackerStoreTime, trackerTotalDayTime, trackerStartBattery, trackerJobsCompleted]);

  useEffect(() => {
    localStorage.setItem('habit_tracker_task_name', habitTaskName);
    localStorage.setItem('habit_tracker_target_minutes', habitTargetMinutes.toString());
    localStorage.setItem('habit_tracker_last_minutes', habitLogMinutes.toString());
    localStorage.setItem('habit_tracker_logs', JSON.stringify(habitLogs));
  }, [habitTaskName, habitTargetMinutes, habitLogMinutes, habitLogs]);

  // Ride Tracker timer interval
  useEffect(() => {
    if (trackerStatus === 'riding' || trackerStatus === 'at_store') {
      trackerTimerRef.current = window.setInterval(() => {
        setTrackerTotalDayTime(prev => prev + 1);
        if (trackerStatus === 'riding') {
          setTrackerRideTime(prev => prev + 1);
        } else if (trackerStatus === 'at_store') {
          setTrackerStoreTime(prev => prev + 1);
        }
      }, 1000);
    } else {
      if (trackerTimerRef.current) {
        clearInterval(trackerTimerRef.current);
        trackerTimerRef.current = null;
      }
    }
    return () => {
      if (trackerTimerRef.current) {
        clearInterval(trackerTimerRef.current);
        trackerTimerRef.current = null;
      }
    };
  }, [trackerStatus]);

  // Computed metrics & analysis
  const routeAJobs = jobs.filter(j => j.routeId === 'A');
  const routeBJobs = jobs.filter(j => j.routeId === 'B');

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

  // Metrics are computed based on current order of elements in jobs state.
  // When users click "Optimize Route", they get sequential nearest neighbor, yielding better metrics.
  const baseStandardMetrics = calculateRouteMetrics(startCoord, routeAJobs, ebikeConfig);
  const standardMetrics = {
    ...baseStandardMetrics,
    estimatedBatteryUsage: parseFloat((baseStandardMetrics.estimatedBatteryUsage * batteryFactor).toFixed(1))
  };
  
  const activeMetrics = googleMetrics 
    ? {
        ...standardMetrics,
        totalDistance: googleMetrics.distance,
        totalRideTime: googleMetrics.duration,
        totalTime: googleMetrics.duration + standardMetrics.totalWorkTime,
        estimatedBatteryUsage: parseFloat((googleMetrics.distance * ebikeConfig.batteryPercentPerMile * batteryFactor).toFixed(1)),
        earningsPerHour: (googleMetrics.duration + standardMetrics.totalWorkTime) > 0
          ? parseFloat((standardMetrics.totalPay / ((googleMetrics.duration + standardMetrics.totalWorkTime) / 60)).toFixed(2))
          : 0,
        isGoogleLive: true,
      }
    : standardMetrics;

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
  const remainingRouteAJobs = routeAJobs.filter(job => !isJobDone(job));
  const nextRouteAJob = remainingRouteAJobs[0] || null;
  const liveEarnedToday = completedRouteAJobs.reduce((sum, job) => sum + job.pay, 0);
  const isWorkSessionActive = trackerStatus === 'riding' || trackerStatus === 'at_store';
  const allRouteAJobsCompleted = routeAJobs.length > 0 && completedRouteAJobs.length === routeAJobs.length;
  const showLiveEarnings = (isWorkSessionActive || completedRouteAJobs.length > 0) && !allRouteAJobsCompleted;
  const earningsTileAmount = showLiveEarnings ? liveEarnedToday : activeMetrics.totalPay;
  const earningsTileTitle = showLiveEarnings ? 'Earned Today' : 'Estimated Earnings Today';
  const earningsTileSubtext = showLiveEarnings
    ? `${completedRouteAJobs.length} of ${routeAJobs.length} jobs paid`
    : 'Projected Route Pay';
  const earningsTileFooter = showLiveEarnings
    ? `$${Math.max(0, activeMetrics.totalPay - liveEarnedToday).toFixed(2)} still on route`
    : `$${activeMetrics.earningsPerHour.toFixed(2)}/h expected`;

  // Save changes to local storage
  const saveJobsToStorage = (updatedJobs: Job[]) => {
    const normalizedJobs = normalizeJobsForStorage(updatedJobs);
    const routeAJobs = normalizedJobs.filter(j => j.routeId === 'A');
    const restJobs = normalizedJobs.filter(j => j.routeId !== 'A');
    
    // Automatically apply Smart Revision Merge & Continuous Route Optimization
    const optimizedRouteA = optimizeRouteWithSmartMerge(startCoord, routeAJobs, ebikeConfig);
    const finalized = normalizeJobsForStorage([...optimizedRouteA, ...restJobs]);

    setJobs(finalized);
    localStorage.setItem('route_optimizer_jobs', JSON.stringify(finalized));
    localStorage.setItem('route_optimizer_jobs_schema_version', JOB_STATE_SCHEMA_VERSION);
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
    localStorage.setItem('route_optimizer_start', newAddr);
  };

  const handleSaveConfig = (updated: EbikeConfig) => {
    setEbikeConfig(updated);
    localStorage.setItem('route_optimizer_config', JSON.stringify(updated));
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('route_optimizer_theme', nextTheme);
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

  const handleSelectEngine = (engine: 'mock' | 'google' | 'apple' | 'osrm' | 'mapbox') => {
    setSelectedEngine(engine);
    if (engine === 'mock') {
      setEngineNotification("Offline high-precision routing engine selected.");
    } else {
      const providerNames: Record<string, string> = {
        google: 'Google Maps directions services',
        apple: 'Apple Maps directions services',
        osrm: 'OSRM routing engines',
        mapbox: 'Mapbox Directions API'
      };
      setEngineNotification(`Switched to pluggable ${providerNames[engine]} interface. To connect live services, supply API keys under Settings. Falling back safely to mock routing.`);
    }
  };

  useEffect(() => {
    if (engineNotification) {
      const t = setTimeout(() => setEngineNotification(null), 5000);
      return () => clearTimeout(t);
    }
  }, [engineNotification]);

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
    const targetJob = jobs.find(job => job.id === id);
    const updated = jobs.map(job =>
      job.id === id ? normalizeJobState({ ...job, ...updates }) : job
    );
    const updatedTarget = updated.find(job => job.id === id);
    if (targetJob && updatedTarget && isJobCompleted(updatedTarget) && !isJobCompleted(targetJob)) {
      createProofFolder(updatedTarget);
      setDispatcherMessage(buildCompletionReadback(updatedTarget, updated));
    }
    saveJobsToStorage(updated);
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
    const targetJob = jobs.find(job => job.id === id);
    if (!targetJob) return;

    const updated = jobs.map(job =>
      job.id === id
        ? normalizeJobState({
            ...job,
            status: isJobCompleted(job) ? 'ready' : 'completed',
            isCompleted: !isJobCompleted(job)
          })
        : job
    );

    if (!isJobCompleted(targetJob)) {
      setCompletingJobIds(prev => prev.includes(id) ? prev : [...prev, id]);
      createProofFolder(targetJob);
      setDispatcherMessage(buildCompletionReadback(targetJob, updated));
      if (rideModeActive) {
        setTrackerJobsCompleted(prev => prev.includes(id) ? prev : [...prev, id]);
        setTrackerStoreTime(prev => prev + (targetJob.estimatedMinutes * 60));
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
    const optimized = optimizeRouteWithSmartMerge(startCoord, routeAJobs, ebikeConfig);
    saveJobsToStorage([...optimized, ...restJobs]);
  };

  const handleResetSeeds = () => {
    saveJobsToStorage(SEED_JOBS);
    setStartAddress('1951 Golden State Ave');
    setStartCoord({ lat: 35.3904, lng: -119.0255 });
    localStorage.removeItem('route_optimizer_start');
  };

  const handleOpenAddModal = () => {
    setEditingJob(null);
    setDefaultJobType('retail_audit');
    setIsModalOpen(true);
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

  const handleMoveUnfinishedToTomorrow = () => {
    const unfinishedRouteAJobs = jobs.filter(j => j.routeId === 'A' && !isJobCompleted(j));
    const unfinishedIds = unfinishedRouteAJobs.map(j => j.id);
    
    setJobsMovedToTomorrowIds(unfinishedIds);
    localStorage.setItem('jobs_moved_to_tomorrow', JSON.stringify(unfinishedIds));
    
    const updatedJobs = jobs.map(j => {
      if (j.routeId === 'A' && isJobCompleted(j)) {
        return { ...j, routeId: 'B' as const };
      }
      return j;
    });
    
    saveJobsToStorage(updatedJobs);
  };

  const handleResetActiveTracker = () => {
    setTrackerStatus('idle');
    setTrackerRideTime(0);
    setTrackerStoreTime(0);
    setTrackerTotalDayTime(0);
    setTrackerJobsCompleted([]);
    setJobsMovedToTomorrowIds([]);
    localStorage.removeItem('jobs_moved_to_tomorrow');
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getDateKey = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  const todayKey = getDateKey(new Date());
  const currentHabitLogs = habitLogs.filter(log => log.taskName === habitTaskName);
  const todayHabitMinutes = currentHabitLogs
    .filter(log => log.date === todayKey)
    .reduce((sum, log) => sum + log.minutes, 0);
  const habitGoalComplete = todayHabitMinutes >= habitTargetMinutes;
  const habitTotalMinutes = currentHabitLogs.reduce((sum, log) => sum + log.minutes, 0);
  const habitTotalSessions = currentHabitLogs.length;
  const habitLast7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = getDateKey(date);
    const minutes = currentHabitLogs
      .filter(log => log.date === key)
      .reduce((sum, log) => sum + log.minutes, 0);
    return {
      key,
      label: date.toLocaleDateString([], { weekday: 'short' }),
      minutes,
      complete: minutes >= habitTargetMinutes
    };
  });
  const habitDaysComplete = habitLast7Days.filter(day => day.complete).length;
  const habitConsistencyPct = Math.round((habitDaysComplete / habitLast7Days.length) * 100);
  const habitStreakDays = (() => {
    let streak = 0;
    for (let offset = 0; offset < 365; offset++) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = getDateKey(date);
      const minutes = currentHabitLogs
        .filter(log => log.date === key)
        .reduce((sum, log) => sum + log.minutes, 0);
      if (minutes >= habitTargetMinutes) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  })();
  const habitRecentLogs = [...currentHabitLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);

  const handleLogHabitSession = () => {
    const minutes = Math.max(1, Math.round(habitLogMinutes || habitTargetMinutes || 30));
    const taskName = habitTaskName.trim() || 'Daily Focus Task';
    setHabitTaskName(taskName);
    setHabitLogs(prev => [
      {
        id: `habit-${Date.now()}`,
        taskName,
        minutes,
        date: todayKey,
        note: habitLogNote.trim(),
        createdAt: new Date().toISOString()
      },
      ...prev
    ]);
    setHabitLogNote('');
  };

  const handleDeleteHabitLog = (id: string) => {
    setHabitLogs(prev => prev.filter(log => log.id !== id));
  };

  const getRideDistance = () => parseFloat(((trackerRideTime / 3600) * ebikeConfig.avgSpeedMph).toFixed(1));
  const getEstimatedBatteryUsed = () => parseFloat((getRideDistance() * learnedBatteryPercentPerMile * batteryFactor).toFixed(1));

  const handleStartRideMode = () => {
    setRideSummary(null);
    setRideModeActive(true);
    setRideStartedAt(new Date().toISOString());
    setTrackerStatus('riding');
    setTrackerRideTime(0);
    setTrackerStoreTime(0);
    setTrackerTotalDayTime(0);
    setTrackerStartBattery(currentBattery);
    setTrackerJobsCompleted([]);
    setDispatcherMessage("Ride Mode active. Start with the next stop and keep the screen focused.");
  };

  const handleEndRideMode = () => {
    const distance = getRideDistance();
    const batteryUsed = getEstimatedBatteryUsed();
    const observedBatteryUsed = Math.max(0, trackerStartBattery - currentBattery);
    const learningBatteryUsed = observedBatteryUsed > 0 ? observedBatteryUsed : batteryUsed;
    if (distance > 0 && learningBatteryUsed > 0) {
      const sampleRate = learningBatteryUsed / distance;
      const blendedRate = parseFloat(((learnedBatteryPercentPerMile * 0.75) + (sampleRate * 0.25)).toFixed(2));
      setLearnedBatteryPercentPerMile(blendedRate);
      localStorage.setItem('battery_tracker_learned_percent_per_mile', blendedRate.toString());
    }
    const earned = completedRouteAJobs.reduce((sum, job) => sum + job.pay, 0);
    const elapsedHours = Math.max(trackerTotalDayTime / 3600, 0.01);
    const avgSpeed = trackerRideTime > 0 ? parseFloat((distance / (trackerRideTime / 3600)).toFixed(1)) : 0;
    const routeScore = Math.max(0, Math.min(100, Math.round(100 - (activeMetrics.totalDistance * 1.4) - Math.max(0, batteryUsed - 35))));
    const efficiencyScore = Math.max(0, Math.min(100, Math.round((earned / Math.max(activeMetrics.totalPay, 1)) * 55 + routeProgressPct * 0.45)));
    const endedAt = new Date().toISOString();
    const sessionLog = {
      id: `ride-${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      startedAt: rideStartedAt,
      endedAt,
      rideTime: trackerRideTime,
      storeTime: trackerStoreTime,
      totalDayTime: trackerTotalDayTime,
      startBattery: trackerStartBattery,
      endBattery: Math.max(0, Math.round(trackerStartBattery - batteryUsed)),
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
      jobsMovedToTomorrow: jobsMovedToTomorrowIds.length,
      learnedRange: batteryUsed > 0 ? parseFloat(((distance / batteryUsed) * 100).toFixed(1)) : null
    };

    setRideSummary({
      totalRideTime: formatDuration(trackerRideTime),
      totalStoreTime: formatDuration(trackerStoreTime),
      totalJobsCompleted: completedRouteAJobs.length,
      totalDistance: distance,
      estimatedBatteryUsed: batteryUsed,
      estimatedEarnings: earned,
      earningsPerHour: parseFloat((earned / elapsedHours).toFixed(2)),
      routeScore,
      efficiencyScore,
      timeSaved: Math.max(0, lastOptimizationLog?.minutesSaved || 0),
      jobsMovedToTomorrow: jobsMovedToTomorrowIds.length,
      avgRideSpeed: avgSpeed,
      stopsCompleted: completedRouteAJobs.length,
      startedAt: rideStartedAt,
      endedAt
    });
    const updatedSessions = [sessionLog, ...trackerSessions];
    setTrackerSessions(updatedSessions);
    localStorage.setItem('ride_tracker_sessions', JSON.stringify(updatedSessions));

    setRideModeActive(false);
    setTrackerStatus('idle');
    setDispatcherMessage("Ride ended. Summary generated. Planning Mode restored.");
    setCurrentTab('dashboard');
  };

  // Stack to store state snapshots for "Undo" functionality
  const [historyStack, setHistoryStack] = useState<{ jobs: Job[]; battery: number }[]>([]);

  const handleEndDayFromDispatcher = () => {
    setCurrentTab('tracker');
    setTrackerStatus('completed');
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
          setJobsMovedToTomorrowIds(prev => {
            const next = [...prev, matchedJob.id];
            localStorage.setItem('jobs_moved_to_tomorrow', JSON.stringify(next));
            return next;
          });
          handleUpdateJobStatus(matchedJob.id, { routeId: 'B' });
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
          localStorage.setItem('ebike_current_battery', val.toString());
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
    localStorage.setItem('route_optimizer_jobs', JSON.stringify(previous.jobs));
    setCurrentBattery(previous.battery);
    localStorage.setItem('ebike_current_battery', previous.battery.toString());
    return true;
  };

  // Filtering for UI lists
  const filterList = (list: Job[]) => {
    return list.filter(j =>
      j.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.jobType.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const nextStopIndex = nextRouteAJob ? routeAJobs.findIndex(j => j.id === nextRouteAJob.id) : -1;
  const nextStopOrigin = nextStopIndex <= 0 ? startCoord : routeAJobs[nextStopIndex - 1].coordinates;
  const nextStopDistance = nextRouteAJob ? getDistanceInMiles(nextStopOrigin, nextRouteAJob.coordinates) : 0;
  const nextStopRideMinutes = nextRouteAJob ? Math.max(1, Math.round((nextStopDistance / ebikeConfig.avgSpeedMph) * 60)) : 0;
  const nextStopNavLink = nextRouteAJob
    ? `https://www.google.com/maps/dir/?api=1&origin=${nextStopOrigin.lat},${nextStopOrigin.lng}&destination=${nextRouteAJob.coordinates.lat},${nextRouteAJob.coordinates.lng}&travelmode=bicycling`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(startAddress)}`;
  const revisionAlertJobs = remainingRouteAJobs.filter(isRevisionJob);
  const routeProgressPct = routeAJobs.length > 0 ? Math.round((completedRouteAJobs.length / routeAJobs.length) * 100) : 100;
  const routeListStops = remainingRouteAJobs;
  const proofRecords = (Object.values(proofVault) as ProofRecord[]).sort((a, b) => new Date(b.completionTime).getTime() - new Date(a.completionTime).getTime());
  const selectedProofRecord = selectedProofJobId ? proofVault[selectedProofJobId] : null;
  const getRouteStopNavLink = (job: Job, idx: number) => {
    const origin = idx === 0
      ? startCoord
      : routeListStops[idx - 1]?.coordinates || startCoord;

    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${job.coordinates.lat},${job.coordinates.lng}&travelmode=bicycling`;
  };
  const dispatcherBrief = dispatcherMessage.length > 118 ? `${dispatcherMessage.slice(0, 115).trim()}...` : dispatcherMessage;
  const rideDistance = getRideDistance();
  const rideBatteryUsed = getEstimatedBatteryUsed();
  const rideAverageSpeed = trackerRideTime > 0 ? (rideDistance / (trackerRideTime / 3600)).toFixed(1) : '0.0';
  const rideEarned = completedRouteAJobs.reduce((sum, job) => sum + job.pay, 0);
  const rideEarningsPerHour = trackerTotalDayTime > 0 ? (rideEarned / (trackerTotalDayTime / 3600)).toFixed(2) : '0.00';
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

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-[#F5F5F7] text-slate-950 transition-colors duration-300 dark:bg-[#111113] dark:text-slate-100 font-sans">
        
        {/* Header */}
        {currentTab !== 'dashboard' && <Header theme={theme} onToggleTheme={handleToggleTheme} />}

        {/* Main Content Body */}
        <main className="mx-auto max-w-7xl px-4 py-5 pb-36 sm:px-6 lg:px-8 space-y-6">

          {/* Ride Mode V2: Distraction-free execution surface */}
          {currentTab === 'dashboard' && rideModeActive && (
            <div className="animate-fade-in space-y-4" id="ride-mode-v2">
              <div className="flex flex-col gap-3 rounded-[8px] border-4 border-slate-950 bg-slate-950 p-4 text-white dark:border-white sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-black uppercase tracking-widest text-emerald-300">Ride Mode V2</p>
                  <h2 className="text-5xl font-black leading-none tracking-tight sm:text-6xl">Execute Route</h2>
                </div>
                <button
                  type="button"
                  onClick={handleEndRideMode}
                  className="min-h-20 rounded-[8px] bg-rose-600 px-6 text-3xl font-black uppercase text-white shadow-lg transition hover:bg-rose-500"
                >
                  🏁 End Ride
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                <section className={`col-span-2 rounded-[8px] border-4 border-slate-950 bg-white p-4 shadow-lg transition-all duration-500 dark:border-white dark:bg-[#17181b] lg:col-span-4 ${nextRouteAJob && completingJobIds.includes(nextRouteAJob.id) ? 'scale-[0.99] border-emerald-500 bg-emerald-50 opacity-80' : ''}`}>
                  <p className="text-base font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Next Stop</p>
                  <h3 className="mt-2 truncate text-6xl font-black leading-none text-slate-950 dark:text-white">
                    {nextRouteAJob?.storeName || 'Route Clear'}
                  </h3>
                  <p className="mt-2 truncate text-2xl font-black text-slate-700 dark:text-slate-200">
                    {nextRouteAJob?.address || 'No active stop'}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <a
                      href={nextStopNavLink}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="flex min-h-24 items-center justify-center gap-3 rounded-[8px] bg-emerald-600 px-4 text-3xl font-black uppercase text-white shadow-lg transition hover:bg-emerald-500"
                    >
                      <Navigation size={34} />
                      <span>Navigate</span>
                    </a>
                    <button
                      type="button"
                      disabled={!nextRouteAJob || Boolean(nextRouteAJob && completingJobIds.includes(nextRouteAJob.id))}
                      onClick={() => nextRouteAJob && handleToggleComplete(nextRouteAJob.id)}
                      className="flex min-h-24 items-center justify-center gap-3 rounded-[8px] bg-blue-700 px-4 text-3xl font-black uppercase text-white shadow-lg transition hover:bg-blue-600 disabled:bg-emerald-600"
                    >
                      {nextRouteAJob && completingJobIds.includes(nextRouteAJob.id) ? <CheckCircle2 size={34} /> : <CheckSquare size={34} />}
                      <span>{nextRouteAJob && completingJobIds.includes(nextRouteAJob.id) ? 'Done' : 'Complete Job'}</span>
                    </button>
                  </div>
                </section>

                <section className="col-span-2 rounded-[8px] border-2 border-slate-300 bg-white p-4 dark:border-white/20 dark:bg-[#17181b] lg:col-span-2">
                  <h3 className="text-3xl font-black text-slate-950 dark:text-white">Current Route</h3>
                  <div className="mt-3 space-y-2">
                    {routeListStops.length === 0 ? (
                      <p className="rounded-[8px] bg-emerald-100 p-4 text-2xl font-black text-emerald-900">Route clear</p>
                    ) : routeListStops.map((job, idx) => (
                      <div key={job.id} className={`rounded-[8px] border-2 p-3 ${idx === 0 ? 'border-blue-700 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`flex h-11 w-11 items-center justify-center rounded-[8px] text-xl font-black ${idx === 0 ? 'bg-blue-700 text-white' : 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'}`}>{idx + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-2xl font-black leading-tight text-slate-950 dark:text-white">{job.storeName}</p>
                              <span className={`shrink-0 rounded-[8px] px-2 py-0.5 text-xs font-black uppercase ${getRouteBadgeClasses(job)}`}>
                                {getRouteBadgeLabel(job)}
                              </span>
                            </div>
                            <p className="truncate text-base font-black text-slate-600 dark:text-slate-300">{getStreetName(job.address)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[8px] bg-slate-950 p-4 text-white">
                  <p className="text-base font-black uppercase">Ride Timer</p>
                  <p className="mt-2 text-5xl font-black leading-none">{formatDuration(trackerTotalDayTime)}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-black uppercase">
                    <span>Ride {formatDuration(trackerRideTime)}</span>
                    <span>Store {formatDuration(trackerStoreTime)}</span>
                    <span>Used {rideBatteryUsed}%</span>
                  </div>
                </section>
                <section className="rounded-[8px] bg-blue-700 p-4 text-white">
                  <p className="text-base font-black uppercase">Jobs Left</p>
                  <p className="mt-2 text-5xl font-black leading-none">{remainingRouteAJobs.length}</p>
                </section>
                <section className="rounded-[8px] bg-emerald-600 p-4 text-white">
                  <p className="text-base font-black uppercase">Completed</p>
                  <p className="mt-2 text-5xl font-black leading-none">{completedRouteAJobs.length}</p>
                </section>
                <section className="rounded-[8px] bg-amber-400 p-4 text-slate-950">
                  <p className="text-base font-black uppercase">Distance</p>
                  <p className="mt-2 text-5xl font-black leading-none">{rideDistance}</p>
                  <p className="text-xl font-black">mi</p>
                </section>
                <section className="rounded-[8px] bg-white p-4 text-slate-950 dark:bg-white dark:text-slate-950">
                  <p className="text-base font-black uppercase">$/Hour</p>
                  <p className="mt-2 text-5xl font-black leading-none">${rideEarningsPerHour}</p>
                  <p className="text-xl font-black">{rideAverageSpeed} mph</p>
                </section>

                <section className="rounded-[8px] bg-slate-950 p-4 text-white">
                  <p className="text-base font-black uppercase">Earned</p>
                  <p className="mt-2 text-5xl font-black leading-none">${rideEarned.toFixed(0)}</p>
                  <p className="text-xl font-black">{trackerJobsCompleted.length} stops</p>
                </section>
              </div>
            </div>
          )}

          {/* Tab 1: Mission Control Dashboard */}
          {currentTab === 'dashboard' && !rideModeActive && (
            <div className="animate-fade-in" id="tab-view-dashboard">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Mission Control</p>
                  <h2 className="text-4xl font-black leading-none tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-4xl">
                    {nextRouteAJob ? 'Go to the next stop.' : 'Route complete.'}
                  </h2>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`hidden rounded-full px-4 py-2 text-base font-black uppercase sm:inline-flex ${reserveColorClass}`}>
                    {reserveLabel}
                  </span>
                  <button
                    type="button"
                    onClick={handleStartRideMode}
                    className="min-h-14 rounded-[8px] bg-slate-950 px-5 text-xl font-black uppercase text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 sm:min-h-16 sm:text-2xl"
                  >
                    🚴 I&apos;m Riding
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-6 lg:auto-rows-[minmax(128px,auto)]">
                <section className={`col-span-2 lg:col-span-4 lg:row-span-2 rounded-[8px] border-4 border-slate-950 bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.16)] transition-all duration-500 dark:border-white dark:bg-[#17181b] lg:p-3 ${nextRouteAJob && completingJobIds.includes(nextRouteAJob.id) ? 'scale-[0.99] border-emerald-500 bg-emerald-50 opacity-80 dark:bg-emerald-500/10' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-base font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Next Stop</p>
                      <h3 className="mt-2 truncate text-5xl font-black leading-none tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-4xl">
                        {nextRouteAJob?.storeName || 'All Clear'}
                      </h3>
                      <p className="mt-2 truncate text-xl font-black text-slate-700 dark:text-slate-200 lg:text-lg">
                        {nextRouteAJob?.address || 'No remaining stops'}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-[8px] bg-slate-950 px-4 py-3 text-right text-white dark:bg-white dark:text-slate-950">
                      <p className="text-sm font-black uppercase">Pay</p>
                      <p className="text-3xl font-black">${(nextRouteAJob?.pay || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-[8px] bg-blue-700 p-4 text-white lg:p-2">
                      <p className="text-sm font-black uppercase">Distance</p>
                      <p className="mt-1 text-4xl font-black lg:text-2xl">{nextStopDistance.toFixed(1)} mi</p>
                    </div>
                    <div className="rounded-[8px] bg-amber-400 p-4 text-slate-950 lg:p-2">
                      <p className="text-sm font-black uppercase">Ride</p>
                      <p className="mt-1 text-4xl font-black lg:text-2xl">{nextStopRideMinutes} min</p>
                    </div>
                    <div className="rounded-[8px] bg-slate-950 p-4 text-white dark:bg-white dark:text-slate-950 lg:p-2">
                      <p className="text-sm font-black uppercase">Due</p>
                      <p className="mt-1 truncate text-3xl font-black lg:text-2xl">{nextRouteAJob?.dueTime || 'Flex'}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <a
                      href={nextStopNavLink}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="flex min-h-20 items-center justify-center gap-3 rounded-[8px] bg-emerald-600 px-5 text-2xl font-black uppercase text-white shadow-lg transition hover:bg-emerald-500 lg:min-h-14 lg:text-xl"
                    >
                      <Navigation size={30} />
                      <span>Navigate</span>
                      <ExternalLink size={20} />
                    </a>
                    <button
                      type="button"
                      disabled={!nextRouteAJob || Boolean(nextRouteAJob && completingJobIds.includes(nextRouteAJob.id))}
                      onClick={() => nextRouteAJob && handleToggleComplete(nextRouteAJob.id)}
                      className="flex min-h-20 items-center justify-center gap-3 rounded-[8px] bg-blue-700 px-5 text-2xl font-black uppercase text-white shadow-lg transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 lg:min-h-14 lg:text-xl"
                    >
                      {nextRouteAJob && completingJobIds.includes(nextRouteAJob.id) ? <CheckCircle2 size={30} /> : <CheckSquare size={30} />}
                      <span>{nextRouteAJob && completingJobIds.includes(nextRouteAJob.id) ? 'Completed' : 'Complete Job'}</span>
                    </button>
                  </div>
                </section>

                <section className="col-span-2 lg:col-span-2 lg:row-span-2 rounded-[8px] border-2 border-slate-300 bg-white p-4 dark:border-white/20 dark:bg-[#17181b] lg:p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-slate-950 dark:text-white">Today&apos;s Route</h3>
                    <span className="rounded-[8px] bg-blue-700 px-3 py-1 text-lg font-black text-white">{remainingRouteAJobs.length}</span>
                  </div>
                  <div className="mt-3 max-h-[620px] space-y-1.5 overflow-y-auto pr-1">
                    {routeListStops.length === 0 ? (
                      <div className="rounded-[8px] bg-emerald-100 p-4 text-xl font-black text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100">
                        Route clear
                      </div>
                    ) : (
                      routeListStops.map((job, idx) => {
                        const isRevision = isRevisionJob(job);
                        const isServe = isProcessServeJob(job);
                        const isCurrentStop = idx === 0;
                        const routeStopNavLink = getRouteStopNavLink(job, idx);
                        return (
                          <React.Fragment key={job.id}>
                            <div className={`rounded-[8px] border-2 p-2 transition-all duration-500 ${completingJobIds.includes(job.id) ? 'scale-[0.98] border-emerald-500 bg-emerald-100 opacity-0 -translate-y-2 dark:bg-emerald-500/20' : ''} ${isCurrentStop ? 'border-blue-700 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]'}`}>
                              <div className="flex items-start gap-2">
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-lg font-black ${isCurrentStop ? 'bg-blue-700 text-white' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'}`}>
                                  {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-lg font-black leading-tight text-slate-950 dark:text-white lg:text-base">{job.storeName}</p>
                                    {isRevision && (
                                      <span className="shrink-0 rounded-[8px] bg-rose-600 px-2 py-0.5 text-sm font-black uppercase text-white">
                                        Revision
                                      </span>
                                    )}
                                    {isServe && (
                                      <span className="shrink-0 rounded-[8px] bg-red-600 px-2 py-0.5 text-sm font-black uppercase text-white">
                                        Process Serve
                                      </span>
                                    )}
                                  </div>
                                  <p className="truncate text-base font-black text-slate-600 dark:text-slate-300 lg:text-sm">{getStreetName(job.address)}</p>
                                  {isServe && (
                                    <p className="mt-1 text-sm font-black leading-tight text-red-700 dark:text-red-300">
                                      Time-sensitive serve. Proof folder will be created on completion.
                                    </p>
                                  )}
                                  {isRevision && job.smartMergeExplanation && (
                                    <p className="mt-1 text-sm font-black leading-tight text-rose-700 dark:text-rose-300">
                                      {job.smartMergeExplanation}
                                    </p>
                                  )}
                                  {isCurrentStop && (
                                    <p className="mt-0.5 text-sm font-black uppercase text-blue-700 dark:text-blue-300">Current Stop</p>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 grid grid-cols-3 gap-1.5">
                                <a
                                  href={routeStopNavLink}
                                  target="_blank"
                                  referrerPolicy="no-referrer"
                                  className="flex min-h-11 items-center justify-center gap-1 rounded-[8px] bg-emerald-600 px-2 text-sm font-black uppercase text-white transition hover:bg-emerald-500"
                                  title={`Navigate to ${job.storeName}`}
                                  aria-label={`Navigate to ${job.storeName}`}
                                >
                                  <Navigation size={16} />
                                  <span>Navigate</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleToggleComplete(job.id)}
                                  disabled={completingJobIds.includes(job.id)}
                                  className="flex min-h-11 items-center justify-center gap-1 rounded-[8px] bg-blue-700 px-2 text-sm font-black uppercase text-white transition hover:bg-blue-600 disabled:bg-emerald-600"
                                  title={`Complete ${job.storeName}`}
                                  aria-label={`Complete ${job.storeName}`}
                                >
                                  <CheckSquare size={16} />
                                  <span>Complete</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveJobRoute(job.id, 'B')}
                                  className="flex min-h-11 items-center justify-center gap-1 rounded-[8px] bg-amber-400 px-2 text-sm font-black uppercase text-slate-950 transition hover:bg-amber-300"
                                  title={`Move ${job.storeName}`}
                                  aria-label={`Move ${job.storeName}`}
                                >
                                  <ArrowRightLeft size={16} />
                                  <span>Move</span>
                                </button>
                              </div>
                            </div>
                            {idx < routeListStops.length - 1 && (
                              <div className="flex justify-center text-2xl font-black leading-none text-slate-400 dark:text-slate-500" aria-hidden="true">
                                ↓
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className={`col-span-1 rounded-[8px] border-2 p-4 lg:p-3 ${batteryToneClass}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black uppercase">Battery Status</p>
                    <Battery size={24} />
                  </div>
                  <p className="mt-3 text-5xl font-black leading-none lg:text-4xl">{batteryTrackerCurrent}%</p>
                  <p className="mt-2 text-base font-black uppercase">{estimatedMilesRemaining} mi left</p>
                  <div className="mt-3 space-y-1 text-sm font-black uppercase">
                    <p>Risk: {batteryRisk}</p>
                    <p>Finish: {canFinishRoute ? 'Yes' : 'No'}</p>
                    <p>Recharge: {rechargeRecommended ? 'Yes' : 'No'}</p>
                  </div>
                </section>

                <section className="col-span-1 rounded-[8px] border-2 border-blue-300 bg-blue-50 p-4 text-blue-950 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100 lg:p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black uppercase">Jobs Left</p>
                    <CheckSquare size={24} />
                  </div>
                  <p className="mt-3 text-5xl font-black leading-none lg:text-4xl">{remainingRouteAJobs.length}</p>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/80 dark:bg-white/10">
                    <div className="h-full rounded-full bg-blue-700" style={{ width: `${routeProgressPct}%` }} />
                  </div>
                </section>

                <section className="col-span-2 rounded-[8px] border-2 border-emerald-300 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100 lg:col-span-2 lg:p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black uppercase">{earningsTileTitle}</p>
                    <DollarSign size={24} />
                  </div>
                  <p className="mt-3 text-5xl font-black leading-none lg:text-4xl">${earningsTileAmount.toFixed(2)}</p>
                  <p className="mt-2 text-base font-black uppercase">{earningsTileFooter}</p>
                </section>

                <section className="col-span-2 lg:col-span-3 rounded-[8px] border-2 border-slate-300 bg-white p-4 dark:border-white/20 dark:bg-[#17181b] lg:p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-[8px] bg-blue-700 p-3 text-white">
                      <Sparkles size={26} />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase text-blue-700 dark:text-blue-300">AI Dispatcher Message</p>
                      <p className="text-2xl font-black text-slate-950 dark:text-white lg:text-xl">{dispatcherBrief}</p>
                    </div>
                  </div>
                </section>

                <section className={`col-span-2 lg:col-span-3 rounded-[8px] border-2 p-4 lg:p-3 ${revisionAlertJobs.length > 0 ? 'border-rose-400 bg-rose-50 text-rose-950 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100' : 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={28} />
                      <div>
                        <p className="text-sm font-black uppercase">Revision Alerts</p>
                        <p className="text-2xl font-black">{revisionAlertJobs.length > 0 ? `${revisionAlertJobs.length} needs attention` : 'No revisions'}</p>
                      </div>
                    </div>
                    {revisionAlertJobs[0] && (
                      <span className="max-w-[45%] truncate rounded-[8px] bg-rose-600 px-3 py-2 text-base font-black text-white">
                        {revisionAlertJobs[0].storeName}
                      </span>
                    )}
                  </div>
                </section>
              </div>

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
                      const nextStopNavLink = `https://www.google.com/maps/dir/?api=1&origin=${prevCoordForNextStop.lat},${prevCoordForNextStop.lng}&destination=${nextStop.coordinates.lat},${nextStop.coordinates.lng}&travelmode=bicycling`;

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
                              onClick={() => handleToggleComplete(nextStop.id)}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-black transition-all shadow-md cursor-pointer"
                            >
                              <CheckSquare size={14} />
                              <span>COMPLETE JOB</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

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
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-600 dark:bg-white/10 dark:text-slate-200">
                      {remainingRouteAJobs.length} left
                    </span>
                  </div>

                  {remainingRouteAJobs.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-emerald-200/70 bg-emerald-50 p-6 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
                      <p className="mt-3 text-xl font-black text-slate-900 dark:text-white">Route Clear</p>
                      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">All Route A jobs are complete.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto pr-1 lg:max-h-[430px]">
                      {remainingRouteAJobs.map((job, idx) => {
                        const isNext = job.id === nextRouteAJob?.id;
                        const prevJob = idx === 0 ? null : remainingRouteAJobs[idx - 1];
                        const origin = idx === 0
                          ? startCoord
                          : prevJob?.coordinates || startCoord;
                        const navLink = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${job.coordinates.lat},${job.coordinates.lng}&travelmode=bicycling`;

                        return (
                          <div
                            key={job.id}
                            className={`rounded-2xl border p-2.5 transition-all ${
                              isNext
                                ? 'border-indigo-300 bg-indigo-50 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/10'
                                : 'border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-white/[0.04]'
                            }`}
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
                                  onClick={() => handleToggleComplete(job.id)}
                                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-950 sm:w-auto sm:px-2.5"
                                  title={`Complete ${job.storeName}`}
                                  aria-label={`Complete ${job.storeName}`}
                                >
                                  <CheckSquare size={16} />
                                  <span className="ml-1.5 hidden text-[10px] font-black uppercase sm:inline">Done</span>
                                </button>
                                <a
                                  href={navLink}
                                  target="_blank"
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
                                  onClick={() => handleMoveJobRoute(job.id, 'B')}
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
                {/* 7. Short Dispatcher Message — compact dashboard tile */}
                <div id="bento-tile-dispatcher-message" className="col-span-2 lg:col-span-4 road-card p-6 space-y-3 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      <Sparkles size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase text-slate-500 tracking-wide dark:text-slate-400">Dispatcher</h3>
                      <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Field Message</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold leading-snug text-slate-700 dark:text-slate-200">
                    {dispatcherMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Route Navigation Itinerary */}
          {currentTab === 'route' && (
            <div className="space-y-6 animate-fade-in" id="tab-view-route">
              {/* Pluggable Routing Engine Selector & Active Status banner */}
              <div className="road-card p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                      <Sparkles size={18} className="text-indigo-500 " />
                      <span>Dynamic Sequence Optimizer</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                      Real-time nearest-neighbor sequencing with six strict priority rules. Prioritizes: 
                      <span className="font-bold text-rose-500 dark:text-rose-400"> 1. Revisions </span> → 
                      <span className="font-bold text-amber-500 dark:text-amber-400"> 2. Deadlines </span> → 
                      <span className="font-bold text-blue-500"> 3. Closeness </span> → 
                      <span className="font-bold text-emerald-500"> 4. Pay </span> → 

                      <span className="font-bold text-slate-500"> 5. Outliers last</span>.
                    </p>
                  </div>
                  
                  {/* Engine Selection pill selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Routing Provider</label>
                    <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl dark:bg-white/5 border border-slate-200/50 dark:border-white/10 gap-1">
                      {[
                        { id: 'mock', label: 'Mock Engine' },
                        { id: 'google', label: 'Google Maps' },
                        { id: 'apple', label: 'Apple Maps' },
                        { id: 'osrm', label: 'OSRM' },
                        { id: 'mapbox', label: 'Mapbox' }
                      ].map((eng) => (
                        <button
                          key={eng.id}
                          onClick={() => handleSelectEngine(eng.id as any)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all ${
                            selectedEngine === eng.id
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/5'
                          }`}
                        >
                          {eng.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {engineNotification && (
                  <div className="bg-indigo-50 border border-indigo-200/50 dark:bg-indigo-950/20 dark:border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2 animate-fade-in">
                    <Info size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                    <span>{engineNotification}</span>
                  </div>
                )}
              </div>

              {/* Next Stop Hero and Metrics Overview Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* NEXT STOP CARD */}
                <div className="md:col-span-1 rounded-2xl border border-slate-200 bg-white p-5  flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Navigation size={10} className="" />
                        <span>Next Target stop</span>
                      </span>
                      {routeAJobs.find(j => !isJobDone(j)) && (
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          Stop #{routeAJobs.indexOf(routeAJobs.find(j => !isJobDone(j))!) + 1} of {routeAJobs.length}
                        </span>
                      )}
                    </div>

                    {(() => {
                      const nextStop = routeAJobs.find(j => !isJobDone(j));
                      if (!nextStop) {
                        return (
                          <div className="py-6 text-center space-y-2">
                            <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
                            <h4 className="font-extrabold text-slate-800 dark:text-white text-sm">All Stops Completed!</h4>
                            <p className="text-xs text-slate-400">Great job. Return safely back to the Starting Hub.</p>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(startAddress)}`}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline cursor-pointer"
                            >
                              <span>Navigate back to Hub</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        );
                      }

                      const nextStopIdx = routeAJobs.indexOf(nextStop);
                      const prevCoordForNextStop = nextStopIdx <= 0 ? startCoord : routeAJobs[nextStopIdx - 1].coordinates;
                      const prevNameForNextStop = nextStopIdx <= 0 ? "Starting Hub" : routeAJobs[nextStopIdx - 1].storeName;
                      const nextStopDist = getDistanceInMiles(prevCoordForNextStop, nextStop.coordinates);
                      const nextStopRideMin = (nextStopDist / ebikeConfig.avgSpeedMph) * 60;
                      const nextStopNavLink = `https://www.google.com/maps/dir/?api=1&origin=${prevCoordForNextStop.lat},${prevCoordForNextStop.lng}&destination=${nextStop.coordinates.lat},${nextStop.coordinates.lng}&travelmode=bicycling`;

                      return (
                        <div className="space-y-3 pt-1">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-black text-slate-900 dark:text-white text-base truncate">{nextStop.storeName}</h4>
                              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">${nextStop.pay.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{nextStop.address}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 p-3 rounded-xl">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Est. Distance</span>
                              <p className="text-xs font-black text-slate-800 dark:text-white">{nextStopDist.toFixed(1)} miles</p>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Travel Time</span>
                              <p className="text-xs font-black text-slate-800 dark:text-white">~{nextStopRideMin.toFixed(0)} mins</p>
                            </div>
                            <div className="mt-1.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Store Work Time</span>
                              <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">{nextStop.estimatedMinutes} mins</p>
                            </div>
                            <div className="mt-1.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Due Time</span>
                              <p className="text-xs font-black text-amber-500">{nextStop.dueTime || 'Flexible'}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {isRevisionJob(nextStop) && (
                              <span className="bg-rose-50 border border-rose-200/60 text-rose-600 dark:bg-rose-950/20 dark:border-rose-500/20 dark:text-rose-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                                Revision Required
                              </span>
                            )}
                            {nextStop.dueTime && (
                              <span className="bg-amber-50 border border-amber-200/60 text-amber-600 dark:bg-amber-950/20 dark:border-amber-500/20 dark:text-amber-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                                Deadline Priority
                              </span>
                            )}
                            {outlierIds.includes(nextStop.id) && (
                              <span className="bg-slate-50 border border-slate-200/60 text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-slate-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                                Outlier
                              </span>
                            )}
                          </div>

                          <a
                            href={nextStopNavLink}
                            target="_blank"
                            referrerPolicy="no-referrer"
                            className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
                          >
                            <Compass size={14} />
                            <span>One-Tap Nav to Next Stop</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ROUTE METRICS CARD */}
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-5  flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                        Route A Financials & Metrics
                      </span>
                      <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400">Optimized Map Bounds</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 p-3 rounded-xl text-center space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Pay</span>
                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">${activeMetrics.totalPay.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 p-3 rounded-xl text-center space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Est. Ride Time</span>
                        <p className="text-lg font-black text-slate-800 dark:text-white">~{activeMetrics.totalRideTime.toFixed(0)}m</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 p-3 rounded-xl text-center space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Est. Work Time</span>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{activeMetrics.totalWorkTime.toFixed(0)}m</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 p-3 rounded-xl text-center space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Distance</span>
                        <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{activeMetrics.totalDistance.toFixed(1)} mi</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 p-3 rounded-xl text-center space-y-0.5 col-span-2 sm:col-span-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Hourly Yield</span>
                        <p className="text-lg font-black text-amber-500">${activeMetrics.earningsPerHour.toFixed(2)}/h</p>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 italic text-center">
                    </p>
                  </div>

                  {routeAJobs.length > 0 ? (
                    <a
                      href={routeAJobs.length > 0 
                        ? `https://www.google.com/maps/dir/?api=1&origin=${startCoord.lat},${startCoord.lng}&destination=${routeAJobs[routeAJobs.length - 1].coordinates.lat},${routeAJobs[routeAJobs.length - 1].coordinates.lng}&waypoints=${routeAJobs.slice(0, -1).map(j => `${j.coordinates.lat},${j.coordinates.lng}`).join('|')}&travelmode=bicycling`
                        : '#'}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer mt-2"
                    >
                      <ExternalLink size={14} />
                      <span>One-Tap Full Route Navigation (Google Maps Multi-Stop)</span>
                    </a>
                  ) : (
                    <div className="w-full bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 text-center py-3 rounded-xl text-xs font-extrabold border border-dashed border-slate-200 dark:border-white/10 mt-2">
                      Please add jobs to active Route A to initialize navigation link
                    </div>
                  )}
                </div>
              </div>

              {/* Grid: Map left/top, timeline stop details right/bottom */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 ">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">Road Navigation Map</h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">GEOGRAPHIC DISPATCH BOUNDS FOR BAKERSFIELD, CA</p>
                      </div>
                      <div className="flex bg-slate-100 p-0.5 rounded-lg dark:bg-white/5 border border-slate-200/50 dark:border-white/10">
                        <button
                          onClick={() => setActiveTab('A')}
                          className={`rounded-md px-2.5 py-1 text-[10px] font-extrabold transition-all ${
                            activeTab === 'A'
                              ? 'bg-white text-slate-950 shadow-xs dark:bg-white/10 dark:text-white'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                          }`}
                        >
                          Active (A)
                        </button>
                        <button
                          onClick={() => setActiveTab('B')}
                          className={`rounded-md px-2.5 py-1 text-[10px] font-extrabold transition-all ${
                            activeTab === 'B'
                              ? 'bg-white text-slate-950 shadow-xs dark:bg-white/10 dark:text-white'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                          }`}
                        >
                          Standby (B)
                        </button>
                      </div>
                    </div>
                    {/* Bakersfield SVG Geographic Route Visualization map */}
                    <BakersfieldMapPreview
                      startAddress={startAddress}
                      startCoord={startCoord}
                      routeAJobs={routeAJobs}
                      routeBJobs={routeBJobs}
                      outlierIds={outlierIds}
                      activeTab={activeTab}
                      onSelectJob={(id) => {
                        const targetJob = jobs.find(j => j.id === id);
                        if (targetJob) {
                          handleOpenEditModal(targetJob);
                        }
                      }}
                      onGoogleMetrics={setGoogleMetrics}
                      isOptimizing={isOptimizing}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="road-card p-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                        <Map size={15} className="text-indigo-500" />
                        <span>Itinerary Stop Sequence</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
                        {activeTab === 'A' ? `Route A Active Sequence (${routeAJobs.length})` : `Route B Standby stops (${routeBJobs.length})`}
                      </p>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4">
                      {/* Starting Hub node */}
                      <div className="relative flex items-start gap-4 pb-4">
                        <div className="absolute left-[14px] top-7 bottom-0 w-0.5 bg-indigo-500/20 dark:bg-white/10" />
                        <div className="z-10 flex h-7.5 w-7.5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-extrabold text-[10px] shadow-sm">
                          START
                        </div>
                        <div className="flex-1 min-w-0 bg-indigo-500/[0.02] border border-indigo-200/55 dark:border-indigo-500/10 p-3 rounded-xl">
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">Hub Home Starting Location</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{startAddress}</p>
                        </div>
                      </div>

                      {/* Stops list */}
                      {activeTab === 'A' && routeAJobs.map((job, idx) => {
                        const prevCoord = idx === 0 ? startCoord : routeAJobs[idx - 1].coordinates;
                        const dist = getDistanceInMiles(prevCoord, job.coordinates);
                        const rideMin = (dist / ebikeConfig.avgSpeedMph) * 60;
                        const singleLegNavLink = `https://www.google.com/maps/dir/?api=1&origin=${prevCoord.lat},${prevCoord.lng}&destination=${job.coordinates.lat},${job.coordinates.lng}&travelmode=bicycling`;
                        return (
                          <div key={job.id} className="relative flex items-start gap-4 pb-4 last:pb-0">
                            {idx < routeAJobs.length - 1 && (
                              <div className="absolute left-[14px] top-7 bottom-0 w-0.5 bg-indigo-500/20 dark:bg-white/10" />
                            )}
                            <div className="z-10 flex h-7.5 w-7.5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-extrabold text-xs shadow-sm">
                              {idx + 1}
                            </div>
                            <div className={`flex-1 min-w-0 border p-3.5 rounded-xl space-y-1.5 hover:border-slate-300 dark:hover:border-white/10 transition-all ${
                              isJobDone(job)
                                ? 'bg-slate-50/70 border-slate-200 dark:bg-white/[0.02] dark:border-white/5 opacity-70'
                                : isRevisionJob(job)
                                ? 'bg-rose-500/[0.02] border-rose-200/60 dark:border-rose-500/15'
                                : 'bg-slate-500/[0.01] border-slate-200 dark:border-white/5'
                            }`}>
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isJobDone(job)}
                                  onChange={() => handleToggleComplete(job.id)}
                                  className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/10 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <h4 className={`font-extrabold text-xs truncate ${isJobDone(job) ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>{job.storeName}</h4>
                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">${job.pay.toFixed(2)}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate mt-0.5">{job.address}</p>
                                  
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {isRevisionJob(job) && (
                                      <span className="bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-500/20 dark:text-rose-400 text-[8px] font-black uppercase px-1.5 py-0.2 rounded">
                                        Revision Required
                                      </span>
                                    )}
                                    {job.dueTime && (
                                      <span className="bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-500/20 dark:text-amber-400 text-[8px] font-black uppercase px-1.5 py-0.2 rounded">
                                        Deadline
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5 mt-2">
                                    <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-black uppercase text-slate-400">
                                      <span className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-sm">
                                        {getJobTypeLabel(job)}
                                      </span>
                                      <span>•</span>
                                      <span className="text-indigo-600 dark:text-indigo-400">{dist.toFixed(1)} MI (~{rideMin.toFixed(0)} MINS)</span>
                                    </div>
                                    <a
                                      href={singleLegNavLink}
                                      target="_blank"
                                      referrerPolicy="no-referrer"
                                      className="text-[10px] font-extrabold text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5 hover:underline cursor-pointer"
                                    >
                                      <span>Nav</span>
                                      <ExternalLink size={10} />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {activeTab === 'B' && routeBJobs.map((job, idx) => (
                        <div key={job.id} className="relative flex items-start gap-4 pb-4 last:pb-0">
                          <div className="z-10 flex h-7.5 w-7.5 flex-shrink-0 items-center justify-center rounded-full bg-slate-400 text-white font-extrabold text-xs shadow-sm">
                            S
                          </div>
                          <div className="flex-1 min-w-0 bg-slate-500/[0.01] border border-slate-200 dark:border-white/5 p-3.5 rounded-xl space-y-1 hover:border-slate-300 dark:hover:border-white/10 transition-colors">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-extrabold text-slate-900 dark:text-white text-xs truncate">{job.storeName}</h4>
                              <span className="text-xs font-black text-slate-500">${job.pay.toFixed(2)}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate">{job.address}</p>
                            <span className="inline-block bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-sm text-[9px] font-black uppercase text-slate-400">
                              {getJobTypeLabel(job)}
                            </span>
                          </div>
                        </div>
                      ))}

                      {activeTab === 'A' && routeAJobs.length === 0 && (
                        <p className="text-xs text-slate-400 italic text-center py-6">No stops registered in active sequence</p>
                      )}
                      {activeTab === 'B' && routeBJobs.length === 0 && (
                        <p className="text-xs text-slate-400 italic text-center py-6">No stops shelved in Route B standby</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Back-Office Operational Controls & Dispatch Console */}
                <div className="border-t border-slate-200 dark:border-white/5 pt-8 mt-8 space-y-6">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                      <Sliders size={18} className="text-indigo-500" />
                      <span>Route Analytics & Dispatch Controls</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      Advanced geo-spatial analysis, outlier mitigation, and real-time dispatcher agent commands.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Geographic Outlier Guard */}
                    <div className="road-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ShieldAlert size={18} className="text-amber-500" />
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Geographic Outlier Guard</h4>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                          {outliersReport.length} Detected
                        </span>
                      </div>
                      <OutlierDetector
                        outliers={outliersReport}
                        onMoveToRouteB={handleQuickMoveToB}
                      />
                    </div>

                    {/* 1-Click Sequence Optimization Trigger */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5  space-y-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Sparkles size={18} className="text-indigo-500 " />
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Instant Sequence Optimizer</h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-sans">
                          Instantly recalculates the dynamic nearest-neighbor path starting from your current coordinates, accounting for deadlines, high pay, and route clustering.
                        </p>
                      </div>

                      <button
                        onClick={handleOptimizeRouteSequence}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
                      >
                        <Play size={14} className="fill-white" />
                        <span>OPTIMIZE SEQUENCE NOW</span>
                      </button>
                    </div>
                  </div>

                  {/* Operations Console */}
                  <div className="road-card p-6">
                    <AIDispatcher
                      jobs={jobs}
                      routeAJobs={routeAJobs}
                      routeBJobs={routeBJobs}
                      activeMetrics={activeMetrics}
                      ebikeConfig={ebikeConfig}
                      outlierIds={outlierIds}
                      onOptimizeRoute={handleOptimizeRouteSequence}
                      onMoveJobRoute={handleMoveJobRoute}
                      onAddJobClick={handleOpenAddModal}
                      onResetSeeds={handleResetSeeds}
                      lastOptimizationLog={lastOptimizationLog}
                      isOptimizing={isOptimizing}
                      onExecuteAction={handleExecuteDispatcherAction}
                      onUndoAction={handleUndoLastAction}
                      canUndo={historyStack.length > 0}
                      currentBattery={currentBattery}
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab 3: Jobs Management */}
          {currentTab === 'jobs' && (
            <div className="space-y-6 animate-fade-in" id="tab-view-jobs">
              {/* Sub-Tabs Selector */}
              <div className="flex border-b border-slate-200 dark:border-white/5">
                <button
                  onClick={() => setJobsSubTab('list')}
                  className={`px-5 py-3 text-xs font-black tracking-wider uppercase border-b-2 transition-all ${
                    jobsSubTab === 'list'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  Active Stops List ({jobs.length})
                </button>
                <button
                  onClick={() => setJobsSubTab('import')}
                  className={`px-5 py-3 text-xs font-black tracking-wider uppercase border-b-2 transition-all flex items-center gap-1.5 ${
                    jobsSubTab === 'import'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Sparkles size={13} className="text-blue-500 " />
                  <span>Secure Import</span>
                </button>
              </div>

              {jobsSubTab === 'import' ? (
                <div className="animate-fade-in">
                  <JobImportSystem onImportJobs={(newJobs) => {
                    handleImportJobs(newJobs);
                    setJobsSubTab('list');
                  }} isOptimizing={isOptimizing} />
                </div>
              ) : (
                <>
                  {/* Controls and filtering bar */}
                  <div className="road-card p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      
                      {/* Route Selector tabs */}
                      <div className="flex bg-slate-100 p-1 rounded-xl dark:bg-white/5 border border-slate-200/50 dark:border-white/10">
                        <button
                          id="tab-route-a"
                          onClick={() => setActiveTab('A')}
                          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-black transition-all ${
                            activeTab === 'A'
                              ? 'bg-white text-slate-950 shadow-xs dark:bg-white/10 dark:text-white'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                          }`}
                        >
                          <Layers size={13} className="text-emerald-500" />
                          <span>Route A Active ({routeAJobs.length})</span>
                        </button>
                        <button
                          id="tab-route-b"
                          onClick={() => setActiveTab('B')}
                          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-black transition-all ${
                            activeTab === 'B'
                              ? 'bg-white text-slate-950 shadow-xs dark:bg-white/10 dark:text-white'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                          }`}
                        >
                          <Layers size={13} className="text-slate-500" />
                          <span>Route B Standby ({routeBJobs.length})</span>
                        </button>
                        <button
                          id="tab-route-all"
                          onClick={() => setActiveTab('all')}
                          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-black transition-all ${
                            activeTab === 'all'
                              ? 'bg-white text-slate-950 shadow-xs dark:bg-white/10 dark:text-white'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                          }`}
                        >
                          <span>All stops ({jobs.length})</span>
                        </button>
                      </div>

                      {/* Actions row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {activeTab === 'A' && routeAJobs.length > 1 && (
                          <button
                            id="optimize-route-btn"
                            onClick={handleOptimizeRouteSequence}
                            className="road-action bg-blue-600 text-white shadow-md hover:bg-blue-500"
                            title="Optimize sequence using sequential greedy nearest neighbor"
                          >
                            <Play size={12} className="fill-white " />
                            <span>Optimize Sequence</span>
                          </button>
                        )}
                        <button
                          id="add-job-btn"
                          onClick={handleOpenAddModal}
                          className="road-action border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          <Plus size={13} />
                          <span>Add Stop Details</span>
                        </button>
                        <button
                          id="add-process-serve-btn"
                          onClick={handleOpenProcessServeModal}
                          className="road-action bg-red-600 text-white shadow-md hover:bg-red-500"
                        >
                          <Briefcase size={13} />
                          <span>Add Process Serve</span>
                        </button>
                      </div>
                    </div>

                    {/* Search input field */}
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Search size={14} />
                      </span>
                      <input
                        id="search-input"
                        type="text"
                        placeholder="Search by store name, address, or task type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="road-input w-full pl-10 pr-4"
                      />
                    </div>
                  </div>

                  {/* Jobs List Grid */}
                  <div className="space-y-4">
                    {(() => {
                      const activeList = activeTab === 'A' ? routeAJobs : activeTab === 'B' ? routeBJobs : jobs;
                      const filtered = filterList(activeList);

                      if (filtered.length === 0) {
                        return (
                          <div id="empty-state-panel" className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-white/5 dark:bg-[#1C1C1E]">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 dark:bg-white/5">
                              <CheckSquare size={24} />
                            </div>
                            <h4 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">No registered stops match filters</h4>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {searchQuery ? 'Try adjusting your search query terms' : `No stops found in Route ${activeTab}`}
                            </p>
                            {!searchQuery && (
                              <button
                                id="empty-add-btn"
                                onClick={handleOpenAddModal}
                                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500"
                              >
                                Add New Stop
                              </button>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                          {filtered.map((job) => (
                            <JobCard
                              key={job.id}
                              job={job}
                              isOutlier={outlierIds.includes(job.id)}
                              onToggleComplete={handleToggleComplete}
                              onEdit={handleOpenEditModal}
                              onDelete={handleDeleteJob}
                              onDuplicate={handleDuplicateJob}
                              onToggleRoute={handleToggleRoute}
                              onUpdateStatus={handleUpdateJobStatus}
                            />
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab 4: Battery Safety Parameters */}
          {currentTab === 'battery' && (
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
                    <p className="text-3xl font-black">{formatDuration(trackerRideTime)}</p>
                  </div>
                  <div className="rounded-[8px] bg-white/70 p-4 dark:bg-black/20">
                    <p className="text-sm font-black uppercase opacity-70">Store Time</p>
                    <p className="text-3xl font-black">{formatDuration(trackerStoreTime)}</p>
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
          {currentTab === 'tracker' && (
            <div className="space-y-6 animate-fade-in" id="tab-view-tracker">
              {trackerStatus === 'completed' ? (
                <EndOfDaySummary
                  completedJobs={jobs.filter(j => j.routeId === 'A' && isJobDone(j))}
                  remainingJobs={jobs.filter(j => j.routeId === 'A' && !isJobDone(j))}
                  totalMoneyEarned={jobs.filter(j => j.routeId === 'A' && isJobDone(j)).reduce((sum, j) => sum + j.pay, 0)}
                  rideTime={trackerRideTime}
                  storeTime={trackerStoreTime}
                  batteryUsed={Math.max(0, trackerStartBattery - currentBattery)}
                  distance={parseFloat(((trackerRideTime / 3600) * ebikeConfig.avgSpeedMph).toFixed(1))}
                  ebikeConfig={ebikeConfig}
                  jobsMovedToTomorrow={jobs.filter(j => jobsMovedToTomorrowIds.includes(j.id))}
                  onMoveUnfinishedToTomorrow={handleMoveUnfinishedToTomorrow}
                  onResetTracker={handleResetActiveTracker}
                />
              ) : (
                <>
                  {/* Header and Telemetry */}
              <div className="road-card p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Timer className={`w-6 h-6 ${trackerStatus === 'riding' ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Active Ride Telemetry Tracker</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Differentiate active ride tracking from store visits to calibrate real-world range.</p>
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center gap-3">
                    {(() => {
                      let bg = 'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300';
                      let label = 'IDLE / READY';
                      if (trackerStatus === 'riding') {
                        bg = 'bg-blue-500/10 text-blue-500 border border-blue-500/20 ';
                        label = 'TRACKING ACTIVE RIDE';
                      } else if (trackerStatus === 'at_store') {
                        bg = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                        label = 'BIKE OFF • PAUSED IN STORE';
                      } else if (trackerStatus === 'completed') {
                        bg = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                        label = 'DAY COMPLETE • SAVED';
                      }
                      return (
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 ${bg}`}>
                          {trackerStatus === 'riding' && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 " />}
                          {label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Grid of Main Tracking Controls and Statistics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left/Middle Column: Tracking Controls & Live Telemetry */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* MAIN CONTROLS CARD */}
                  <div className="road-card p-6 space-y-6">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Tracking Commands</h3>
                    
                    {/* BUTTON MATRIX */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Button 1: Start Ride */}
                      <button
                        onClick={() => {
                          setTrackerStatus('riding');
                          setTrackerStartBattery(currentBattery);
                          setTrackerRideTime(0);
                          setTrackerStoreTime(0);
                          setTrackerTotalDayTime(0);
                          setTrackerJobsCompleted([]);
                          setJobsMovedToTomorrowIds([]);
                          localStorage.removeItem('jobs_moved_to_tomorrow');
                        }}
                        disabled={trackerStatus === 'riding'}
                        className={`road-action-lg ${
                          trackerStatus === 'riding'
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 cursor-not-allowed opacity-50'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/15'
                        }`}
                      >
                        <Play size={18} className="fill-white" />
                        <span>Start Ride</span>
                      </button>

                      {/* Button 2: Arrived at Store */}
                      <button
                        onClick={() => setTrackerStatus('at_store')}
                        disabled={trackerStatus !== 'riding'}
                        className={`road-action-lg ${
                          trackerStatus !== 'riding'
                            ? 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-600 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-500/15'
                        }`}
                      >
                        <Pause size={18} className="fill-white" />
                        <span>Arrived at Store</span>
                      </button>

                      {/* Button 3: Resume Ride */}
                      <button
                        onClick={() => setTrackerStatus('riding')}
                        disabled={trackerStatus !== 'at_store'}
                        className={`road-action-lg ${
                          trackerStatus !== 'at_store'
                            ? 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-600 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15'
                        }`}
                      >
                        <Play size={18} className="fill-white" />
                        <span>Resume Ride</span>
                      </button>

                      {/* Button 4: End Day */}
                      <button
                        onClick={() => {
                          if (trackerStatus === 'idle' || trackerStatus === 'completed') return;
                          
                          const endBattery = currentBattery;
                          const batteryUsed = Math.max(0, trackerStartBattery - endBattery);
                          const distance = parseFloat(((trackerRideTime / 3600) * ebikeConfig.avgSpeedMph).toFixed(1));
                          const estimatedFullRange = batteryUsed > 0 ? parseFloat(((distance / batteryUsed) * 100).toFixed(1)) : null;

                          const newSession = {
                            id: `session-${Date.now()}`,
                            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                            startedAt: rideStartedAt,
                            endedAt: new Date().toISOString(),
                            rideTime: trackerRideTime,
                            storeTime: trackerStoreTime,
                            totalDayTime: trackerTotalDayTime,
                            startBattery: trackerStartBattery,
                            endBattery: endBattery,
                            batteryUsed: batteryUsed,
                            jobsCompletedCount: trackerJobsCompleted.length,
                            completedJobNames: routeAJobs
                              .filter(job => trackerJobsCompleted.includes(job.id) || isJobDone(job))
                              .map(job => job.storeName),
                            distance: distance,
                            estimatedEarnings: completedRouteAJobs.reduce((sum, job) => sum + job.pay, 0),
                            earningsPerHour: trackerTotalDayTime > 0
                              ? parseFloat((completedRouteAJobs.reduce((sum, job) => sum + job.pay, 0) / (trackerTotalDayTime / 3600)).toFixed(2))
                              : 0,
                            avgRideSpeed: trackerRideTime > 0 ? parseFloat((distance / (trackerRideTime / 3600)).toFixed(1)) : 0,
                            learnedRange: estimatedFullRange
                          };

                          const updatedSessions = [newSession, ...trackerSessions];
                          setTrackerSessions(updatedSessions);
                          localStorage.setItem('ride_tracker_sessions', JSON.stringify(updatedSessions));
                          setTrackerStatus('completed');
                        }}
                        disabled={trackerStatus === 'idle' || trackerStatus === 'completed'}
                        className={`road-action-lg ${
                          trackerStatus === 'idle' || trackerStatus === 'completed'
                            ? 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-600 cursor-not-allowed'
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/15'
                        }`}
                      >
                        <Square size={18} className="fill-white" />
                        <span>End Day</span>
                      </button>
                    </div>

                    {/* Reset button if completed or active */}
                    {(trackerStatus === 'completed' || trackerStatus !== 'idle') && (
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to reset the current active tracking session? This will not clear saved history.')) {
                              handleResetActiveTracker();
                            }
                          }}
                          className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all flex items-center gap-1"
                        >
                          <RotateCcw size={12} />
                          <span>Reset Current Tracker Session</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* TELEMETRY READOUT METRICS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    
                    {/* STAT 1: RIDE TIME */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5  flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Ride Time</span>
                        <Play size={12} className="text-emerald-500" />
                      </div>
                      <div className="mt-4">
                        <span className="block text-xl font-black text-slate-900 dark:text-white font-mono">
                          {(() => {
                            const h = Math.floor(trackerRideTime / 3600);
                            const m = Math.floor((trackerRideTime % 3600) / 60);
                            const s = trackerRideTime % 60;
                            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                          })()}
                        </span>
                        <span className="block text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">Bike on & Moving</span>
                      </div>
                    </div>

                    {/* STAT 2: STORE TIME */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5  flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Store Time</span>
                        <Pause size={12} className="text-amber-500" />
                      </div>
                      <div className="mt-4">
                        <span className="block text-xl font-black text-slate-900 dark:text-white font-mono">
                          {(() => {
                            const h = Math.floor(trackerStoreTime / 3600);
                            const m = Math.floor((trackerStoreTime % 3600) / 60);
                            const s = trackerStoreTime % 60;
                            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                          })()}
                        </span>
                        <span className="block text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">Bike off & Paused</span>
                      </div>
                    </div>

                    {/* STAT 3: TOTAL DAY TIME */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5  flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Session</span>
                        <Clock size={12} className="text-indigo-500" />
                      </div>
                      <div className="mt-4">
                        <span className="block text-xl font-black text-slate-900 dark:text-white font-mono">
                          {(() => {
                            const h = Math.floor(trackerTotalDayTime / 3600);
                            const m = Math.floor((trackerTotalDayTime % 3600) / 60);
                            const s = trackerTotalDayTime % 60;
                            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                          })()}
                        </span>
                        <span className="block text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">Total elapsed time</span>
                      </div>
                    </div>

                    {/* STAT 4: ESTIMATED DISTANCE */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5  flex flex-col justify-between">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Est. Distance</span>
                        <MapPin size={12} className="text-blue-500" />
                      </div>
                      <div className="mt-4">
                        <span className="block text-xl font-black text-slate-900 dark:text-white font-mono">
                          {((trackerRideTime / 3600) * ebikeConfig.avgSpeedMph).toFixed(2)} mi
                        </span>
                        <span className="block text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">At {ebikeConfig.avgSpeedMph} MPH avg speed</span>
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE JOBS CHECKLIST SECTION */}
                  {trackerStatus !== 'idle' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6  space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Route A Stops & Tasks</h3>
                          <p className="text-[10px] text-slate-400">Check off stops as you complete them to record data for this session.</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-500 font-mono">
                          {trackerJobsCompleted.length} Completed
                        </span>
                      </div>

                      {routeAJobs.length > 0 ? (
                        <div className="space-y-2.5">
                          {routeAJobs.map((job) => {
                            const isDone = isJobDone(job);
                            return (
                              <div
                                key={job.id}
                                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                  isDone
                                    ? 'bg-blue-500/[0.02] border-blue-500/20 text-slate-400 line-through dark:text-slate-500'
                                    : 'bg-slate-50/50 border-slate-200 dark:bg-white/[0.02] dark:border-white/5'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => {
                                      // Toggle globally
                                      handleToggleComplete(job.id);
                                      // Track locally inside this session
                                      if (trackerJobsCompleted.includes(job.id)) {
                                        setTrackerJobsCompleted(prev => prev.filter(id => id !== job.id));
                                      } else {
                                        setTrackerJobsCompleted(prev => [...prev, job.id]);
                                      }
                                    }}
                                    className={`p-1.5 rounded-lg border transition-all ${
                                      isDone
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white border-slate-300 hover:border-slate-400 dark:bg-neutral-950 dark:border-neutral-800'
                                    }`}
                                  >
                                    <CheckSquare size={16} className={isDone ? 'opacity-100' : 'opacity-0'} />
                                  </button>
                                  <div className="flex-1 min-w-0 pr-4">
                                    <span className="block text-xs font-black truncate">{job.storeName}</span>
                                    <span className="block text-[10px] opacity-75 font-mono truncate">{job.address}</span>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  isDone ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-100 text-slate-500 dark:bg-white/5'
                                }`}>
                                  ${job.pay.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-4">No stops assigned to Route A yet. Go to the Jobs tab to assign stops.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Ride History */}
                <div className="space-y-6">
                  {/* HISTORY LOG OF SAVED DAYS */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6  space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-slate-500" />
                        <span>Tracked History</span>
                      </h3>
                      {trackerSessions.length > 0 && (
                        <button
                          onClick={() => {
                            if (window.confirm('Delete all tracked ride history?')) {
                              setTrackerSessions([]);
                              localStorage.removeItem('ride_tracker_sessions');
                            }
                          }}
                          className="text-[9px] font-bold text-red-500 hover:underline uppercase"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {trackerSessions.length > 0 ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {trackerSessions.map((s) => (
                          <div key={s.id} className="p-3 bg-slate-50 dark:bg-white/[0.01] border border-slate-200/50 dark:border-white/5 rounded-xl space-y-2 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">{s.date}</span>
                              <span className="text-slate-400 font-black">Saved</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-slate-400 text-[10px]">
                              <div>Ride: {Math.floor(s.rideTime / 60)} min</div>
                              <div>Store: {Math.floor(s.storeTime / 60)} min</div>
                              <div>Dist: {s.distance} mi</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200/60 dark:border-white/5 rounded-xl">
                        <span className="block text-xs font-bold">No ride logs saved yet</span>
                        <span className="block text-[10px] text-slate-400 mt-1">Complete a route and click "End Day" to log statistics.</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
                </>
              )}
            </div>
          )}

          {currentTab === 'habits' && (
            <div className="space-y-6 animate-fade-in" id="tab-view-habits">
              <div className="rounded-[8px] border-4 border-slate-950 bg-white p-5 shadow-lg dark:border-white dark:bg-[#17181b]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Consistency Tracker</p>
                    <h2 className="mt-1 text-4xl font-black leading-none text-slate-950 dark:text-white sm:text-5xl">
                      Daily time goals
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm font-bold text-slate-500 dark:text-slate-300">
                      Track a repeat task, log the minutes you completed, and see how consistent you have been.
                    </p>
                  </div>
                  <div className={`rounded-[8px] px-4 py-3 text-right ${habitGoalComplete ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-slate-950'}`}>
                    <p className="text-xs font-black uppercase">Today</p>
                    <p className="text-3xl font-black">{todayHabitMinutes} / {habitTargetMinutes} min</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-[8px] border-2 border-slate-300 bg-white p-5 dark:border-white/20 dark:bg-[#17181b]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="habit-task-name" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Task
                      </label>
                      <input
                        id="habit-task-name"
                        value={habitTaskName}
                        onChange={(event) => setHabitTaskName(event.target.value)}
                        className="mt-2 min-h-14 w-full rounded-[8px] border-2 border-slate-300 bg-white px-4 text-lg font-black text-slate-950 outline-none focus:border-blue-700 dark:border-white/10 dark:bg-black/20 dark:text-white"
                        placeholder="Example: Study, workout, paperwork"
                      />
                    </div>
                    <div>
                      <label htmlFor="habit-target-minutes" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Daily Target Minutes
                      </label>
                      <input
                        id="habit-target-minutes"
                        type="number"
                        min="1"
                        value={habitTargetMinutes}
                        onChange={(event) => setHabitTargetMinutes(Math.max(1, Number(event.target.value) || 1))}
                        className="mt-2 min-h-14 w-full rounded-[8px] border-2 border-slate-300 bg-white px-4 text-lg font-black text-slate-950 outline-none focus:border-blue-700 dark:border-white/10 dark:bg-black/20 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-5 rounded-[8px] bg-slate-100 p-4 dark:bg-black/20">
                    <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                      <div>
                        <label htmlFor="habit-log-minutes" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Minutes Done
                        </label>
                        <input
                          id="habit-log-minutes"
                          type="number"
                          min="1"
                          value={habitLogMinutes}
                          onChange={(event) => setHabitLogMinutes(Math.max(1, Number(event.target.value) || 1))}
                          className="mt-2 min-h-16 w-full rounded-[8px] border-2 border-slate-300 bg-white px-4 text-3xl font-black text-slate-950 outline-none focus:border-blue-700 dark:border-white/10 dark:bg-[#17181b] dark:text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="habit-log-note" className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Note
                        </label>
                        <input
                          id="habit-log-note"
                          value={habitLogNote}
                          onChange={(event) => setHabitLogNote(event.target.value)}
                          className="mt-2 min-h-16 w-full rounded-[8px] border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-950 outline-none focus:border-blue-700 dark:border-white/10 dark:bg-[#17181b] dark:text-white"
                          placeholder="Optional note"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogHabitSession}
                      className="mt-4 flex min-h-20 w-full items-center justify-center gap-3 rounded-[8px] bg-blue-700 px-5 text-3xl font-black uppercase text-white shadow-lg transition hover:bg-blue-600"
                    >
                      <CheckCircle2 size={32} />
                      <span>Log Time</span>
                    </button>
                  </div>
                </section>

                <section className="grid grid-cols-2 gap-3">
                  <div className="rounded-[8px] bg-slate-950 p-4 text-white">
                    <p className="text-sm font-black uppercase">Streak</p>
                    <p className="mt-3 text-5xl font-black leading-none">{habitStreakDays}</p>
                    <p className="mt-1 text-base font-black">days</p>
                  </div>
                  <div className="rounded-[8px] bg-emerald-600 p-4 text-white">
                    <p className="text-sm font-black uppercase">7-Day Hit Rate</p>
                    <p className="mt-3 text-5xl font-black leading-none">{habitConsistencyPct}%</p>
                    <p className="mt-1 text-base font-black">{habitDaysComplete} of 7 days</p>
                  </div>
                  <div className="rounded-[8px] bg-blue-700 p-4 text-white">
                    <p className="text-sm font-black uppercase">Total Time</p>
                    <p className="mt-3 text-5xl font-black leading-none">{Math.floor(habitTotalMinutes / 60)}h</p>
                    <p className="mt-1 text-base font-black">{habitTotalMinutes % 60} min</p>
                  </div>
                  <div className="rounded-[8px] bg-amber-400 p-4 text-slate-950">
                    <p className="text-sm font-black uppercase">Sessions</p>
                    <p className="mt-3 text-5xl font-black leading-none">{habitTotalSessions}</p>
                    <p className="mt-1 text-base font-black">logged</p>
                  </div>
                </section>
              </div>

              <section className="rounded-[8px] border-2 border-slate-300 bg-white p-5 dark:border-white/20 dark:bg-[#17181b]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Last 7 Days</p>
                    <h3 className="text-3xl font-black text-slate-950 dark:text-white">Consistency View</h3>
                  </div>
                  <span className="rounded-[8px] bg-slate-950 px-3 py-2 text-sm font-black uppercase text-white dark:bg-white dark:text-slate-950">
                    Target {habitTargetMinutes} min
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-7 gap-2">
                  {habitLast7Days.map(day => {
                    const pct = Math.min(100, Math.round((day.minutes / habitTargetMinutes) * 100));
                    return (
                      <div key={day.key} className="rounded-[8px] bg-slate-100 p-2 text-center dark:bg-black/20">
                        <div className="flex h-32 items-end justify-center rounded-[8px] bg-white p-1 dark:bg-white/10">
                          <div
                            className={`w-full rounded-[6px] ${day.complete ? 'bg-emerald-600' : 'bg-blue-700'}`}
                            style={{ height: `${Math.max(6, pct)}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs font-black uppercase text-slate-500 dark:text-slate-300">{day.label}</p>
                        <p className="text-sm font-black text-slate-950 dark:text-white">{day.minutes}m</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[8px] border-2 border-slate-300 bg-white p-5 dark:border-white/20 dark:bg-[#17181b]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Log History</p>
                    <h3 className="text-3xl font-black text-slate-950 dark:text-white">Recent Sessions</h3>
                  </div>
                </div>

                {habitRecentLogs.length === 0 ? (
                  <div className="mt-4 rounded-[8px] border-2 border-dashed border-slate-300 p-6 text-center text-lg font-black text-slate-500 dark:border-white/10 dark:text-slate-300">
                    No sessions logged yet.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {habitRecentLogs.map(log => (
                      <article key={log.id} className="rounded-[8px] border-2 border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xl font-black text-slate-950 dark:text-white">{log.minutes} minutes</p>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                              {new Date(`${log.date}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteHabitLog(log.id)}
                            className="rounded-[8px] bg-slate-200 px-2 py-1 text-xs font-black uppercase text-slate-600 hover:bg-rose-600 hover:text-white dark:bg-white/10 dark:text-slate-300"
                          >
                            Delete
                          </button>
                        </div>
                        {log.note && (
                          <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">{log.note}</p>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
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

        {/* Floating Bottom Navigation Bar for Extremely Simple Mobile-First Navigation */}
        {!rideModeActive && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-3xl">
          <div 
            className="flex items-center justify-start md:justify-around bg-white/95 dark:bg-[#0D0D0D]/95 backdrop-blur-md rounded-[24px] border border-slate-200/80 dark:border-white/10 shadow-[0_18px_50px_rgba(15,23,42,0.12)] px-3 py-3 overflow-x-auto whitespace-nowrap gap-2 w-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
              { id: 'route', label: 'Route', icon: Map, color: 'text-indigo-500' },
              { id: 'jobs', label: 'Jobs', icon: Briefcase, color: 'text-emerald-500' },
              { id: 'tracker', label: 'Tracker', icon: Timer, color: 'text-indigo-500' },
              { id: 'habits', label: 'Habits', icon: Award, color: 'text-amber-500' },
              { id: 'settings', label: 'Settings', icon: Settings, color: 'text-slate-500' },
            ].map((tab) => {
              const IconComponent = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => setCurrentTab(tab.id as any)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl transition-all duration-300 flex-shrink-0 min-w-[82px] min-h-[64px] ${
                    isActive
                      ? 'bg-slate-100 dark:bg-white/10 text-slate-950 dark:text-white scale-105 font-bold'
                      : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                  }`}
                >
                  <IconComponent size={22} className={isActive ? tab.color : 'text-current'} />
                  <span className="text-[10px] font-black tracking-wide uppercase">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
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

        {/* Job Creator / Updater modal */}
        <JobModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveJobModal}
          editingJob={editingJob}
          defaultRouteId={activeTab === 'all' ? 'A' : activeTab}
          defaultJobType={defaultJobType}
        />

        {/* Portable Footer */}
        {currentTab !== 'dashboard' && (
        <footer className="mt-12 border-t border-slate-200 bg-white py-6 dark:border-white/5 dark:bg-[#1C1C1E]/80">
          <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
            <p className="font-bold text-slate-500 dark:text-slate-400">Route Manager &bull; Field Route Console</p>
            <p>Built for fast stop review, sequencing, and field-ready route decisions.</p>
          </div>
        </footer>
        )}

      </div>
    </div>
  );
}





















