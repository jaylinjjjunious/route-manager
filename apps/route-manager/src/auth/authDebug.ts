export interface AuthDebugState {
  pathname: string;
  authProviderMounted: boolean;
  authLoading: boolean;
  sessionPresent: boolean;
  userPresent: boolean;
  lastAuthEvent: string;
  lastAuthEventTime: string;
  protectedAppRendered: boolean;
  loginPageRendered: boolean;
  lastApiStatus: number | null;
  lastApiUrl: string;
  lastNavigationDest: string;
  signOutCalled: boolean;
  signOutCaller: string;
  supabaseStorageExists: boolean;
  events: Array<{ time: string; event: string }>;
}

const STORAGE_KEY = "sb-" + (import.meta.env.VITE_SUPABASE_URL?.split("//")[1]?.split(".")[0] ?? "unknown") + "-auth-token";

let listeners: Array<() => void> = [];
let state: AuthDebugState = {
  pathname: window.location.pathname,
  authProviderMounted: false,
  authLoading: true,
  sessionPresent: false,
  userPresent: false,
  lastAuthEvent: "(none)",
  lastAuthEventTime: "(none)",
  protectedAppRendered: false,
  loginPageRendered: false,
  lastApiStatus: null,
  lastApiUrl: "",
  lastNavigationDest: "",
  signOutCalled: false,
  signOutCaller: "",
  supabaseStorageExists: false,
  events: [],
};

function notify() {
  for (const fn of listeners) fn();
}

function pushEvent(event: string) {
  const time = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions);
  state.events = [...state.events.slice(-49), { time, event }];
}

export function getAuthDebugState(): AuthDebugState {
  return state;
}

export function subscribeAuthDebug(fn: () => void): () => void {
  listeners = [...listeners, fn];
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function authDebugMount() {
  state.authProviderMounted = true;
  pushEvent("AuthProvider MOUNTED");
  notify();
}

export function authDebugUnmount() {
  state.authProviderMounted = false;
  pushEvent("AuthProvider UNMOUNTED");
  notify();
}

export function authDebugLoading(loading: boolean) {
  state.authLoading = loading;
  notify();
}

export function authDebugSession(present: boolean, userPresent: boolean) {
  const changed = state.sessionPresent !== present;
  state.sessionPresent = present;
  state.userPresent = userPresent;
  if (changed) {
    pushEvent(`session present: ${present ? "yes" : "no"}`);
  }
  notify();
}

export function authDebugEvent(eventName: string) {
  state.lastAuthEvent = eventName;
  state.lastAuthEventTime = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions);
  pushEvent(`auth event: ${eventName}`);
  notify();
}

export function authDebugProtectedAppRendered() {
  state.protectedAppRendered = true;
  state.loginPageRendered = false;
  pushEvent("ProtectedApp RENDERED");
  notify();
}

export function authDebugLoginPageRendered() {
  state.loginPageRendered = true;
  state.protectedAppRendered = false;
  pushEvent("LoginPage RENDERED");
  notify();
}

export function authDebugApiStatus(status: number, url: string) {
  state.lastApiStatus = status;
  state.lastApiUrl = url;
  pushEvent(`API ${status} ${url}`);
  notify();
}

export function authDebugNavigation(dest: string) {
  state.lastNavigationDest = dest;
  pushEvent(`navigate → ${dest}`);
  notify();
}

export function authDebugSignOut(caller: string) {
  state.signOutCalled = true;
  state.signOutCaller = caller;
  pushEvent(`signOut called from: ${caller}`);
  notify();
}

export function authDebugStorageCheck() {
  const exists = !!localStorage.getItem(STORAGE_KEY);
  const changed = state.supabaseStorageExists !== exists;
  state.supabaseStorageExists = exists;
  if (changed) {
    pushEvent(`storage entry: ${exists ? "EXISTS" : "GONE"}`);
  }
  notify();
}

export function authDebugPathname() {
  const p = window.location.pathname;
  if (state.pathname !== p) {
    state.pathname = p;
    pushEvent(`pathname: ${p}`);
    notify();
  }
}

export function authDebugRaw(event: string) {
  pushEvent(event);
  notify();
}
