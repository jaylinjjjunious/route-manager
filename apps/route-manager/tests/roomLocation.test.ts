import { expect, it } from 'vitest';
import { roomBase, roomPathname, hallwayUrl } from '../src/utils/roomLocation';

it('keeps room authentication paths inside its hosted prefix', () => {
  expect(roomBase('/route-manager/')).toBe('/route-manager/');
  expect(roomPathname('/route-manager/reset-password')).toBe('/reset-password');
  expect(roomPathname('/route-manager/login')).toBe('/login');
  expect(roomPathname('/route-manager/')).toBe('/');
});
it('also supports independent room hosting and a URL back to the parent', () => {
  expect(roomBase('/login')).toBe('/');
  expect(roomPathname('/reset-password')).toBe('/reset-password');
  expect(hallwayUrl()).toBe('/#home');
});
