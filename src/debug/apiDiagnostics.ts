import { addDebugRequest, updateDebugRequest, addDebugError, captureSafeErrorInfo } from './debugStore';

let nextId = 1;

export function trackFetchRequest(
  url: string,
  method: string,
  authRequired: boolean,
): number {
  const id = nextId++;
  addDebugRequest({
    path: url,
    method,
    status: null,
    startTime: Date.now(),
    duration: null,
    success: false,
    errorCategory: '',
    authRequired,
    retryOccurred: false,
  });
  return id;
}

export function completeFetchRequest(
  id: number,
  status: number,
  duration: number,
) {
  const success = status >= 200 && status < 400;
  const errorCategory = !success
    ? status >= 500 ? 'server' : status === 401 ? 'auth' : status === 403 ? 'forbidden' : status === 404 ? 'not-found' : 'client'
    : '';
  updateDebugRequest(id, { status, duration, success, errorCategory });

  if (!success) {
    addDebugError({
      category: errorCategory,
      message: `API ${methodFromStatus(status)} failed with ${status}`,
      source: 'api',
      pathname: window.location.pathname,
      statusCode: status,
      retryable: status >= 500,
    });
  }
}

function methodFromStatus(_status: number): string {
  return 'request';
}

export function failFetchRequest(id: number, error: unknown) {
  const { message, category } = captureSafeErrorInfo(error);
  updateDebugRequest(id, {
    duration: Date.now() - (Date.now()),
    success: false,
    errorCategory: category || 'network',
  });
  addDebugError({
    category: category || 'network',
    message,
    source: 'api',
    pathname: window.location.pathname,
    statusCode: null,
    retryable: true,
  });
}

export function trackAuthEvent(event: string) {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    addDebugError({
      category: 'auth',
      message: `Auth event: ${event}`,
      source: 'auth-provider',
      pathname: window.location.pathname,
      statusCode: null,
      retryable: false,
    });
  }
}
