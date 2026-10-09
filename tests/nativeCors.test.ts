import { expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { nativeCors } from '../server/nativeCors';

function run(origin: string, method = 'GET') {
  const next = vi.fn();
  const res = { vary: vi.fn(), setHeader: vi.fn(), status: vi.fn().mockReturnThis(), end: vi.fn() };
  nativeCors({ headers: { origin }, method } as Request, res as unknown as Response, next as NextFunction);
  return { next, res };
}
it('allows only the exact native origin and never grants cookie credentials', () => {
  const { next, res } = run('capacitor://localhost');
  expect(next).toHaveBeenCalledOnce();
  expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'capacitor://localhost');
  expect(res.setHeader.mock.calls.some(([header]) => header === 'Access-Control-Allow-Credentials')).toBe(false);
});
it('handles native preflight without bypassing authentication for actual requests', () => {
  const preflight = run('capacitor://localhost', 'OPTIONS');
  expect(preflight.res.status).toHaveBeenCalledWith(204);
  expect(preflight.res.end).toHaveBeenCalledOnce();
  expect(preflight.next).not.toHaveBeenCalled();
  expect(run('capacitor://localhost', 'POST').next).toHaveBeenCalledOnce();
});
it('does not expose CORS access to arbitrary websites or lookalike origins', () => {
  for (const origin of ['https://evil.example', 'capacitor://localhost.evil.example', 'null', 'https://localhost']) {
    const { next, res } = run(origin, 'OPTIONS');
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  }
});
