import { describe, expect, it } from 'vitest';
import { parseBlueAiExport } from '../src/features/jobs/blueAiExport';
const row = { order_number: 'sample-1', category: 'Available', title: 'Example repair', city: 'Example City', schedule: '09/29 17:00', pay: '$35.0' };
const payload = (available_jobs: unknown = [row], assigned_work_orders: unknown = []) => JSON.stringify({ available_jobs, assigned_work_orders });
describe('BlueAI review export', () => {
  it('keeps offers separate and preserves incomplete source schedules', () => {
    const result = parseBlueAiExport(payload());
    expect(result.assigned_work_orders).toEqual([]);
    expect(result.available_jobs[0].schedule).toBe('09/29 17:00');
    expect(result.available_jobs[0].status).toBeNull();
    expect(result.available_jobs[0]).not.toHaveProperty('scheduledDate');
  });
  it('rejects duplicates across categories rather than silently assigning offers', () => {
    expect(() => parseBlueAiExport(payload([row], [{ ...row, category: 'Assigned' }]))).toThrow('Duplicate');
  });
  it('rejects contradictory categories and malformed input', () => {
    expect(() => parseBlueAiExport(payload([{ ...row, category: 'Assigned' }]))).toThrow('category');
    expect(() => parseBlueAiExport('{}')).toThrow();
    expect(() => parseBlueAiExport('invalid')).toThrow('valid JSON');
    expect(() => parseBlueAiExport(payload([{ title: 'No identifier' }]))).toThrow('order number');
  });
  it('bounds input size and does not retain unrelated sensitive fields', () => {
    expect(() => parseBlueAiExport(' '.repeat(262145))).toThrow('256 KB');
    expect(parseBlueAiExport(payload([{ ...row, access_code: 'omit' }])).available_jobs[0]).not.toHaveProperty('access_code');
  });
});
