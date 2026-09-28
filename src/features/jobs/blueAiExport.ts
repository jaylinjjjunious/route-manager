export interface BlueAiExportRow {
  order_number: string;
  title: string | null;
  city: string | null;
  pay: string | null;
  schedule: string | null;
  status: string | null;
  description: string | null;
}

export interface BlueAiExport {
  assigned_work_orders: BlueAiExportRow[];
  available_jobs: BlueAiExportRow[];
}

export const BLUEAI_EXPORT_MAX_BYTES = 256 * 1024;

/** Review data only: never infer dates or create scheduled jobs from an offer. */
export function parseBlueAiExport(raw: string): BlueAiExport {
  if (new TextEncoder().encode(raw).length > BLUEAI_EXPORT_MAX_BYTES) throw new Error('Choose a JSON file smaller than 256 KB.');
  let input: unknown;
  try { input = JSON.parse(raw); } catch { throw new Error('This file is not valid JSON.'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a BlueAI export object.');
  const body = input as Record<string, unknown>;
  const seen = new Set<string>();
  const readRows = (key: keyof BlueAiExport, category: string): BlueAiExportRow[] => {
    const rows = body[key];
    if (!Array.isArray(rows) || rows.length > 100) throw new Error(`Expected ${key} with at most 100 records.`);
    return rows.map(value => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Each record must be an object.');
      const row = value as Record<string, unknown>;
      const text = (field: string, max = 1000): string | null => {
        const value = row[field];
        if (value === undefined || value === null || value === '') return null;
        if (typeof value !== 'string' || value.length > max) throw new Error(`Invalid ${field} in export.`);
        return value.trim() || null;
      };
      const id = text('order_number', 200);
      if (!id) throw new Error('Every record needs an order number.');
      if (seen.has(id)) throw new Error('Duplicate order number: export each order in only one category.');
      seen.add(id);
      if (row.category != null && (typeof row.category !== 'string' || row.category.toLowerCase() !== category)) {
        throw new Error('A record category disagrees with its assigned or available group.');
      }
      let pay: string | null;
      if (typeof row.pay === 'number') {
        if (!Number.isFinite(row.pay) || row.pay < 0) throw new Error('Invalid pay in export.');
        pay = `$${row.pay.toFixed(2)}`;
      } else { pay = text('pay', 100); }
      return { order_number: id, title: text('title', 300), city: text('city', 300), pay,
        schedule: text('schedule', 300), status: text('status', 200), description: text('description', 4000) };
    });
  };
  return { assigned_work_orders: readRows('assigned_work_orders', 'assigned'), available_jobs: readRows('available_jobs', 'available') };
}
