import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { transitRequest } from '../server/transit/transitApiClient';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

type FetchMock = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function stubFetch(impl: FetchMock): ReturnType<typeof vi.fn<FetchMock>> {
  const mock = vi.fn<FetchMock>(impl);
  vi.stubGlobal('fetch', mock);
  return mock;
}

describe('transitApiClient', () => {
  const originalKey = process.env.TRANSIT_API_KEY;
  const originalBase = process.env.TRANSIT_API_BASE_URL;

  beforeEach(() => {
    process.env.TRANSIT_API_KEY = 'test-key';
    process.env.TRANSIT_API_BASE_URL = 'https://external.transitapp.com/v4';
  });
  afterEach(() => {
    if (originalKey === undefined) delete process.env.TRANSIT_API_KEY;
    else process.env.TRANSIT_API_KEY = originalKey;
    if (originalBase === undefined) delete process.env.TRANSIT_API_BASE_URL;
    else process.env.TRANSIT_API_BASE_URL = originalBase;
    vi.unstubAllGlobals();
  });

  it('sends the apiKey header and returns parsed JSON on success', async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ stops: [{ global_stop_id: 'GETCA:5391' }] }));

    const body = await transitRequest<{ stops: { global_stop_id: string }[] }>('/public/nearby_stops', {
      params: { lat: 35.39, lon: -119.02 },
    });

    expect(body.stops[0].global_stop_id).toBe('GETCA:5391');
    const [, init] = fetchMock.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers.apiKey).toBe('test-key');
    expect(headers.accept).toBe('application/json');
  });

  it('throws TRANSIT_NOT_CONFIGURED when no key is set, without calling fetch', async () => {
    delete process.env.TRANSIT_API_KEY;
    const fetchMock = stubFetch(async () => jsonResponse({}));

    await expect(transitRequest('/public/nearby_stops')).rejects.toMatchObject({
      code: 'TRANSIT_NOT_CONFIGURED',
      status: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps HTTP 429 to TRANSIT_RATE_LIMITED and does not retry', async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ message: 'API rate limit exceeded' }, 429));

    await expect(transitRequest('/public/nearby_stops')).rejects.toMatchObject({
      code: 'TRANSIT_RATE_LIMITED',
      status: 429,
      retryable: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps HTTP 401 to TRANSIT_AUTH_FAILED', async () => {
    stubFetch(async () => jsonResponse({}, 401));
    await expect(transitRequest('/public/nearby_stops')).rejects.toMatchObject({ code: 'TRANSIT_AUTH_FAILED' });
  });

  it('maps HTTP 404 to TRANSIT_STOP_NOT_FOUND', async () => {
    stubFetch(async () => jsonResponse({}, 404));
    await expect(transitRequest('/public/nearby_stops')).rejects.toMatchObject({
      code: 'TRANSIT_STOP_NOT_FOUND',
      status: 404,
    });
  });

  it('treats HTTP 200 with an error body as a failure (upstream contract)', async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ error: "couldn't parse request" }, 200));

    await expect(transitRequest('/public/plan')).rejects.toMatchObject({
      code: 'TRANSIT_TEMPORARILY_UNAVAILABLE',
      status: 502,
      retryable: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once on a network-level failure, then reports TRANSIT_TEMPORARILY_UNAVAILABLE', async () => {
    const fetchMock = stubFetch(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(transitRequest('/public/nearby_stops')).rejects.toMatchObject({
      code: 'TRANSIT_TEMPORARILY_UNAVAILABLE',
      status: 503,
      retryable: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the /v4 prefix on the constructed URL', async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ ok: true }));

    await transitRequest('/public/nearby_stops');
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url.startsWith('https://external.transitapp.com/v4/public/nearby_stops')).toBe(true);
  });
});
