/**
 * Safari/PWA lifecycle handler for Smart Aisle Scan camera.
 *
 * Handles:
 * - visibilitychange events (Safari aggressively recycles backgrounded tabs)
 * - pagehide/pageshow for PWA transitions
 * - MediaStream state monitoring and automatic reconnection
 * - Camera state persistence across tab backgrounding
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

export type CameraLifecycleState = 'active' | 'backgrounded' | 'suspended' | 'recovering';

export interface LifecycleCallbacks {
  onBackground?: () => void;
  onForeground?: () => void;
  onSuspend?: () => void;
  onRecover?: () => void;
  onStreamEnded?: () => void;
}

export interface LifecycleState {
  state: CameraLifecycleState;
  backgroundedAt: number | null;
  recoveredAt: number | null;
  wasBackgrounded: boolean;
}

// ─── Utility: Detect Safari and PWA ───────────────────────────────

export function isSafari(): boolean {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua);
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isPWAMode(): boolean {
  const navStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayStandalone = window.matchMedia?.('(display-mode: standalone)').matches || false;
  return navStandalone || displayStandalone;
}

// ─── Stream Health Monitor ────────────────────────────────────────

export function isStreamActive(stream: MediaStream | null): boolean {
  if (!stream) return false;
  const tracks = stream.getVideoTracks();
  return tracks.length > 0 && tracks.some(t => t.readyState === 'live');
}

export function monitorStreamHealth(
  stream: MediaStream | null,
  onEnded: () => void,
): () => void {
  if (!stream) return () => {};

  const tracks = stream.getVideoTracks();
  const cleanups: Array<() => void> = [];

  for (const track of tracks) {
    const handleEnded = () => onEnded();
    track.addEventListener('ended', handleEnded);
    cleanups.push(() => track.removeEventListener('ended', handleEnded));
  }

  return () => cleanups.forEach(fn => fn());
}

// ─── Reconnection Logic ──────────────────────────────────────────

export async function reconnectCamera(
  videoElement: HTMLVideoElement,
  previousConstraints?: MediaStreamConstraints,
): Promise<MediaStream | null> {
  try {
    const constraints: MediaStreamConstraints = previousConstraints || {
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    await videoElement.play();
    return stream;
  } catch {
    return null;
  }
}

// ─── React Hook: Camera Lifecycle ─────────────────────────────────

export function useCameraLifecycle(
  stream: MediaStream | null,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  callbacks: LifecycleCallbacks = {},
): LifecycleState {
  const stateRef = useRef<LifecycleState>({
    state: 'active',
    backgroundedAt: null,
    recoveredAt: null,
    wasBackgrounded: false,
  });
  const [lifecycleState, setLifecycleState] = useState<LifecycleState>(stateRef.current);

  const updateState = useCallback((partial: Partial<LifecycleState>) => {
    stateRef.current = { ...stateRef.current, ...partial };
    setLifecycleState({ ...stateRef.current });
  }, []);

  // Visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateState({
          state: 'backgrounded',
          backgroundedAt: Date.now(),
          wasBackgrounded: true,
        });
        callbacks.onBackground?.();
      } else {
        updateState({ state: 'recovering' });
        callbacks.onForeground?.();

        // Attempt to recover camera after a brief delay
        setTimeout(() => {
          if (videoRef.current && stream) {
            const tracks = stream.getVideoTracks();
            const allEnded = tracks.every(t => t.readyState === 'ended');
            if (allEnded) {
              callbacks.onStreamEnded?.();
              updateState({ state: 'suspended' });
            } else {
              // Resume playback if paused
              videoRef.current.play().catch(() => {});
              updateState({
                state: 'active',
                recoveredAt: Date.now(),
              });
              callbacks.onRecover?.();
            }
          } else {
            updateState({ state: 'active' });
          }
        }, 300);
      }
    };

    const handlePageHide = () => {
      updateState({
        state: 'suspended',
        backgroundedAt: Date.now(),
      });
      callbacks.onSuspend?.();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was restored from bfcache
        updateState({ state: 'recovering' });
        callbacks.onForeground?.();

        setTimeout(() => {
          if (videoRef.current && stream) {
            videoRef.current.play().catch(() => {});
            updateState({
              state: 'active',
              recoveredAt: Date.now(),
            });
            callbacks.onRecover?.();
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [stream, videoRef, callbacks, updateState]);

  // Stream ended monitoring
  useEffect(() => {
    if (!stream) return;

    const cleanup = monitorStreamHealth(stream, () => {
      updateState({ state: 'suspended' });
      callbacks.onStreamEnded?.();
    });

    return cleanup;
  }, [stream, callbacks, updateState]);

  return lifecycleState;
}

// ─── Pause/Resume Capture During Backgrounding ────────────────────

export function createBackgroundingGuard(
  onBackground: () => void,
  onForeground: () => void,
): () => void {
  let wasCapturing = false;

  const handleVisibility = () => {
    if (document.hidden) {
      wasCapturing = true;
      onBackground();
    } else if (wasCapturing) {
      wasCapturing = false;
      onForeground();
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}

// ─── Device Orientation Permission (iOS 13+) ─────────────────────

export async function requestOrientationPermission(): Promise<boolean> {
  if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
    try {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }
  // Non-iOS or older iOS — permission not needed
  return true;
}
