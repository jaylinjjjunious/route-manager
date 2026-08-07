import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isSafari,
  isIOS,
  isPWAMode,
  isStreamActive,
  monitorStreamHealth,
  reconnectCamera,
  requestOrientationPermission,
} from '../src/services/scan/cameraLifecycle';

function makeTrack(readyState: MediaStreamTrackState = 'live') {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    readyState,
    addEventListener: vi.fn((type: string, fn: () => void) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    }),
    removeEventListener: vi.fn((type: string, fn: () => void) => {
      listeners[type] = (listeners[type] || []).filter(f => f !== fn);
    }),
    _listeners: listeners,
  };
}

function makeStream(...tracks: any[]): MediaStream {
  return { getVideoTracks: () => tracks } as unknown as MediaStream;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('device detection', () => {
  it('detects Safari only when not Chrome/Chromium', () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15' });
    expect(isSafari()).toBe(true);
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' });
    expect(isSafari()).toBe(false);
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: original });
  });

  it('detects iOS by UA or iPadOS touch heuristics', () => {
    const original = navigator.userAgent;
    const originalPlatform = navigator.platform;
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1' });
    expect(isIOS()).toBe(true);
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0' });
    Object.defineProperty(navigator, 'platform', { configurable: true, value: 'Win32' });
    expect(isIOS()).toBe(false);
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: original });
    Object.defineProperty(navigator, 'platform', { configurable: true, value: originalPlatform });
  });
});

describe('isStreamActive', () => {
  it('is false for null streams and ended tracks', () => {
    expect(isStreamActive(null)).toBe(false);
    expect(isStreamActive(makeStream())).toBe(false);
    expect(isStreamActive(makeStream(makeTrack('ended')))).toBe(false);
  });

  it('is true when any video track is live', () => {
    expect(isStreamActive(makeStream(makeTrack('live')))).toBe(true);
    expect(isStreamActive(makeStream(makeTrack('ended'), makeTrack('live')))).toBe(true);
  });
});

describe('monitorStreamHealth', () => {
  it('calls onEnded when a live track fires ended', () => {
    const track = makeTrack('live');
    const stream = makeStream(track);
    const onEnded = vi.fn();
    const cleanup = monitorStreamHealth(stream as unknown as MediaStream, onEnded);

    track._listeners['ended'].forEach(fn => fn());
    expect(onEnded).toHaveBeenCalledTimes(1);

    cleanup();
    expect(track.removeEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
  });

  it('returns a noop cleanup for a null stream', () => {
    const cleanup = monitorStreamHealth(null, vi.fn());
    expect(() => cleanup()).not.toThrow();
  });
});

describe('reconnectCamera', () => {
  it('binds the new stream and plays the video', async () => {
    const track = makeTrack('live');
    const stream = makeStream(track);
    (navigator.mediaDevices as any).getUserMedia = vi.fn(async () => stream);
    const video = {
      srcObject: null,
      play: vi.fn(async () => undefined),
    };
    const result = await reconnectCamera(video as unknown as HTMLVideoElement);
    expect(result).toBe(stream);
    expect(video.srcObject).toBe(stream);
    expect(video.play).toHaveBeenCalled();
  });

  it('returns null when getUserMedia rejects', async () => {
    (navigator.mediaDevices as any).getUserMedia = vi.fn(async () => { throw new Error('denied'); });
    const result = await reconnectCamera({ play: vi.fn() } as unknown as HTMLVideoElement);
    expect(result).toBeNull();
  });
});

describe('requestOrientationPermission', () => {
  it('returns true when no permission request exists (non-iOS)', async () => {
    expect(await requestOrientationPermission()).toBe(true);
  });

  it('returns granted result when iOS permission API is present', async () => {
    (globalThis as any).DeviceOrientationEvent = { requestPermission: vi.fn(async () => 'granted') };
    expect(await requestOrientationPermission()).toBe(true);
    (globalThis as any).DeviceOrientationEvent = { requestPermission: vi.fn(async () => 'denied') };
    expect(await requestOrientationPermission()).toBe(false);
    delete (globalThis as any).DeviceOrientationEvent;
  });
});
