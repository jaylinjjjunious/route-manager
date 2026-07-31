/**
 * Server-side canonical types for the official Transit API integration.
 *
 * The upstream Transit v4 API (https://external.transitapp.com/v4) returns
 * deeply nested responses. These types describe (a) the normalized domain
 * models the rest of the server and the frontend consume, and (b) the raw
 * upstream response shapes used by the normalizers in `transitService.ts`.
 *
 * These mirror the canonical models in `src/types.ts` on purpose: the server
 * cannot import client code (it is bundled separately), so the contract is
 * duplicated and kept in sync by convention.
 */

export type TransitErrorCode =
  | "TRANSIT_NOT_CONFIGURED"
  | "TRANSIT_RATE_LIMITED"
  | "TRANSIT_TEMPORARILY_UNAVAILABLE"
  | "TRANSIT_INVALID_LOCATION"
  | "TRANSIT_STOP_NOT_FOUND"
  | "TRANSIT_TRIP_NOT_FOUND"
  | "TRANSIT_AUTH_FAILED"
  | "TRANSIT_MONTHLY_BUDGET_EXHAUSTED";

export class TransitApiError extends Error {
  readonly code: TransitErrorCode;
  readonly status: number;
  /** Network-level failures are the only ones we retry (see transitApiClient). */
  readonly retryable: boolean;
  /** True when the upstream server returned an HTTP response for this attempt. */
  readonly reachedUpstream: boolean;

  constructor(
    code: TransitErrorCode,
    message: string,
    status: number,
    retryable: boolean,
    reachedUpstream = true
  ) {
    super(message);
    this.name = "TransitApiError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.reachedUpstream = reachedUpstream;
  }
}

export function isTransitError(err: unknown): err is TransitApiError {
  return err instanceof TransitApiError;
}

// ─── Canonical (normalized) models ─────────────────────────────────────

export interface TransitStop {
  stopId: string;
  stopName: string;
  latitude: number;
  longitude: number;
  /**
   * False when the upstream response did not include usable coordinates.
   * Such a stop must not be presented as navigable (no map/plan-from actions).
   */
  coordinatesAvailable?: boolean;
  distanceMeters?: number;
  stopCode?: string;
  wheelchairBoarding?: number;
  routeType?: number;
  cityName?: string;
}

export interface TransitRoute {
  routeId: string;
  shortName: string;
  longName?: string;
  color?: string;
  textColor?: string;
  networkId?: string;
  networkName?: string;
  modeName?: string;
}

export interface TransitArrival {
  tripId: string;
  route: TransitRoute;
  headsign: string;
  /** Unix seconds (UTC). */
  departureTime: number;
  /** Unix seconds (UTC). */
  arrivalTime: number;
  scheduledDepartureTime: number;
  scheduledArrivalTime: number;
  isRealTime: boolean;
  isCancelled: boolean;
  isLast: boolean;
  wheelchairAccessible?: number;
}

export type TransitAlertSeverity = "info" | "warning" | "critical";

export interface TransitAlert {
  id: string;
  title: string;
  description: string;
  severity: TransitAlertSeverity;
  cause?: string;
  effect?: string;
  activeFrom?: number | null;
  activeUntil?: number | null;
  affectedRoutes?: string[];
  affectedStops?: string[];
}

export interface TransitPoint {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface TransitInstruction {
  text: string;
  distanceMeters?: number;
}

export interface TransitWalkLeg {
  type: "walk";
  from: TransitPoint;
  to: TransitPoint;
  durationMinutes: number;
  distanceMeters: number;
  /**
   * False when the leg endpoints are placeholders (the upstream plan leg did
   * not expose coordinates). Such a leg is a trip overview (duration/distance)
   * and must not be presented as turn-by-turn walking navigation.
   */
  coordinatesAvailable?: boolean;
  instructions: TransitInstruction[];
  polyline?: string;
}

export interface TransitRideLeg {
  type: "transit";
  routeShortName?: string;
  routeLongName?: string;
  routeId?: string;
  headsign?: string;
  agencyName?: string;
  boardingStop: TransitStop;
  exitStop: TransitStop;
  departureTime: string;
  predictedDepartureTime?: string;
  arrivalTime: string;
  predictedArrivalTime?: string;
  stopCount?: number;
  isCancelled?: boolean;
}

export type TransitLeg = TransitWalkLeg | TransitRideLeg;

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
  legs: TransitLeg[];
  alerts: TransitAlert[];
  fare?: string | null;
  provider: string;
  fetchedAt: string;
}

export type TransitFreshnessSource = "live" | "cache" | "stale";

export interface TransitFreshness {
  source: TransitFreshnessSource;
  lastUpdatedAt: string;
  ageMs: number;
}

export interface NearbyStopsResult {
  stops: TransitStop[];
  freshness: TransitFreshness;
}

export interface StopArrivalsResult {
  stop: TransitStop | null;
  arrivals: TransitArrival[];
  freshness: TransitFreshness;
}

export interface TripPlanResult {
  trip: TransitTrip;
  alternatives: number;
  freshness: TransitFreshness;
}

