import { addDebugRequest, updateDebugRequest, addDebugError, captureSafeErrorInfo, getRequestLog } from './debugStore';

export function trackFetchRequest(
  url: string,
  method: string,
  authRequired: boolean,
): number {
  return addDebugRequest({
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
}

export function completeFetchRequest(
  id: number,
  status: number,
  duration: number,
  contentType = '',
) {
  const success = status >= 200 && status < 400;
  const errorCategory = !success
    ? status >= 500 ? 'server' : status === 401 ? 'auth' : status === 403 ? 'forbidden' : status === 404 ? 'not-found' : 'client'
    : '';
  const mediaType = contentType.split(';')[0].trim().toLowerCase();
  updateDebugRequest(id, { status, duration, success, errorCategory,
    contentType: mediaType.replace(/[^a-z0-9.+/-]/g, '').slice(0, 80),
    responseKind: mediaType.includes('json') ? 'json' : mediaType === 'text/html' ? 'html' : 'other',
  });

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
    duration: Date.now() - (getRequestLog().find(r => r.id === id)?.startTime ?? Date.now()),
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
