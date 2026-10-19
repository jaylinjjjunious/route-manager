import { createHash } from 'node:crypto';
import type { Job, Coordinates } from '../../src/types';
import { isValidScheduledDate, addDays } from '../../src/features/jobs/jobSchedule';

export class InvalidBlueAiPayload extends Error {}

export interface BlueAiRecord {
  sourceApp: 'barrister';
  externalId: string;
  category: 'assigned' | 'available';
  title: string;
  city: string | null;
  payRaw: string | null;
  scheduleRaw: string | null;
  statusRaw: string | null;
  descriptionRaw: string | null;
  sourcePayload: Record<string, unknown>;
}

function sanitizeText(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) return trimmed.slice(0, max);
  return trimmed;
}

function validateOrderNumber(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InvalidBlueAiPayload('Every record needs an order number.');
  }
  return value.trim();
}

export function normalizeBarristerExport(input: unknown, ownerId: string): BlueAiRecord[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new InvalidBlueAiPayload('Expected a Barrister export object.');
  }
  const body = input as Record<string, unknown>;
  const assigned = body.assigned_work_orders;
  const available = body.available_jobs;
  if (!Array.isArray(assigned) || !Array.isArray(available)) {
    throw new InvalidBlueAiPayload('Expected assigned_work_orders and available_jobs arrays.');
  }

  const seen = new Map<string, { category: 'assigned' | 'available'; index: number }>();
  const results: BlueAiRecord[] = [];

  const processCategory = (records: unknown[], category: 'assigned' | 'available') => {
    if (!Array.isArray(records)) return;
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        throw new InvalidBlueAiPayload('Each record must be an object.');
      }
      const row = record as Record<string, unknown>;
      const externalId = validateOrderNumber(row.order_number);
      const existing = seen.get(externalId);
      if (existing) {
        if (existing.category === 'assigned') continue;
        results[existing.index] = {
          ...results[existing.index],
          category: 'assigned',
        };
        seen.set(externalId, { category: 'assigned', index: existing.index });
        continue;
      }
      const entry: BlueAiRecord = {
        sourceApp: 'barrister',
        externalId,
        category,
        title: sanitizeText(row.title, 200) ?? 'Untitled work order',
        city: sanitizeText(row.city, 300),
        payRaw: sanitizeText(row.pay, 100),
        scheduleRaw: sanitizeText(row.schedule, 300),
        statusRaw: sanitizeText(row.status, 200),
        descriptionRaw: sanitizeText(row.description, 4000),
        sourcePayload: row,
      };
      seen.set(externalId, { category, index: results.length });
      results.push(entry);
    }
  };

  processCategory(available, 'available');
  processCategory(assigned, 'assigned');

  return results;
}

export function normalizeBlueAiPayload(input: unknown, ownerId: string): Job {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InvalidBlueAiPayload('Expected one job object.');
  const body = input as Record<string, unknown>;
  const allowed = ['title', 'date', 'startTime', 'endTime', 'endDate', 'location', 'pay', 'sourceApp', 'externalId', 'timezone', 'coordinates'];
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new InvalidBlueAiPayload('Unknown payload field.');
  const text = (key: string, max: number): string => {
    const value = body[key];
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
      throw new InvalidBlueAiPayload(`Invalid ${key}.`);
    }
    return value.trim();
  };
  const title = text('title', 200);
  const location = text('location', 1000);
  const sourceApp = text('sourceApp', 100).toLowerCase();
  const externalId = text('externalId', 200);
  const date = text('date', 10);
  const endDate = body.endDate === undefined ? date : text('endDate', 10);
  if (!isValidScheduledDate(date) || !isValidScheduledDate(endDate) || ![date, addDays(date, 1)].includes(endDate)) {
    throw new InvalidBlueAiPayload('Use valid YYYY-MM-DD dates; endDate must be the same or next day.');
  }
  const startTime = text('startTime', 5);
  const endTime = text('endTime', 5);
  if (![startTime, endTime].every(time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new InvalidBlueAiPayload('Times must use 24-hour HH:mm.');
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const duration = minutes(endTime) - minutes(startTime) + (endDate === date ? 0 : 1440);
  if (duration <= 0 || duration > 1440) throw new InvalidBlueAiPayload('End must follow start, within 24 hours.');
  if (body.timezone !== undefined && body.timezone !== 'America/Los_Angeles') {
    throw new InvalidBlueAiPayload('v1 accepts America/Los_Angeles planning times only.');
  }
  const payKnown = body.pay !== undefined && body.pay !== null;
  if (payKnown && (typeof body.pay !== 'number' || !Number.isFinite(body.pay) || body.pay < 0 || body.pay > 1000000)) {
    throw new InvalidBlueAiPayload('pay must be a nonnegative numeric USD amount or null.');
  }
  let coordinates: Coordinates = { lat: 0, lng: 0 };
  if (body.coordinates !== undefined) {
    const coords = body.coordinates as Coordinates;
    if (!coords || typeof coords !== 'object' || Array.isArray(coords) ||
      typeof coords.lat !== 'number' || !Number.isFinite(coords.lat) || Math.abs(coords.lat) > 90 ||
      typeof coords.lng !== 'number' || !Number.isFinite(coords.lng) || Math.abs(coords.lng) > 180) {
      throw new InvalidBlueAiPayload('Invalid coordinates.');
    }
    coordinates = { lat: coords.lat, lng: coords.lng };
  }
  const id = 'blueai-' + createHash('sha256').update(JSON.stringify([ownerId, sourceApp, externalId])).digest('hex');
  return {
    id, storeName: title, address: location, pay: payKnown ? Math.round((body.pay as number) * 100) / 100 : 0,
    estimatedMinutes: duration, jobType: 'field_task', dueTime: endTime, notes: '', status: 'ready',
    routeId: coordinates.lat === 0 && coordinates.lng === 0 ? 'B' : 'A', coordinates, scheduledDate: date,
    blueAi: { ownerId, sourceApp, externalId, revision: 1, startTime, endTime, endDate,
      timezone: 'America/Los_Angeles', payKnown },
  };
}
