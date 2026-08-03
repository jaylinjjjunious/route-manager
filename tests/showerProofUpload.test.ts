import { describe, it, expect, vi, beforeEach } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    refreshSession: vi.fn(),
  },
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: supabaseMock,
}));

import { uploadShowerProof } from '../src/services/showerProofApi';

const NOW = Math.floor(Date.now() / 1000);

function makeSession(token: string, expiresAt = NOW + 3600) {
  return { data: { session: { access_token: token, expires_at: expiresAt } }, error: null };
}

function makeProof() {
  return {
    id: 'shower-2026-08-03-abc',
    cycleId: '2026-08-03',
    localDate: '2026-08-03',
    barcode: '075371003233',
    barcodeEnding: '3233',
    capturedAt: '2026-08-03T12:00:00.000Z',
    storageKey: 'daily-shower-gate/2026-08-03/shower-2026-08-03-abc.jpg',
    imageUrl: '/shower-proof-assets/shower-2026-08-03-abc.jpg',
    uploadStatus: 'saved',
    verificationStatus: 'verified',
    createdAt: '2026-08-03T12:00:00.000Z',
    updatedAt: '2026-08-03T12:00:00.000Z',
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  supabaseMock.auth.getSession.mockReset();
  supabaseMock.auth.refreshSession.mockReset();
  vi.stubGlobal('fetch', vi.fn());
});

describe('uploadShowerProof', () => {
  it('uploads the proof and returns the saved record', async () => {
    const proof = makeProof();
    supabaseMock.auth.getSession.mockResolvedValue(makeSession('token-1'));
    (fetch as any).mockResolvedValue(new Response(JSON.stringify({ proof }), { status: 200 }));

    const result = await uploadShowerProof({
      cycleId: '2026-08-03',
      localDate: '2026-08-03',
      barcode: '075371003233',
      capturedAt: '2026-08-03T12:00:00.000Z',
      imageBlob: new Blob(['fake-image'], { type: 'image/jpeg' }),
    });

    expect(result.id).toBe(proof.id);
    expect(fetch).toHaveBeenCalledTimes(1);
    const init = (fetch as any).mock.calls[0][1];
    expect(init.headers.Authorization).toBe('Bearer token-1');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('refreshes the token and retries once on a 401', async () => {
    const proof = makeProof();
    supabaseMock.auth.getSession.mockResolvedValue(makeSession('token-1'));
    supabaseMock.auth.refreshSession.mockResolvedValue(makeSession('token-2'));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'expired' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ proof }), { status: 200 }));
    (fetch as any).mockImplementation(fetchMock);

    const result = await uploadShowerProof({
      cycleId: '2026-08-03',
      localDate: '2026-08-03',
      barcode: '075371003233',
      capturedAt: '2026-08-03T12:00:00.000Z',
      imageBlob: new Blob(['fake-image'], { type: 'image/jpeg' }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(supabaseMock.auth.refreshSession).toHaveBeenCalled();
    const retryHeaders = fetchMock.mock.calls[1][1].headers;
    expect(retryHeaders.Authorization).toBe('Bearer token-2');
    expect(result.id).toBe(proof.id);
  });

  it('throws a clear error when refresh fails on a 401', async () => {
    supabaseMock.auth.getSession.mockResolvedValue(makeSession('token-1'));
    supabaseMock.auth.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('refresh failed') });
    (fetch as any).mockResolvedValue(new Response(JSON.stringify({ error: 'expired' }), { status: 401 }));

    await expect(uploadShowerProof({
      cycleId: '2026-08-03',
      localDate: '2026-08-03',
      barcode: '075371003233',
      capturedAt: '2026-08-03T12:00:00.000Z',
      imageBlob: new Blob(['fake-image'], { type: 'image/jpeg' }),
    })).rejects.toThrow(/Sign in again/);
  });

  it('surfaces the server error message on a non-401 failure', async () => {
    supabaseMock.auth.getSession.mockResolvedValue(makeSession('token-1'));
    (fetch as any).mockResolvedValue(new Response(JSON.stringify({ error: 'Incorrect product barcode.' }), { status: 400 }));

    await expect(uploadShowerProof({
      cycleId: '2026-08-03',
      localDate: '2026-08-03',
      barcode: '000000000000',
      capturedAt: '2026-08-03T12:00:00.000Z',
      imageBlob: new Blob(['fake-image'], { type: 'image/jpeg' }),
    })).rejects.toThrow('Incorrect product barcode.');
  });

  it('refreshes up front when the access token is about to expire', async () => {
    const proof = makeProof();
    supabaseMock.auth.getSession.mockResolvedValue(makeSession('token-old', NOW + 30));
    supabaseMock.auth.refreshSession.mockResolvedValue(makeSession('token-new'));
    (fetch as any).mockResolvedValue(new Response(JSON.stringify({ proof }), { status: 200 }));

    const result = await uploadShowerProof({
      cycleId: '2026-08-03',
      localDate: '2026-08-03',
      barcode: '075371003233',
      capturedAt: '2026-08-03T12:00:00.000Z',
      imageBlob: new Blob(['fake-image'], { type: 'image/jpeg' }),
    });

    expect(supabaseMock.auth.refreshSession).toHaveBeenCalled();
    expect(result.id).toBe(proof.id);
  });
});