export interface ServiceAlertsResult {
  alerts: TransitAlert[];
  freshness: TransitFreshness;
}

export interface RateLimitStatus {
  limit: number;
  used: number;
  remaining: number;
  windowStartMs: number;
  nextAvailableAtMs: number;
  pending: number;
  inFlight: number;
}

export type TransitBudgetLevel = "normal" | "warning" | "reduce" | "reserve" | "exhausted";

export interface TransitMonthlyStatus {
  month: string;
  limit: number;
  used: number;
  remaining: number;
  lastRequestAt: string | null;
  level: TransitBudgetLevel;
  byCategory: { nearby?: number; arrivals?: number; plan?: number; alerts?: number; networks?: number };
  estimated: true;
}

export interface TransitStatus {
  configured: boolean;
  provider: string;
  networks: string[];
  rateLimit: RateLimitStatus;
  cache: { size: number; capacity: number };
  ttlSeconds: { nearby: number; arrivals: number; tripPlan: number; alerts: number };
  monthly: TransitMonthlyStatus;
  lastSuccessfulRequestAt: string | null;
  lastError: { code: string; message: string; at: string } | null;
}

// ─── Raw upstream shapes (used by the normalizers) ─────────────────────

export interface UpstreamNearbyStop {
  city_name?: string;
  distance?: number;
  global_stop_id?: string;
  location_type?: number;
  parent_station?: string | null;
  raw_stop_id?: string;
  route_type?: number;
  rt_stop_id?: string;
  stop_code?: string;
  stop_lat?: number;
  stop_lon?: number;
  stop_name?: string;
  wheelchair_boarding?: number;
}

export interface UpstreamNearbyStopsResponse {
  stops?: UpstreamNearbyStop[];
}

export interface UpstreamScheduleItem {
  arrival_time?: number;
  departure_time?: number;
  internal_itinerary_id?: string;
  is_cancelled?: boolean;
  is_last?: boolean;
  is_real_time?: boolean;
  rt_trip_id?: string;
  scheduled_arrival_time?: number;
  scheduled_departure_time?: number;
  trip_search_key?: string;
  wheelchair_accessible?: number;
}

export interface UpstreamMergedItinerary {
  closest_stop?: UpstreamNearbyStop;
  direction_id?: number;
  direction_headsign?: string;
  headsign?: string;
  merged_headsign?: string;
  itinerary_ids?: string[];
  schedule_items?: UpstreamScheduleItem[];
}

export interface UpstreamRouteDeparture {
  alerts?: unknown[];
  compact_display_short_name?: { boxed_text?: string; elements?: (string | null)[]; route_name_redundancy?: boolean };
  global_route_id?: string;
  global_stop_id?: string;
  merged_itineraries?: UpstreamMergedItinerary[];
}

export interface UpstreamStopDeparturesResponse {
  route_departures?: UpstreamRouteDeparture[];
}

export interface UpstreamCompactDisplayShortName {
  boxed_text?: string;
  elements?: (string | null)[];
  route_name_redundancy?: boolean;
}

export interface UpstreamItinerary {
  branch_code?: string;
  canonical_itinerary?: boolean;
  direction_headsign?: string;
  direction_id?: number;
  headsign?: string;
  internal_itinerary_id?: string;
  is_active?: boolean;
  merged_headsign?: string;
}

export interface UpstreamPlanDeparture {
  arrival_time?: number;
  departure_time?: number;
  is_cancelled?: boolean;
  is_real_time?: boolean;
  plan_details?: {
    arrival_schedule_item?: unknown;
    global_route_id?: string;
    internal_itinerary_id?: string;
    stop_schedule_items?: unknown[];
  };
}

export interface UpstreamPlanRoute {
  alerts?: UpstreamAlert[];
  compact_display_short_name?: UpstreamCompactDisplayShortName;
  fares?: unknown[];
  global_route_id?: string;
  itineraries?: UpstreamItinerary[];
  stops?: UpstreamNearbyStop[];
}

export interface UpstreamPlanLeg {
  distance?: number;
  duration?: number;
  end_time?: number;
  leg_mode?: "walk" | "transit" | string;
  polyline?: string;
  start_time?: number;
  routes?: UpstreamPlanRoute[];
  departures?: UpstreamPlanDeparture[];
}

export interface UpstreamPlanResult {
  accessibility?: string;
  duration?: number;
  end_time?: number;
  fare?: unknown;
  legs?: UpstreamPlanLeg[];
  start_time?: number;
}

export interface UpstreamPlanResponse {
  error?: string;
  results?: UpstreamPlanResult[];
}

export interface UpstreamAlert {
  active_periods?: Array<{ end?: number | null; start?: number | null }>;
  cause?: string;
  created_at?: number;
  description?: string;
  effect?: string;
  informed_entities?: Array<{ global_route_id?: string; global_stop_id?: string }>;
  severity?: string;
  title?: string;
}

export interface UpstreamAlertsResponse {
  alerts?: UpstreamAlert[];
}

export interface UpstreamNetwork {
  network_id?: string;
  network_name?: string;
}

export interface UpstreamAvailableNetworksResponse {
  networks?: UpstreamNetwork[];
}
