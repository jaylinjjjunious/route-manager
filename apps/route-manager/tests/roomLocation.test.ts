import { expect, it } from 'vitest';
import { roomBase, roomPathname, hallwayUrl, isRetiredRouteDestination } from '../src/utils/roomLocation';

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
it('preserves first-class Jobs bookmarks while retiring old route destinations', () => {
  expect(isRetiredRouteDestination('#jobs')).toBe(false);
  expect(isRetiredRouteDestination('#inventory')).toBe(false);
  expect(isRetiredRouteDestination('#route')).toBe(true);
  expect(isRetiredRouteDestination('#routes')).toBe(true);
});
