/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Job, Coordinates } from '../types';
import { getDistanceInMiles } from '../utils/routeUtils';
import { MapPin, Navigation, Home, HelpCircle, Eye, Sliders, CheckCircle, Info, Sparkles } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

// Read API key from environmental variables exposed by Vite
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface BakersfieldMapPreviewProps {
  startAddress: string;
  startCoord: Coordinates;
  routeAJobs: Job[]; // Optimized Sequence
  routeBJobs: Job[];
  outlierIds: string[];
  activeTab: 'A' | 'B' | 'all';
  onSelectJob?: (jobId: string) => void;
  onGoogleMetrics?: (metrics: { distance: number; duration: number } | null) => void;
  isOptimizing?: boolean;
}

export default function BakersfieldMapPreview({
  startAddress,
  startCoord,
  routeAJobs,
  routeBJobs,
  outlierIds,
  activeTab,
  onSelectJob,
  onGoogleMetrics,
  isOptimizing = false
}: BakersfieldMapPreviewProps) {
  // Map Mode can toggle between 'google' (if key is valid) and 'svg' (traditional GIS representation)
  const [mapMode, setMapMode] = useState<'google' | 'svg'>(hasValidKey ? 'google' : 'svg');
  const [travelMode, setTravelMode] = useState<'BICYCLING' | 'DRIVING'>('BICYCLING');

  const [hoveredNode, setHoveredNode] = useState<{
    id: string;
    name: string;
    address: string;
    distance: number;
    pay: number;
    type: string;
    x: number;
    y: number;
  } | null>(null);

  // Geographic bounds for Bakersfield stops
  const minLat = 35.3150;
  const maxLat = 35.4250;
  const minLng = -119.1650;
  const maxLng = -119.0000;

  // Converts GPS coordinates to SVG viewBox space (600 width, 400 height) for SVG mode
  const getXY = (coords: Coordinates) => {
    const x = ((coords.lng - minLng) / (maxLng - minLng)) * 600;
    const y = (1 - (coords.lat - minLat) / (maxLat - minLat)) * 400;
    return { x, y };
  };

  const hubPos = getXY(startCoord);

  // Compute positions of active Route A stops
  const routeAPositions = routeAJobs.map(job => ({
    job,
    pos: getXY(job.coordinates)
  }));

  // Compute positions of Route B stops
  const routeBPositions = routeBJobs.map(job => ({
    job,
    pos: getXY(job.coordinates)
  }));

  // Create SVG path string for Route A
  let routeAPathString = '';
  if (routeAPositions.length > 0) {
    routeAPathString = `M ${hubPos.x} ${hubPos.y} `;
    routeAPositions.forEach(item => {
      routeAPathString += `L ${item.pos.x} ${item.pos.y} `;
    });
    routeAPathString += `Z`; // returns back to starting point
  }

  // Handle node hover in SVG Mode
  const handleNodeHover = (
    e: React.MouseEvent,
    id: string,
    name: string,
    address: string,
    coords: Coordinates,
    pay: number,
    type: string
  ) => {
    const pos = getXY(coords);
    const distance = getDistanceInMiles(startCoord, coords);
    setHoveredNode({
      id,
      name,
      address,
      distance,
      pay,
      type: type === 'hub' ? 'Starting Hub' : type,
      x: pos.x,
      y: pos.y
    });
  };

  return (
    <div id="map-preview-container" className="relative w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-[#0A0A0A]">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200">
            {mapMode === 'google' ? 'Real-Time Google Maps Route' : 'Bakersfield GIS Routing Preview'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mapMode === 'google' 
              ? 'Real-road distance & duration optimization' 
              : 'Interactive offline Bakersfield GIS grid (hover/tap nodes)'}
          </p>
        </div>
        
        {/* Toolbar with mode toggler */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Travel Mode Toggle for Google Maps */}
          {mapMode === 'google' && (
            <select
              id="google-travel-mode-select"
              value={travelMode}
              onChange={(e) => setTravelMode(e.target.value as 'BICYCLING' | 'DRIVING')}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 dark:border-white/10 dark:bg-[#121212] dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="BICYCLING">🚴 Bicycling (E-Bike)</option>
              <option value="DRIVING">🚗 Driving (Car)</option>
            </select>
          )}

          {/* Mode Switcher Buttons */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
            <button
              onClick={() => {
                if (hasValidKey) {
                  setMapMode('google');
                } else {
                  setMapMode('google'); // Will show setup guide if key is false
                }
              }}
              className={`rounded-md px-2 py-1 text-[10px] font-bold transition-all ${
                mapMode === 'google'
                  ? 'bg-white text-blue-600 shadow-xs dark:bg-white/10 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Google Map
            </button>
            <button
              onClick={() => setMapMode('svg')}
              className={`rounded-md px-2 py-1 text-[10px] font-bold transition-all ${
                mapMode === 'svg'
                  ? 'bg-white text-slate-800 shadow-xs dark:bg-white/10 dark:text-white'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              GIS Preview
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* RENDER MODE: GOOGLE MAP */}
        {mapMode === 'google' && (
          <div className="relative overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-inner dark:border-white/5 dark:bg-[#050505] min-h-[360px] flex flex-col justify-between">
            {!hasValidKey ? (
              /* CONSTITUTION MANDATED SETUP SCREEN: When hasValidKey is false */
              <div className="flex flex-col items-center justify-center p-6 text-center w-full grow font-sans">
                <div className="max-w-md space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 mx-auto">
                    <MapPin size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Google Maps API Key Required</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Unlocks turn-by-turn routing, accurate driving/bicycling distance, and travel time calculations directly in Bakersfield.
                  </p>
                  
                  <div className="text-left bg-slate-50 dark:bg-[#0A0A0A] p-4 rounded-xl border border-slate-200/60 dark:border-white/5 text-xs space-y-2.5">
                    <p><strong>Step 1:</strong> <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener" className="text-blue-500 hover:underline font-semibold">Get an API Key</a></p>
                    <p><strong>Step 2:</strong> Add your key as a secret in AI Studio:</p>
                    <ol className="list-decimal list-inside pl-1 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                      <li>Open <strong>Settings</strong> (⚙️ gear icon, <strong>top-right corner</strong>)</li>
                      <li>Select <strong>Secrets</strong></li>
                      <li>Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the secret name, press <strong>Enter</strong></li>
                      <li>Paste your API key as the value, press <strong>Enter</strong></li>
                    </ol>
                    <p className="text-[10px] text-slate-400 font-mono italic">
                      The app rebuilds automatically after you add the secret.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setMapMode('svg')}
                      className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                    >
                      Use Offline GIS Map
                    </button>
                    <a
                      href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
                      target="_blank"
                      rel="noopener"
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-sm transition-all"
                    >
                      Get API Key
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              /* GOOGLE MAP WRAPPER WITH PROVIDER & MANDATORY ATTRIBUTION */
              <APIProvider apiKey={API_KEY} version="weekly">
                <div style={{ width: '100%', height: '360px', position: 'relative' }}>
                  <GoogleMapWrapper
                    startCoord={startCoord}
                    startAddress={startAddress}
                    routeAJobs={routeAJobs}
                    routeBJobs={routeBJobs}
                    outlierIds={outlierIds}
                    activeTab={activeTab}
                    onSelectJob={onSelectJob}
                    travelMode={travelMode}
                    onGoogleMetrics={onGoogleMetrics}
                  />
                </div>
              </APIProvider>
            )}
          </div>
        )}

        {/* RENDER MODE: OFFLINE GIS SVG PREVIEW */}
        {mapMode === 'svg' && (
          <div className="relative overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-inner dark:border-white/5 dark:bg-[#050505]">
            <svg
              viewBox="0 0 600 400"
              className="h-auto w-full max-h-[360px] select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Subtle Grid Lines */}
              <g stroke="currentColor" strokeWidth="0.5" strokeDasharray="3,3" className="text-slate-100 dark:text-white/5">
                <line x1="100" y1="0" x2="100" y2="400" />
                <line x1="200" y1="0" x2="200" y2="400" />
                <line x1="300" y1="0" x2="300" y2="400" />
                <line x1="400" y1="0" x2="400" y2="400" />
                <line x1="500" y1="0" x2="500" y2="400" />
                
                <line x1="0" y1="80" x2="600" y2="80" />
                <line x1="0" y1="160" x2="600" y2="160" />
                <line x1="0" y1="240" x2="600" y2="240" />
                <line x1="0" y1="320" x2="600" y2="320" />
              </g>

              {/* Bakersfield Major Highway Visual Overlays (Rosedale / Stockdale / Golden State) */}
              <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate-100/70 dark:text-slate-900/60" opacity="0.6">
                {/* Rosedale Highway (Hwy 58 North-West corridor) */}
                <path d="M 0 110 L 250 110 L 400 50 L 600 50" fill="none" strokeWidth="1.5" strokeDasharray="4,4" />
                {/* Golden State Highway / Hwy 99 (Diagonal corridor) */}
                <path d="M 120 0 L 350 150 L 420 400" fill="none" strokeWidth="1.5" strokeDasharray="4,4" />
                {/* Stockdale Highway / Ming Ave (West corridor) */}
                <path d="M 0 250 L 450 250 L 600 320" fill="none" strokeWidth="1.5" strokeDasharray="4,4" />
              </g>

              {/* Active Route A Connection Path */}
              {activeTab !== 'B' && routeAPositions.length > 0 && (
                <path
                  d={routeAPathString}
                  fill="rgba(59, 130, 246, 0.03)"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeDasharray="6,4"
                />
              )}

              {/* HUB / START POSITION MARKER */}
              <g
                className="cursor-pointer group"
                onMouseEnter={(e) => handleNodeHover(e, 'hub', 'Starting Hub (Home)', startAddress, startCoord, 0, 'hub')}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle
                  cx={hubPos.x}
                  cy={hubPos.y}
                  r="14"
                  className="fill-emerald-500/10 stroke-emerald-500 stroke-2 group-hover:fill-emerald-500/20"
                />
                <circle cx={hubPos.x} cy={hubPos.y} r="4" className="fill-emerald-500" />
                <text
                  x={hubPos.x + 10}
                  y={hubPos.y - 10}
                  className="fill-emerald-600 dark:fill-emerald-400 text-[8px] font-bold"
                >
                  HUB
                </text>
              </g>

              {/* ROUTE A NODES (OPTIMIZED SEQUENCE) */}
              {activeTab !== 'B' &&
                routeAPositions.map(({ job, pos }, idx) => {
                  const isOutlier = outlierIds.includes(job.id);
                  return (
                    <g
                      key={job.id}
                      className="cursor-pointer group"
                      onClick={() => onSelectJob?.(job.id)}
                      onMouseEnter={(e) => handleNodeHover(e, job.id, job.storeName, job.address, job.coordinates, job.pay, job.jobType)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      {/* Pulsing ring for outliers */}
                      {isOutlier && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="18"
                          className="fill-none stroke-rose-500/30 stroke-1"
                        />
                      )}
                      {/* Node interactive boundaries */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isOutlier ? "14" : "12"}
                        className={`transition-all duration-300 ${
                          job.status === 'completed'
                            ? 'fill-blue-500/10 stroke-emerald-500 stroke-2'
                            : isOutlier
                            ? 'fill-rose-500/10 stroke-rose-500 stroke-2 group-hover:fill-rose-500/20'
                            : 'fill-blue-500/10 stroke-blue-600 stroke-2 group-hover:fill-blue-500/20'
                        }`}
                      />
                      {/* Center point */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="4"
                        className={
                          job.status === 'completed'
                            ? 'fill-emerald-500'
                            : isOutlier
                            ? 'fill-rose-500'
                            : 'fill-blue-600'
                        }
                      />
                      {/* Sequence label */}
                      <rect
                        x={pos.x + 8}
                        y={pos.y - 18}
                        width="14"
                        height="14"
                        rx="3"
                        className="fill-slate-800 text-[10px] dark:fill-slate-100"
                      />
                      <text
                        x={pos.x + 15}
                        y={pos.y - 8}
                        textAnchor="middle"
                        className="fill-white text-[9px] font-bold dark:fill-slate-950"
                      >
                        {idx + 1}
                      </text>
                    </g>
                  );
                })}

              {/* ROUTE B NODES (STANDBY) */}
              {activeTab !== 'A' &&
                routeBPositions.map(({ job, pos }) => {
                  const isOutlier = outlierIds.includes(job.id);
                  return (
                    <g
                      key={job.id}
                      className="cursor-pointer group"
                      onClick={() => onSelectJob?.(job.id)}
                      onMouseEnter={(e) => handleNodeHover(e, job.id, job.storeName, job.address, job.coordinates, job.pay, job.jobType)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="10"
                        className={`stroke-amber-500 stroke-2 stroke-dasharray-[2,2] fill-amber-500/10 group-hover:fill-amber-500/20 ${
                          isOutlier ? 'stroke-rose-400' : ''
                        }`}
                      />
                      <circle cx={pos.x} cy={pos.y} r="3" className="fill-amber-500" />
                      <text
                        x={pos.x + 10}
                        y={pos.y - 10}
                        className="fill-slate-500 dark:fill-slate-400 text-[8px] font-semibold"
                      >
                        B
                      </text>
                    </g>
                  );
                })}
            </svg>

            {/* Dynamic Tooltip */}
            {hoveredNode && (
              <div
                id="map-tooltip"
                className="absolute z-10 w-52 rounded-lg border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-xs dark:border-slate-800 dark:bg-slate-950/95"
                style={{
                  left: `${Math.min(hoveredNode.x + 10, 360)}px`,
                  top: `${Math.min(hoveredNode.y + 10, 260)}px`
                }}
              >
                <div className="flex items-start justify-between">
                  <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                    {hoveredNode.name}
                  </span>
                  {hoveredNode.pay > 0 && (
                    <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                      +${hoveredNode.pay}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-[10px] text-slate-500 dark:text-slate-400">
                  {hoveredNode.address}
                </p>
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 dark:border-slate-800">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                    {hoveredNode.type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    ~{hoveredNode.distance} miles out
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Optimization Animation Overlay */}
        <AnimatePresence>
          {isOptimizing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-blue-900/10 dark:bg-blue-950/20 backdrop-blur-[1.5px] pointer-events-none flex flex-col items-center justify-center overflow-hidden rounded-xl border border-blue-500/20"
            >
              {/* Radar circular sweeps */}
              <motion.div
                initial={{ scale: 0.2, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeOut" }}
                className="absolute h-48 w-48 rounded-full border border-blue-500/40 bg-blue-500/5"
              />
              <motion.div
                initial={{ scale: 0.2, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeOut", delay: 0.6 }}
                className="absolute h-48 w-48 rounded-full border border-blue-500/30 bg-blue-500/5"
              />

              {/* Scanning laser bar */}
              <motion.div
                initial={{ y: "-150px" }}
                animate={{ y: "150px" }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut", repeatType: "reverse" }}
                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.9)]"
              />

              <div className="z-20 flex items-center gap-2 bg-slate-900/95 text-white font-black text-[11px] px-4 py-2.5 rounded-xl border border-blue-500/40 shadow-xl font-mono tracking-wider">
                <Sparkles size={14} className="text-blue-400 animate-spin" />
                <span>AI RE-OPTIMIZING FIELD ROUTE...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend / Status row */}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-slate-500 dark:text-slate-400 items-center justify-between border-t border-slate-200/50 dark:border-white/5 pt-2">
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Starting Hub (Home)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span>Route A Sequence</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Route B (Standby)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Outlier Warning</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <HelpCircle size={10} className="text-slate-400" />
          <span>
            {mapMode === 'google' 
              ? 'Real-road routing metrics are synced to the score panel.' 
              : 'SVG coordinates are calculated relative to Bakersfield Hub.'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Inner Wrapper component that is safely loaded INSIDE <APIProvider>
 * Allows us to utilize useMap() and useMapsLibrary() hooks.
 * All maps MUST include internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio']
 */
interface GoogleMapWrapperProps {
  startCoord: Coordinates;
  startAddress: string;
  routeAJobs: Job[];
  routeBJobs: Job[];
  outlierIds: string[];
  activeTab: 'A' | 'B' | 'all';
  onSelectJob?: (jobId: string) => void;
  travelMode: 'BICYCLING' | 'DRIVING';
  onGoogleMetrics?: (metrics: { distance: number; duration: number } | null) => void;
}

function GoogleMapWrapper({
  startCoord,
  startAddress,
  routeAJobs,
  routeBJobs,
  outlierIds,
  activeTab,
  onSelectJob,
  travelMode,
  onGoogleMetrics
}: GoogleMapWrapperProps) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedHub, setSelectedHub] = useState<boolean>(false);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Centering map to start coordinates initially
  useEffect(() => {
    if (map && startCoord) {
      map.setCenter(startCoord);
      map.setZoom(12);
    }
  }, [map, startCoord]);

  // Compute and display real-time road polylines on Google Map
  useEffect(() => {
    if (!map || !routesLib) return;

    // Clear old polylines
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    // Only compute routes for Active Route A if it has stops
    if (activeTab === 'B' || routeAJobs.length === 0) {
      if (onGoogleMetrics) onGoogleMetrics(null);
      return;
    }

    const origin = startCoord;
    const destination = startCoord;

    // Prepare intermediate waypoints (the sequence of Route A stops)
    const intermediates = routeAJobs.map(job => ({
      location: job.coordinates
    }));

    // Perform the modern API-compliant Route.computeRoutes call
    routesLib.Route.computeRoutes({
      origin: origin,
      destination: destination,
      intermediates: intermediates,
      travelMode: travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    })
      .then(({ routes }) => {
        if (routes?.[0]) {
          const route = routes[0];

          // Draw the calculated route segments on our Map
          const newPolylines = route.createPolylines();
          newPolylines.forEach(p => {
            p.setOptions({
              strokeColor: '#3B82F6', // Theme Blue for Route A
              strokeOpacity: 0.85,
              strokeWeight: 4.5,
              clickable: false
            });
            p.setMap(map);
          });
          polylinesRef.current = newPolylines;

          // Pan/Zoom map to comfortably fit the calculated route viewport
          if (route.viewport) {
            map.fitBounds(route.viewport);
          }

          // Calculate miles from meters and minutes from duration
          const distMeters = route.distanceMeters || 0;
          const durationMillis = route.durationMillis || 0;

          const distanceMiles = distMeters / 1609.344;
          const durationMinutes = durationMillis / 60000;

          if (onGoogleMetrics) {
            onGoogleMetrics({
              distance: parseFloat(distanceMiles.toFixed(2)),
              duration: Math.round(durationMinutes)
            });
          }
        } else {
          if (onGoogleMetrics) onGoogleMetrics(null);
        }
      })
      .catch((err) => {
        console.error('Failed to calculate road route via Google Routes service:', err);
        // Fallback to Haversine
        if (onGoogleMetrics) onGoogleMetrics(null);
      });

    return () => {
      polylinesRef.current.forEach(p => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, startCoord, routeAJobs, activeTab, travelMode]);

  return (
    <>
      <Map
        defaultCenter={startCoord}
        defaultZoom={11}
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        {/* STARTING HUB MARKER (Home Base) */}
        <AdvancedMarker
          position={startCoord}
          onClick={() => setSelectedHub(true)}
          title="Starting Hub (Home)"
        >
          <Pin
            background="#10B981" // Emerald green for the hub
            glyphColor="#fff"
            borderColor="#047857"
          />
        </AdvancedMarker>

        {/* ACTIVE ROUTE A JOBS (OPTIMIZED SEQUENCE) */}
        {activeTab !== 'B' &&
          routeAJobs.map((job, idx) => {
            const isOutlier = outlierIds.includes(job.id);
            return (
              <AdvancedMarker
                key={job.id}
                position={job.coordinates}
                onClick={() => {
                  setSelectedJob(job);
                  onSelectJob?.(job.id);
                }}
                title={`${idx + 1}. ${job.storeName}`}
              >
                <Pin
                  background={isOutlier ? '#F43F5E' : '#3B82F6'} // Pink/Rose for outlier, Blue for standard Route A
                  glyphColor="#fff"
                  glyphText={`${idx + 1}`}
                  borderColor={isOutlier ? '#E11D48' : '#2563EB'}
                />
              </AdvancedMarker>
            );
          })}

        {/* ACTIVE ROUTE B JOBS (STANDBY) */}
        {activeTab !== 'A' &&
          routeBJobs.map((job) => {
            const isOutlier = outlierIds.includes(job.id);
            return (
              <AdvancedMarker
                key={job.id}
                position={job.coordinates}
                onClick={() => {
                  setSelectedJob(job);
                  onSelectJob?.(job.id);
                }}
                title={`Standby B. ${job.storeName}`}
              >
                <Pin
                  background={isOutlier ? '#F43F5E' : '#F59E0B'} // Pink/Rose for outlier, Amber for Route B
                  glyphColor="#fff"
                  glyphText="B"
                  borderColor={isOutlier ? '#E11D48' : '#D97706'}
                />
              </AdvancedMarker>
            );
          })}

        {/* INFORMATION WINDOW FOR MARKER CLICKS */}
        {selectedJob && (
          <InfoWindow
            position={selectedJob.coordinates}
            onCloseClick={() => setSelectedJob(null)}
          >
            <div className="p-1 max-w-xs text-slate-800">
              <div className="flex items-start justify-between gap-4">
                <h4 className="font-bold text-xs text-slate-900">{selectedJob.storeName}</h4>
                <span className="text-[11px] font-extrabold text-emerald-600">
                  +${selectedJob.pay.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-tight">
                {selectedJob.address}
              </p>
              
              <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[9px]">
                <span className="font-extrabold uppercase tracking-wide text-blue-600">
                  {selectedJob.jobType.replace('_', ' ')}
                </span>
                <span className="font-medium text-slate-600">
                  {selectedJob.estimatedMinutes} min work &bull; {selectedJob.dueTime}
                </span>
              </div>
              
              {outlierIds.includes(selectedJob.id) && (
                <div className="mt-2 rounded-md bg-rose-50 border border-rose-100 p-1.5 text-[9px] text-rose-700 flex items-center gap-1">
                  <Info size={10} className="shrink-0" />
                  <span>Geographic outlier! Relocate or drop stop.</span>
                </div>
              )}
            </div>
          </InfoWindow>
        )}

        {/* INFO WINDOW FOR STARTING HUB */}
        {selectedHub && (
          <InfoWindow
            position={startCoord}
            onCloseClick={() => setSelectedHub(false)}
          >
            <div className="p-1 max-w-xs text-slate-800">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1">
                <Home size={12} className="text-emerald-600" />
                <span>Starting Hub (Home base)</span>
              </h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                {startAddress}
              </p>
              <p className="text-[9px] text-slate-400 mt-1.5">
                All metrics calculate return trips back to this address.
              </p>
            </div>
          </InfoWindow>
        )}
      </Map>
    </>
  );
}

