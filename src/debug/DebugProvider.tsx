import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  subscribeDebug,
  getRequestLog,
  getErrorLog,
  clearAllDebugLogs,
  loadEnhancedDiagnosticsPreference,
  isEnhancedDiagnostics,
  setEnhancedDiagnostics as storeSetEnhanced,
  debugCameraState,
  updateCameraDebug,
} from './debugStore';
import { trackAuthEvent } from './apiDiagnostics';

interface DebugContextValue {
  requestLog: ReturnType<typeof getRequestLog>;
  errorLog: ReturnType<typeof getErrorLog>;
  clearLogs: () => void;
  enhancedDiagnostics: boolean;
  setEnhancedDiagnostics: (on: boolean) => void;
  cameraState: typeof debugCameraState;
  updateCamera: typeof updateCameraDebug;
  sessionStartTime: number;
  trackAuthEvent: typeof trackAuthEvent;
}

const DebugContext = createContext<DebugContextValue | null>(null);

export function useDebug(): DebugContextValue {
  const ctx = useContext(DebugContext);
  if (!ctx) throw new Error('useDebug must be used within DebugProvider');
  return ctx;
}

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [, forceUpdate] = useState(0);
  const [sessionStartTime] = useState(() => Date.now());

  useEffect(() => {
    loadEnhancedDiagnosticsPreference();
    const unsub = subscribeDebug(() => forceUpdate(n => n + 1));
    return unsub;
  }, []);

  const clearLogs = useCallback(() => {
    clearAllDebugLogs();
  }, []);

  const value: DebugContextValue = {
    requestLog: getRequestLog(),
    errorLog: getErrorLog(),
    clearLogs,
    enhancedDiagnostics: isEnhancedDiagnostics(),
    setEnhancedDiagnostics: storeSetEnhanced,
    cameraState: debugCameraState,
    updateCamera: updateCameraDebug,
    sessionStartTime,
    trackAuthEvent,
  };

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
}
