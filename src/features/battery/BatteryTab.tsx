/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertTriangle,
  ArrowRightLeft,
  Battery,
  CheckCircle2,
  Compass,
  HelpCircle,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import type { EbikeConfig, Job, OutlierReport, RouteMetrics } from '../../types';

interface BatteryTabProps {
  activeMetrics: RouteMetrics;
  currentBattery: number;
  onCurrentBatteryChange: (value: number) => void;
  batteryToneClass: string;
  batteryRisk: string;
  batteryTrackerCurrent: number;
  trackerRideTime: number;
  trackerStoreTime: number;
  formatDuration: (seconds: number) => string;
  estimatedMilesRemaining: number;
  assistLevel: number;
  onAssistLevelChange: (value: number) => void;
  canFinishRoute: boolean;
  rechargeRecommended: boolean;
  learnedBatteryRate: number;
  riderWeight: number;
  onRiderWeightChange: (value: number) => void;
  cargoWeight: number;
  onCargoWeightChange: (value: number) => void;
  weatherWind: string;
  onWeatherWindChange: (value: string) => void;
  terrain: string;
  onTerrainChange: (value: string) => void;
  ebikeConfig: EbikeConfig;
  onConfigChange: (updated: EbikeConfig) => void;
  isSimulating: boolean;
  handleStartSimulation: () => void;
  handleStopSimulation: () => void;
  simulatedDistance: number;
  simulatedBattery: number;
  simulatedJobsCompleted: string[];
  routeAJobs: Job[];
  simulationStatus: string;
  outliersReport: OutlierReport[];
  onMoveOutlierToRouteB: (jobId: string) => void;
}

export default function BatteryTab({
  activeMetrics,
  currentBattery,
  onCurrentBatteryChange,
  batteryToneClass,
  batteryRisk,
  batteryTrackerCurrent,
  trackerRideTime,
  trackerStoreTime,
  formatDuration,
  estimatedMilesRemaining,
  assistLevel,
  onAssistLevelChange,
  canFinishRoute,
  rechargeRecommended,
  learnedBatteryRate,
  riderWeight,
  onRiderWeightChange,
  cargoWeight,
  onCargoWeightChange,
  weatherWind,
  onWeatherWindChange,
  terrain,
  onTerrainChange,
  ebikeConfig,
  onConfigChange,
  isSimulating,
  handleStartSimulation,
  handleStopSimulation,
  simulatedDistance,
  simulatedBattery,
  simulatedJobsCompleted,
  routeAJobs,
  simulationStatus,
  outliersReport,
  onMoveOutlierToRouteB,
}: BatteryTabProps) {
  return (
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
                    onChange={(e) => onCurrentBatteryChange(Number(e.target.value))}
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
                        onClick={() => onAssistLevelChange(level)}
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
                  onChange={(e) => onRiderWeightChange(Number(e.target.value))}
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
                  onChange={(e) => onCargoWeightChange(Number(e.target.value))}
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
                      onClick={() => onWeatherWindChange(windItem.value)}
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
                      onClick={() => onTerrainChange(terrainItem.value)}
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
                  onChange={(e) => onConfigChange({ ...ebikeConfig, avgSpeedMph: Number(e.target.value) })}
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
                        onClick={() => onMoveOutlierToRouteB(rep.jobId)}
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
  );
}
