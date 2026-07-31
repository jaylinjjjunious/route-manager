/**
 * Express routes for the Transit API integration.
 *
 * Every route is guarded by the existing Supabase `requireAuth` middleware so
 * the server-side Transit API key is only ever reachable through authenticated
 * app sessions.
 *
 * Routes:
 *   GET  /api/transit/status            Service + rate-limit + cache status
 *   POST /api/transit/cache/clear       Reset the in-memory response cache
 *   GET  /api/transit/nearby-stops      Nearby stops (lat, lon, radiusMeters, limit)
 *   GET  /api/transit/stops/:stopId/arrivals  Live arrivals for a stop
 *   POST /api/transit/trip-plan         Plan a transit trip
 *   GET  /api/transit/alerts            Active service alerts
 */

import { Router } from "express";
import { TransitService } from "./transitService";
import { isTransitError, TransitErrorCode } from "./transitTypes";

const ERROR_STATUS: Record<TransitErrorCode, number> = {
  TRANSIT_NOT_CONFIGURED: 503,
  TRANSIT_RATE_LIMITED: 429,
  TRANSIT_TEMPORARILY_UNAVAILABLE: 503,
  TRANSIT_INVALID_LOCATION: 400,
  TRANSIT_STOP_NOT_FOUND: 404,
  TRANSIT_TRIP_NOT_FOUND: 404,
  TRANSIT_AUTH_FAILED: 502,
};

function handleError(res: { status: (code: number) => { json: (body: unknown) => void } }, err: unknown): void {
  if (isTransitError(err)) {
    res.status(ERROR_STATUS[err.code]).json({ error: err.message, code: err.code });
    return;
  }
  res.status(500).json({ error: err instanceof Error ? err.message : "Internal transit error." });
}

export function createTransitRouter(requireAuth: (req: unknown, res: unknown, next: unknown) => void): Router {
  const router = Router();
  const service = new TransitService();

  router.get("/status", requireAuth, (_req, res) => {
    res.json(service.getStatus());
  });

  router.post("/cache/clear", requireAuth, (_req, res) => {
    const cleared = service.clearCache();
    res.json({ ok: true, ...cleared });
  });

  router.get("/nearby-stops", requireAuth, async (req, res) => {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      const radiusMeters = req.query.radiusMeters !== undefined ? Number(req.query.radiusMeters) : 1000;
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : 10;
      const result = await service.getNearbyStops(lat, lon, radiusMeters, limit);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get("/stops/:stopId/arrivals", requireAuth, async (req, res) => {
    try {
      const stopId = String(req.params.stopId || "");
      const result = await service.getStopArrivals(stopId);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post("/trip-plan", requireAuth, async (req, res) => {
    try {
      const { origin, destination, departureTime, arrivalTime } = (req.body || {}) as {
        origin?: unknown;
        destination?: unknown;
        departureTime?: string;
        arrivalTime?: string;
      };
      const result = await service.planTrip(origin, destination, departureTime, arrivalTime);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get("/alerts", requireAuth, async (req, res) => {
    try {
      const lat = req.query.lat !== undefined ? Number(req.query.lat) : undefined;
      const lon = req.query.lon !== undefined ? Number(req.query.lon) : undefined;
      const result = await service.getServiceAlerts(lat, lon);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  return router;
}
