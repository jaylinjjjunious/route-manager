/**
 * Orchestration layer for Transit API features.
 *
 * Responsibilities:
 * - Coordinate cache (fresh / stale-while-revalidate) with the rate limiter.
 * - Deduplicate identical concurrent requests.
 * - Queue requests when the 5/min budget is exhausted (bounded, with timeout).
 * - Normalize raw upstream responses into the canonical models in
 *   `transitTypes.ts`.
 * - Serve stale data immediately when the API is rate-limited, while quietly
 *   scheduling a background refresh.
 */

import { transitRequest, isTransitConfigured, getTransitConfig } from "./transitApiClient";
import { TransitCache } from "./transitCache";
import { TransitRateLimiter } from "./transitRateLimiter";
import {
  TransitApiError,
  isTransitError,
  NearbyStopsResult,
  ServiceAlertsResult,
  StopArrivalsResult,
  TransitAlert,
  TransitAlertSeverity,
  TransitArrival,
  TransitFreshness,
  TransitRoute,
  TransitStatus,
  TransitStop,
  TransitTrip,
  TripPlanResult,
  UpstreamAlert,
  UpstreamNearbyStop,
  UpstreamPlanResult,
} from "./transitTypes";

// Free-tier budget (5 requests/minute) enforced server-side.
export const MAX_REQUESTS_PER_MINUTE = 5;
const WINDOW_MS = 60_000;
/** Maximum time a queued request waits for a rate-limit slot. */
const QUEUE_WAIT_MS = 45_000;
const MAX_QUEUE_DEPTH = 8;

const TTL_NEARBY_MS = 5 * 60_000;
const TTL_ARRIVALS_MS = 45_000;
const TTL_PLAN_MS = 3 * 60_000;
const TTL_ALERTS_MS = 2 * 60_000;
const TTL_NETWORKS_MS = 24 * 60 * 60_000;

const DEFAULT_NETWORK_IDS = ["GET|Bakersfield"];

interface RunOptions<T> {
  cacheKey: string;
  ttlMs: number;
  /** Allow serving expired cache entries while rate-limited. */
  allowStale: boolean;
  fetchFresh: () => Promise<T>;
}

interface QueueEntry<T> {
  options: RunOptions<T>;
  resolve: (value: { data: T; freshness: TransitFreshness }) => void;
  reject: (err: unknown) => void;
  timer: NodeJS.Timeout;
}

const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;

function formatClock(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function coordLatLng(input: unknown): { lat: number; lng: number } {
  if (!input || typeof input !== "object") {
    throw new TransitApiError("TRANSIT_INVALID_LOCATION", "A valid origin and destination are required.", 400, false);
  }
  const record = input as Record<string, unknown>;
  const lat = typeof record.lat === "number" ? record.lat : typeof record.latitude === "number" ? record.latitude : Number.NaN;
  const lng = typeof record.lng === "number" ? record.lng : typeof record.longitude === "number" ? record.longitude : Number.NaN;
  return { lat, lng };
}

function assertValidCoordinate(lat: number, lng: number, label: string): void {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new TransitApiError("TRANSIT_INVALID_LOCATION", `${label} is outside valid coordinate ranges.`, 400, false);
  }
}

function freshnessFor(entry: { storedAt: number }, now = Date.now()): TransitFreshness {
  return { source: "cache", lastUpdatedAt: new Date(entry.storedAt).toISOString(), ageMs: now - entry.storedAt };
}

function freshnessLive(now = Date.now()): TransitFreshness {
  return { source: "live", lastUpdatedAt: new Date(now).toISOString(), ageMs: 0 };
}

function freshnessStale(entry: { storedAt: number }, now = Date.now()): TransitFreshness {
  return { source: "stale", lastUpdatedAt: new Date(entry.storedAt).toISOString(), ageMs: now - entry.storedAt };
}

// ─── Normalizers ───────────────────────────────────────────────────────

function normalizeAlertSeverity(severity?: string): TransitAlertSeverity {
  const value = (severity || "").toLowerCase();
  if (value === "severe") return "critical";
  if (value === "warning") return "warning";
  return "info";
}

