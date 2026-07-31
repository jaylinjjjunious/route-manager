import { useState } from 'react';
import type { TransitTrip, TransitLeg, TransitRideLeg, TransitWalkLeg, Job, OnTimeStatus } from '../types';
import type { UseTransitTripResult } from '../hooks/useTransitTrip';
import { formatLeaveByTime } from '../services/transit/leaveBy';
import { getTransitMapsUrls, buildWalkingMapsUrl } from '../services/transit/mapsLinks';

interface TransitTripCardProps {
  transit: UseTransitTripResult;
  currentJob?: Job;
  onRefresh?: () => void;
}

function OnTimeBadge({ status }: { status: OnTimeStatus }) {
  const config = {
    early: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Early' },
    'on-time': { bg: 'bg-green-500/20', text: 'text-green-300', label: 'On Time' },
    late: { bg: 'bg-red-500/20', text: 'text-red-300', label: 'Late' },
    unknown: { bg: 'bg-gray-500/20', text: 'text-gray-300', label: '?' },
  } as const;

  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.text}`}>
      {status === 'early' && '↑'}{status === 'late' && '↓'}
      {c.label}
    </span>
  );
}

function WalkLeg({ leg }: { leg: TransitWalkLeg }) {
  const hasUsableCoords =
    leg.coordinatesAvailable !== false &&
    Number.isFinite(leg.from.latitude) &&
    Number.isFinite(leg.from.longitude) &&
    Number.isFinite(leg.to.latitude) &&
    Number.isFinite(leg.to.longitude) &&
    (leg.from.latitude !== 0 || leg.from.longitude !== 0) &&
    (leg.to.latitude !== 0 || leg.to.longitude !== 0);

  return (
    <div className="flex items-start gap-2 text-xs text-white/50">
      <span className="mt-0.5">🚶</span>
      <div className="flex-1">
        {hasUsableCoords ? (
          <a
            href={buildWalkingMapsUrl(
              { lat: leg.from.latitude, lng: leg.from.longitude },
              { lat: leg.to.latitude, lng: leg.to.longitude }
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline decoration-dotted"
          >
            {leg.instructions?.[0]?.text || 'Walk'}
          </a>
        ) : (
          <span>{leg.instructions?.[0]?.text || 'Walk'}</span>
        )}
        <span className="ml-1.5 text-white/40">{leg.durationMinutes}m · {(leg.distanceMeters * 0.000621371).toFixed(1)}mi</span>
        {!hasUsableCoords && (
          <div className="mt-0.5 text-[10px] text-white/35">
            Trip overview — walking directions are not provided by the transit data source.
          </div>
        )}
      </div>
    </div>
  );
}

function RideLeg({ leg }: { leg: TransitRideLeg }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="mt-0.5 text-green-400">🚌</span>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-green-300">{leg.routeShortName || leg.routeLongName}</span>
          <span className="text-white/50">→ {leg.headsign}</span>
        </div>
        <div className="mt-0.5 text-white/50">
          Board: <span className="text-white/70">{leg.boardingStop.stopName}</span> @ <span className="text-white/70">{leg.departureTime}</span>
        </div>
        <div className="text-white/50">
          Exit: <span className="text-white/70">{leg.exitStop.stopName}</span> @ <span className="text-white/70">{leg.arrivalTime}</span>
        </div>
        {leg.stopCount && leg.stopCount > 1 && (
          <div className="text-white/40 mt-0.5">{leg.stopCount} stops</div>
        )}
      </div>
    </div>
  );
}

function TripLeg({ leg }: { leg: TransitLeg }) {
  if (leg.type === 'walk') return <WalkLeg leg={leg} />;
  return <RideLeg leg={leg} />;
}

export function TransitTripCard({ transit, currentJob, onRefresh }: TransitTripCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { trip, status, error, deadlineStatus } = transit;

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-white/50 text-sm">
          {status === 'loading' ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              Finding transit route...
            </>
          ) : (
            'Configure Bus Mode to plan transit trips'
          )}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <div className="text-sm text-red-300">{error || 'Transit route not available'}</div>
        {onRefresh && (
          <button onClick={onRefresh} className="mt-2 text-xs text-cyan-400 hover:text-cyan-300">
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!trip) return null;

  const mapsUrls = getTransitMapsUrls(trip);
  const leaveByTime = formatLeaveByTime(trip);

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      status === 'stale'
        ? 'border-yellow-500/20 bg-yellow-500/5'
        : deadlineStatus?.onTime === false
          ? 'border-red-500/20 bg-red-500/5'
          : 'border-white/10 bg-white/5'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-white/90">
            {trip.totalDurationMinutes}m transit trip
          </div>
          <div className="text-xs text-white/50">
            {trip.legs.filter(l => l.type === 'transit').length} ride(s) · {trip.transferCount} transfer{trip.transferCount !== 1 ? 's' : ''} · {trip.totalWalkingMinutes}m walking
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <OnTimeBadge status={trip.onTimeStatus} />
          {deadlineStatus && currentJob?.deadline && (
            <div className={`text-[10px] font-medium ${
              deadlineStatus.onTime ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {deadlineStatus.label}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-white/70 mb-3 bg-white/5 rounded-lg px-3 py-2">
        <div>
          <span className="text-white/40">Depart</span>
          <div className="font-medium text-white/80">{trip.departureTime}</div>
        </div>
        <div className="flex-1 border-t border-dashed border-white/20" />
        <div className="text-right">
          <span className="text-white/40">Arrive</span>
          <div className="font-medium text-white/80">{trip.arrivalTime}</div>
        </div>
      </div>

      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2 mb-3">
        <div className="text-[10px] uppercase tracking-wider text-cyan-400/70 mb-0.5">Leave by</div>
        <div className="text-sm font-bold text-cyan-300">{leaveByTime}</div>
      </div>

      {status === 'stale' && (
        <button
          onClick={onRefresh}
          className="w-full mb-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-300 hover:bg-yellow-500/20 transition-colors"
        >
          ⚠ Route may be outdated — Refresh
        </button>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left text-xs text-white/40 hover:text-white/60 transition-colors"
      >
        {expanded ? '▾ Hide details' : '▸ Show route details'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
          {trip.legs.map((leg, i) => (
            <TripLeg key={i} leg={leg} />
          ))}

          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
            <a
              href={mapsUrls.google}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-center text-xs font-medium text-blue-300 hover:bg-blue-500/20 transition-colors"
            >
              Open in Google Maps
            </a>
            <a
              href={mapsUrls.apple}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-center text-xs font-medium text-white/60 hover:bg-white/10 transition-colors"
            >
              Apple Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
