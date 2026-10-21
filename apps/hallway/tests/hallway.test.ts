import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import Hallway from '../src/Hallway';
import { legacyRoomLink } from '../src/rooms';

it('links to independently hosted software without mounting route screens or authentication', () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(React.createElement(Hallway)));
  expect(container.querySelector('a')?.getAttribute('href')).toBe('/route-manager/#dashboard');
  expect(container.querySelector('a[aria-label="Open Cleaning"]')?.getAttribute('href')).toBe('/cleaning/');
  expect(container.textContent).toContain('Your hallway.');
  expect(container.querySelector('[aria-label="Primary app navigation"]')).toBeNull();
  act(() => root.unmount());
});

it('preserves old feature bookmarks without redirecting the main menu', () => {
  expect(legacyRoomLink('#jobs')).toBe('/route-manager/#jobs');
  expect(legacyRoomLink('#checkin')).toBe('/route-manager/#checkin');
  expect(legacyRoomLink('#home')).toBeNull();
  expect(legacyRoomLink('')).toBeNull();
});
