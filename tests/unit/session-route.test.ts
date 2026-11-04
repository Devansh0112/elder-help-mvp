import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/session/route';

describe('POST /api/session', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('fake mode returns provider fake', async () => {
    vi.stubEnv('VOICE_PROVIDER', 'fake');
    vi.stubEnv('OPENAI_API_KEY', '');
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ provider: 'fake' });
  });

  it('openai mode without key returns 503 voice_unavailable', async () => {
    vi.stubEnv('VOICE_PROVIDER', 'openai');
    vi.stubEnv('OPENAI_API_KEY', '');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await POST();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'voice_unavailable' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('openai mode returns 503 when the secret request fails', async () => {
    vi.stubEnv('VOICE_PROVIDER', 'openai');
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const res = await POST();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'voice_unavailable' });
  });
});
