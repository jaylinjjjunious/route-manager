import { createHash } from 'node:crypto';

const devices = new Set(['phone', 'tablet', 'computer']);
const actions = new Set(['opened_ce', 'proof_attached', 'completed']);
function date(value: unknown, name: string): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error(`Invalid ${name}.`);
  return new Date(value).toISOString();
}
function text(value: unknown, name: string, maximum: number): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string' || Buffer.byteLength(value) > maximum) throw new Error(`Invalid ${name}.`);
  return value;
}

export function normalizeProbationRecord(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a check-in record.');
  const r = input as Record<string, unknown>;
  if (typeof r.monthKey !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(r.monthKey)) throw new Error('Invalid reporting month.');
  if (typeof r.device !== 'string' || !devices.has(r.device)) throw new Error('Invalid device.');
  if (r.verificationLevel === 'provider_verified') throw new Error('Provider verification requires independent server evidence.');
  if (r.verificationLevel != null && !['self_confirmed', 'screenshot_documented'].includes(String(r.verificationLevel))) throw new Error('Invalid verification level.');
  const proofDataUrl = text(r.proofDataUrl, 'proof image', 2_000_000);
  if (proofDataUrl && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(proofDataUrl)) throw new Error('Invalid proof image.');
  if (!Array.isArray(r.events) || r.events.length > 1000) throw new Error('Invalid activity events.');
  const events = r.events.map(e => {
    if (!e || typeof e !== 'object' || !actions.has(e.type) || !devices.has(e.device)) throw new Error('Invalid activity event.');
    const at = date(e.at, 'event time');
    if (!at) throw new Error('Missing event time.');
    return { type: String(e.type), at, device: String(e.device) };
  });
  const uniqueEvents = [...new Map(events.map(e => [JSON.stringify(e), e])).values()].sort((a, b) => a.at.localeCompare(b.at));
  const startedAt = date(r.startedAt, 'start time');
  const completedAt = date(r.completedAt, 'completion time');
  const confirmationUrl = text(r.confirmationUrl, 'confirmation URL', 2048);
  if (confirmationUrl && !confirmationUrl.startsWith('https://')) throw new Error('Invalid confirmation URL.');
  return {
    monthKey: r.monthKey, device: r.device,
    startedAt, completedAt,
    verificationLevel: completedAt ? (proofDataUrl ? 'screenshot_documented' : 'self_confirmed') : undefined,
    proofName: text(r.proofName, 'proof name', 1024), proofDataUrl,
    providerReceiptId: text(r.providerReceiptId, 'receipt reference', 1024),
    confirmationUrl,
    confirmationMessageId: text(r.confirmationMessageId, 'message reference', 1024),
    events: uniqueEvents,
    clientUpdatedAt: date(r.clientUpdatedAt, 'update time') || uniqueEvents.at(-1)?.at || completedAt || startedAt || '1970-01-01T00:00:00.000Z',
  };
}
export function probationRequestKey(ownerId: string, record: ReturnType<typeof normalizeProbationRecord>) {
  return createHash('sha256').update(JSON.stringify({ ownerId, record })).digest('hex');
}