export function normalizeAlert(raw: UpstreamAlert): TransitAlert {
  const id = `alert-${raw.created_at ?? 0}-${(raw.title || "").replace(/\s+/g, "-").slice(0, 40)}`;
  const affectedRoutes = Array.from(new Set((raw.informed_entities || []).map((e) => e.global_route_id).filter((v): v is string => !!v)));
  const affectedStops = Array.from(new Set((raw.informed_entities || []).map((e) => e.global_stop_id).filter((v): v is string => !!v)));
  const period = raw.active_periods && raw.active_periods.length > 0 ? raw.active_periods[0] : undefined;
  return {
    id,
    title: raw.title || "Transit alert",
    description: raw.description || "",
    severity: normalizeAlertSeverity(raw.severity),
    cause: raw.cause,
    effect: raw.effect,
    activeFrom: period?.start ?? null,
    activeUntil: period?.end ?? null,
    affectedRoutes: affectedRoutes.length > 0 ? affectedRoutes : undefined,
    affectedStops: affectedStops.length > 0 ? affectedStops : undefined,
  };
}

export function normalizeAlerts(raw: UpstreamAlert[] | undefined): TransitAlert[] {
  const alerts = (raw || []).map(normalizeAlert);
  const rank = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

function normalizeStop(raw: UpstreamNearbyStop): TransitStop {
  return {
    stopId: raw.global_stop_id || "",
    stopName: raw.stop_name || raw.global_stop_id || "Unnamed stop",
    latitude: typeof raw.stop_lat === "number" ? raw.stop_lat : 0,
    longitude: typeof raw.stop_lon === "number" ? raw.stop_lon : 0,
    distanceMeters: typeof raw.distance === "number" ? Math.round(raw.distance) : undefined,
    stopCode: raw.stop_code || undefined,
    wheelchairBoarding: typeof raw.wheelchair_boarding === "number" ? raw.wheelchair_boarding : undefined,
    routeType: typeof raw.route_type === "number" ? raw.route_type : undefined,
    cityName: raw.city_name || undefined,
  };
}

function routeShortNameFrom(raw: { compact_display_short_name?: { boxed_text?: string; elements?: (string | null)[] } } | undefined): string {
  const elements = raw?.compact_display_short_name?.elements || [];
  const fromElements = elements.find((e): e is string => typeof e === "string" && e.length > 0);
  return fromElements || raw?.compact_display_short_name?.boxed_text || "";
}

function normalizeRoute(raw: { global_route_id?: string; compact_display_short_name?: { boxed_text?: string; elements?: (string | null)[] }; network_id?: string; network_name?: string; mode_name?: string }): TransitRoute {
  return {
    routeId: raw.global_route_id || "",
    shortName: routeShortNameFrom(raw) || raw.global_route_id || "?",
    networkId: raw.network_id,
    networkName: raw.network_name,
    modeName: raw.mode_name,
  };
}

export function normalizeArrivals(raw: { route_departures?: unknown }): TransitArrival[] {
  const routeDepartures = (raw as { route_departures?: Array<{
    global_route_id?: string;
    compact_display_short_name?: { boxed_text?: string; elements?: (string | null)[] };
    network_id?: string;
    network_name?: string;
    mode_name?: string;
    merged_itineraries?: Array<{
      merged_headsign?: string;
      direction_headsign?: string;
      headsign?: string;
      schedule_items?: Array<{
        departure_time?: number;
        arrival_time?: number;
        scheduled_departure_time?: number;
        scheduled_arrival_time?: number;
        is_real_time?: boolean;
        is_cancelled?: boolean;
        is_last?: boolean;
        rt_trip_id?: string;
        trip_search_key?: string;
        wheelchair_accessible?: number;
      }>;
    }>;
  }> }).route_departures || [];
  const arrivals: TransitArrival[] = [];

  for (const rd of routeDepartures) {
    const route = normalizeRoute(rd);
    for (const itinerary of rd.merged_itineraries || []) {
      const headsign = itinerary.merged_headsign || itinerary.headsign || itinerary.direction_headsign || "";
      for (const item of itinerary.schedule_items || []) {
        if (typeof item.departure_time !== "number") continue;
        arrivals.push({
          tripId: item.rt_trip_id || item.trip_search_key || `trip-${item.departure_time}`,
          route,
          headsign,
          departureTime: item.departure_time,
          arrivalTime: typeof item.arrival_time === "number" ? item.arrival_time : item.departure_time,
          scheduledDepartureTime: typeof item.scheduled_departure_time === "number" ? item.scheduled_departure_time : item.departure_time,
          scheduledArrivalTime: typeof item.scheduled_arrival_time === "number" ? item.scheduled_arrival_time : item.departure_time,
          isRealTime: !!item.is_real_time,
          isCancelled: !!item.is_cancelled,
          isLast: !!item.is_last,
          wheelchairAccessible: typeof item.wheelchair_accessible === "number" ? item.wheelchair_accessible : undefined,
        });
      }
    }
  }

  arrivals.sort((a, b) => a.departureTime - b.departureTime);
  return arrivals;
}

function normalizePlanLegs(raw: UpstreamPlanResult): {
  legs: TransitTrip["legs"];
  totalWalkingMinutes: number;
  totalWalkingDistanceMeters: number;
  transferCount: number;
  alerts: TransitAlert[];
} {
  const legs: TransitTrip["legs"] = [];
  let totalWalkingMinutes = 0;
  let totalWalkingDistanceMeters = 0;
  let transitLegCount = 0;
  const alerts: TransitAlert[] = [];

  for (const rawLeg of raw.legs || []) {
    const durationMinutes = Math.round((rawLeg.duration || 0) / 60);
    if (rawLeg.leg_mode === "walk") {
      const distanceMeters = Math.round(rawLeg.distance || 0);
      totalWalkingMinutes += durationMinutes;
      totalWalkingDistanceMeters += distanceMeters;
      legs.push({
        type: "walk",
        from: { latitude: 0, longitude: 0 },
        to: { latitude: 0, longitude: 0 },
        durationMinutes,
        distanceMeters,
        instructions: [
          {
            text: "Walk to the transit stop",
            distanceMeters,
          },
        ],
        polyline: rawLeg.polyline,
      });
      continue;
    }

    // Transit leg
    const routes = rawLeg.routes || [];
    const primaryRoute = routes[0];
    const departures = rawLeg.departures || [];
    const departure = departures[0];
    transitLegCount += 1;

    const stops = primaryRoute?.stops || [];
    const boardStop = stops.length > 0 ? normalizeStop(stops[0]) : null;
    const exitStop = stops.length > 1 ? normalizeStop(stops[stops.length - 1]) : boardStop;
    const itinerary = primaryRoute?.itineraries?.[0];
    const headsign = itinerary?.merged_headsign || itinerary?.headsign || itinerary?.direction_headsign || "";

    for (const route of routes) {
      alerts.push(...normalizeAlerts(route?.alerts));
    }

    legs.push({
      type: "transit",
      routeShortName: routeShortNameFrom(primaryRoute) || primaryRoute?.global_route_id || undefined,
      routeLongName: undefined,
      routeId: primaryRoute?.global_route_id,
      headsign,
      agencyName: undefined,
      boardingStop:
        boardStop ||
        normalizeStop({ global_stop_id: `stop-${transitLegCount}-board`, stop_name: "Board" }),
      exitStop:
        exitStop ||
        normalizeStop({ global_stop_id: `stop-${transitLegCount}-exit`, stop_name: "Exit" }),
      departureTime: typeof departure?.departure_time === "number" ? formatClock(departure.departure_time) : "--:--",
      predictedDepartureTime: undefined,
      arrivalTime: typeof departure?.arrival_time === "number" ? formatClock(departure.arrival_time) : "--:--",
      predictedArrivalTime: undefined,
      stopCount: stops.length > 0 ? stops.length : undefined,
      isCancelled: departure?.is_cancelled,
    });
  }

  return {
    legs,
    totalWalkingMinutes,
    totalWalkingDistanceMeters,
    transferCount: Math.max(0, transitLegCount - 1),
    alerts,
  };
}

export function normalizePlan(raw: UpstreamPlanResult, origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, fetchedAt: string): TransitTrip | null {
  if (!raw || typeof raw.duration !== "number" || !raw.start_time || !raw.end_time) return null;
  const legStats = normalizePlanLegs(raw);
  const tripId = `plan-${round4(origin.lat)}-${round4(origin.lng)}-${round4(destination.lat)}-${round4(destination.lng)}-${raw.start_time}`;

  let fare: string | null = null;
  if (raw.fare && typeof raw.fare === "object") {
    const f = raw.fare as { price?: number; currency?: string; text?: string };
    fare = typeof f.text === "string" ? f.text : f.price !== undefined ? `${f.price}${f.currency ? " " + f.currency : ""}` : null;
  } else if (typeof raw.fare === "string") {
    fare = raw.fare;
  }

  return {
    tripId,
    origin: { latitude: origin.lat, longitude: origin.lng },
    destination: { latitude: destination.lat, longitude: destination.lng },
    departureTime: formatClock(raw.start_time),
    arrivalTime: formatClock(raw.end_time),
    totalDurationMinutes: Math.round(raw.duration / 60),
    totalWalkingMinutes: legStats.totalWalkingMinutes,
    totalWalkingDistanceMeters: legStats.totalWalkingDistanceMeters,
    transferCount: legStats.transferCount,
    legs: legStats.legs,
    alerts: legStats.alerts,
    fare,
    provider: "transit-api",
    fetchedAt,
  };
}

// ─── Service ───────────────────────────────────────────────────────────

export class TransitService {
  private readonly cache = new TransitCache();
  private readonly limiter = new TransitRateLimiter({ max: MAX_REQUESTS_PER_MINUTE, windowMs: WINDOW_MS });
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly queue: QueueEntry<unknown>[] = [];
  private readonly backgroundRefreshKeys = new Set<string>();
  private pumpScheduled = false;
  private lastSuccessfulRequestAt: string | null = null;
  private lastError: { code: string; message: string; at: string } | null = null;

  async getNearbyStops(lat: number, lng: number, radiusMeters: number, limit: number): Promise<NearbyStopsResult> {
    assertValidCoordinate(lat, lng, "Location");
    const safeRadius = Number.isFinite(radiusMeters) ? Math.min(2000, Math.max(100, Math.round(radiusMeters))) : 1000;
    const safeLimit = Number.isFinite(limit) ? Math.min(25, Math.max(1, Math.round(limit))) : 10;

    const result = await this.runScheduled<TransitStop[]>({
      cacheKey: `nearby:${round4(lat)},${round4(lng)}:${safeRadius}`,
      ttlMs: TTL_NEARBY_MS,
      allowStale: true,
      fetchFresh: async () => {
        const data = await transitRequest<{ stops?: UpstreamNearbyStop[] }>("/public/nearby_stops", {
          params: { lat, lon: lng, max_distance: safeRadius },
        });
        const stops = (data.stops || []).map(normalizeStop).sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
        return stops.slice(0, safeLimit);
      },
    });

    return { stops: result.data, freshness: result.freshness };
  }

  async getStopArrivals(stopId: string): Promise<StopArrivalsResult> {
    if (!stopId || typeof stopId !== "string") {
      throw new TransitApiError("TRANSIT_STOP_NOT_FOUND", "A valid stop id is required.", 400, false);
    }
    const result = await this.runScheduled<{ stop: TransitStop | null; arrivals: TransitArrival[] }>({
      cacheKey: `arrivals:${stopId}`,
      ttlMs: TTL_ARRIVALS_MS,
      allowStale: true,
      fetchFresh: async () => {
        const data = await transitRequest<{ route_departures?: unknown }>("/public/stop_departures", {
          params: { global_stop_id: stopId, should_update_realtime: true },
        });
        const arrivals = normalizeArrivals(data).slice(0, 40);
        let stop: TransitStop | null = null;
        const routeDepartures = (data as { route_departures?: Array<{ merged_itineraries?: Array<{ closest_stop?: UpstreamNearbyStop }> }> }).route_departures || [];
        for (const rd of routeDepartures) {
          const closest = rd.merged_itineraries?.[0]?.closest_stop;
          if (closest) {
            stop = normalizeStop(closest);
            break;
          }
        }
        return { stop, arrivals };
      },
    });

    return { stop: result.data.stop, arrivals: result.data.arrivals, freshness: result.freshness };
  }

  async planTrip(origin: unknown, destination: unknown, departureTime?: string, arrivalTime?: string): Promise<TripPlanResult> {
    const from = coordLatLng(origin);
    const to = coordLatLng(destination);
    assertValidCoordinate(from.lat, from.lng, "Origin");
    assertValidCoordinate(to.lat, to.lng, "Destination");

    const params: Record<string, string | number | boolean | undefined> = {
      from_lat: from.lat,
      from_lon: from.lng,
      to_lat: to.lat,
      to_lon: to.lng,
    };

    let timeKey = "now";
    const departureDate = departureTime ? new Date(departureTime) : null;
    const arrivalDate = arrivalTime ? new Date(arrivalTime) : null;
    if (departureDate && !Number.isNaN(departureDate.getTime())) {
      params.date = departureDate.toISOString().slice(0, 10);
      params.time = departureDate.toISOString().slice(11, 16);
      timeKey = departureDate.toISOString();
    } else if (arrivalDate && !Number.isNaN(arrivalDate.getTime())) {
      params.date = arrivalDate.toISOString().slice(0, 10);
      params.time = arrivalDate.toISOString().slice(11, 16);
      params.arriveBy = true;
      timeKey = `arrive-by-${arrivalDate.toISOString()}`;
    }

    const result = await this.runScheduled<TransitTrip[]>({
      cacheKey: `plan:${round4(from.lat)}:${round4(from.lng)}:${round4(to.lat)}:${round4(to.lng)}:${timeKey}`,
      ttlMs: TTL_PLAN_MS,
      allowStale: true,
      fetchFresh: async () => {
        const data = await transitRequest<{ results?: UpstreamPlanResult[] }>("/public/plan", { params });
        const fetchedAt = new Date().toISOString();
        const trips = (data.results || [])
          .map((raw) => normalizePlan(raw, from, to, fetchedAt))
          .filter((t): t is TransitTrip => t !== null)
          .sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
        return trips;
      },
    });

    if (result.data.length === 0) {
      throw new TransitApiError("TRANSIT_TRIP_NOT_FOUND", "No transit route was found for this trip.", 404, false);
    }

    return { trip: result.data[0], alternatives: result.data.length - 1, freshness: result.freshness };
  }

  async getServiceAlerts(lat?: number, lng?: number): Promise<ServiceAlertsResult> {
    const result = await this.runScheduled<TransitAlert[]>({
      cacheKey: "alerts",
      ttlMs: TTL_ALERTS_MS,
      allowStale: true,
      fetchFresh: async () => {
        const networkIds = await this.resolveNetworkIds(lat, lng);
        if (networkIds.length === 0) return [];
        const data = await transitRequest<{ alerts?: UpstreamAlert[] }>("/public/alerts_for_networks", {
          params: { network_ids: networkIds.join(",") },
        });
        return normalizeAlerts(data.alerts);
      },
    });

    return { alerts: result.data, freshness: result.freshness };
  }

  getStatus(): TransitStatus {
    const rateLimit = this.limiter.getStatus();
    const cache = this.cache.getStatus();
    const config = getTransitConfig();
    return {
      configured: isTransitConfigured(),
      provider: "transit-api",
      networks: config.networkIds,
      rateLimit,
      cache: { size: cache.size, capacity: cache.capacity },
      ttlSeconds: {
        nearby: TTL_NEARBY_MS / 1000,
        arrivals: TTL_ARRIVALS_MS / 1000,
        tripPlan: TTL_PLAN_MS / 1000,
        alerts: TTL_ALERTS_MS / 1000,
      },
      lastSuccessfulRequestAt: this.lastSuccessfulRequestAt,
      lastError: this.lastError,
    };
  }

  clearCache(): { size: number; capacity: number } {
    this.cache.clear();
    return { size: this.cache.size, capacity: this.cache.capacity };
  }

  // ─── Internal coordination ───────────────────────────────────────────

  private async resolveNetworkIds(lat?: number, lng?: number): Promise<string[]> {
    const configured = getTransitConfig().networkIds;
    const cached = this.cache.getStale<string[]>("networks");
    if (cached) return cached.value;

    const hasLocation = typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
    if (!hasLocation) return configured;

    try {
      const data = await transitRequest<{ networks?: Array<{ network_id?: string }> }>("/public/available_networks", {
        params: { lat, lon: lng },
      });
      const discovered = Array.from(new Set((data.networks || []).map((n) => n.network_id).filter((v): v is string => !!v)));
      const ids = discovered.length > 0 ? discovered : configured;
      this.cache.set("networks", ids, TTL_NETWORKS_MS);
      return ids;
    } catch {
      this.cache.set("networks", configured, TTL_NETWORKS_MS);
      return configured;
    }
  }

  private async runScheduled<T>(options: RunOptions<T>): Promise<{ data: T; freshness: TransitFreshness }> {
    // 1. Fresh cache hit.
    const cached = this.cache.get<T>(options.cacheKey);
    if (cached) return { data: cached.value, freshness: freshnessFor(cached) };

    // 2. Deduplicate identical in-flight requests.
    const inFlight = this.inFlight.get(options.cacheKey);
    if (inFlight) return inFlight as Promise<{ data: T; freshness: TransitFreshness }>;

    const promise = this.executeScheduled<T>(options);
    this.inFlight.set(options.cacheKey, promise);
    try {
      return await promise;
    } finally {
      this.inFlight.delete(options.cacheKey);
    }
  }

  private async executeScheduled<T>(options: RunOptions<T>): Promise<{ data: T; freshness: TransitFreshness }> {
    this.limiter.beginPending();
    try {
      if (this.limiter.tryAcquire()) {
        return await this.fetchAndStore(options);
      }

      // Rate-limited: serve stale data immediately and refresh in background.
      const stale = this.cache.getStale<T>(options.cacheKey);
      if (stale && options.allowStale) {
        this.scheduleBackgroundRefresh(options);
        return { data: stale.value, freshness: freshnessStale(stale) };
      }

      // No data at all: queue and wait for a free slot.
      return await this.enqueue(options);
    } finally {
      this.limiter.endPending();
    }
  }

  private async fetchAndStore<T>(options: RunOptions<T>): Promise<{ data: T; freshness: TransitFreshness }> {
    this.limiter.beginInFlight();
    try {
      const data = await options.fetchFresh();
      this.cache.set(options.cacheKey, data, options.ttlMs);
      this.lastSuccessfulRequestAt = new Date().toISOString();
      return { data, freshness: freshnessLive() };
    } catch (err) {
      if (isTransitError(err)) {
        this.lastError = { code: err.code, message: err.message, at: new Date().toISOString() };
        // A slot was granted but the upstream never answered: return it.
        if (!err.reachedUpstream) this.limiter.release();
      } else {
        this.lastError = { code: "TRANSIT_TEMPORARILY_UNAVAILABLE", message: err instanceof Error ? err.message : String(err), at: new Date().toISOString() };
        this.limiter.release();
      }
      throw err;
    } finally {
      this.limiter.endInFlight();
      this.schedulePump();
    }
  }

  private scheduleBackgroundRefresh<T>(options: RunOptions<T>): void {
    if (this.backgroundRefreshKeys.has(options.cacheKey)) return;
    if (this.queue.length >= MAX_QUEUE_DEPTH) return;
    this.backgroundRefreshKeys.add(options.cacheKey);
    this.enqueue(options)
      .catch(() => {
        // Background refreshes are best-effort.
      })
      .finally(() => {
        this.backgroundRefreshKeys.delete(options.cacheKey);
      });
  }

  private enqueue<T>(options: RunOptions<T>): Promise<{ data: T; freshness: TransitFreshness }> {
    if (this.queue.length >= MAX_QUEUE_DEPTH) {
      throw new TransitApiError(
        "TRANSIT_RATE_LIMITED",
        "Too many transit requests right now. Try again shortly.",
        429,
        false
      );
    }

    return new Promise<{ data: T; freshness: TransitFreshness }>((resolve, reject) => {
      const entry: QueueEntry<T> = {
        options,
        resolve,
        reject,
        timer: setTimeout(() => {
          const index = this.queue.indexOf(entry as unknown as QueueEntry<unknown>);
          if (index >= 0) this.queue.splice(index, 1);
          reject(new TransitApiError("TRANSIT_RATE_LIMITED", "The Transit API rate limit was reached. Try again in a minute.", 429, false));
        }, QUEUE_WAIT_MS),
      };
      this.queue.push(entry as unknown as QueueEntry<unknown>);
      this.schedulePump();
    });
  }

  private schedulePump(): void {
    if (this.pumpScheduled) return;
    this.pumpScheduled = true;
    setTimeout(() => {
      this.pumpScheduled = false;
      this.pump();
    }, 0);
  }

  private pump(): void {
    while (this.queue.length > 0 && this.limiter.tryAcquire()) {
      const entry = this.queue.shift() as QueueEntry<unknown>;
      clearTimeout(entry.timer);
      const result = this.fetchAndStore(entry.options)
        .then(
          (value) => entry.resolve(value),
          (err) => entry.reject(err)
        );
      // Keep the pump running after completion so queued work continues.
      void result;
    }
  }
}
