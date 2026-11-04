import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VoiceEvent } from '@/voice/VoiceProvider';
import { createOpenAIProvider, type RealtimeDeps } from '@/voice/openaiProvider';

class FakeChannel {
  sent: Record<string, unknown>[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {}
  server(event: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }
}

function setup(overrides: Partial<RealtimeDeps> = {}) {
  const channel = new FakeChannel();
  const pc = {
    ontrack: null,
    onconnectionstatechange: null,
    connectionState: 'new',
    addTrack: vi.fn(),
    createDataChannel: vi.fn(() => channel),
    createOffer: vi.fn(async () => ({ type: 'offer', sdp: 'offer-sdp' })),
    setLocalDescription: vi.fn(async () => {}),
    setRemoteDescription: vi.fn(async () => {}),
    close: vi.fn(),
  };
  const track = { stop: vi.fn() };
  const deps: RealtimeDeps = {
    getUserMedia: vi.fn(async () => ({ getTracks: () => [track] }) as unknown as MediaStream),
    createPeerConnection: () => pc as unknown as RTCPeerConnection,
    fetch: vi.fn(async () => new Response('answer-sdp', { status: 201 })) as unknown as typeof fetch,
    playRemote: vi.fn(),
    ...overrides,
  };
  const events: VoiceEvent[] = [];
  const callTool = vi.fn(async () => ({ ok: true, message: 'Booked.' }));
  const provider = createOpenAIProvider({ clientSecret: 'ek_test', model: 'gpt-realtime-2.1' }, deps);
  return { provider, channel, pc, deps, events, callTool, onEvent: (e: VoiceEvent) => events.push(e) };
}

const sentTypes = (c: FakeChannel) => c.sent.map((e) => e.type);

describe('openai provider', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('mic permission denied emits mic_denied', async () => {
    const err = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    const s = setup({ getUserMedia: vi.fn(async () => Promise.reject(err)) });
    await s.provider.start({ callTool: s.callTool, onEvent: s.onEvent });
    expect(s.events).toEqual([{ type: 'error', reason: 'mic_denied' }]);
  });

  it('failed SDP exchange emits unavailable', async () => {
    const s = setup({ fetch: vi.fn(async () => new Response('no', { status: 500 })) as unknown as typeof fetch });
    await s.provider.start({ callTool: s.callTool, onEvent: s.onEvent });
    expect(s.events).toContainEqual({ type: 'error', reason: 'unavailable' });
  });

  it('posts the SDP offer with the client secret and configures the session on open', async () => {
    const s = setup();
    await s.provider.start({ callTool: s.callTool, onEvent: s.onEvent, initialPrompt: 'Time for your Metformin.' });
    const [url, init] = (s.deps.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/realtime/calls');
    expect(init.headers.authorization).toBe('Bearer ek_test');
    expect(init.body).toBe('offer-sdp');
    s.channel.onopen?.();
    const update = s.channel.sent[0] as { type: string; session: { tools: { name: string }[]; instructions: string } };
    expect(update.type).toBe('session.update');
    expect(update.session.tools.map((t) => t.name)).toEqual(['book_appointment', 'log_medicine', 'escalate']);
    expect(sentTypes(s.channel)).toContain('response.create');
  });

  it('runs function calls and returns the output', async () => {
    const s = setup();
    await s.provider.start({ callTool: s.callTool, onEvent: s.onEvent });
    s.channel.onopen?.();
    s.channel.server({
      type: 'response.function_call_arguments.done',
      name: 'book_appointment',
      call_id: 'call_1',
      arguments: '{"type":"doctor","when":"next week"}',
    });
    await vi.waitFor(() => expect(s.callTool).toHaveBeenCalledWith('book_appointment', { type: 'doctor', when: 'next week' }));
    await vi.waitFor(() => expect(sentTypes(s.channel).at(-1)).toBe('conversation.item.create'));
    s.channel.server({ type: 'response.done' });
    await vi.waitFor(() => expect(sentTypes(s.channel).slice(-2)).toEqual(['conversation.item.create', 'response.create']));
    const item = s.channel.sent.at(-2) as { item: { type: string; call_id: string; output: string } };
    expect(item.item).toMatchObject({ type: 'function_call_output', call_id: 'call_1' });
    expect(JSON.parse(item.item.output)).toEqual({ ok: true, message: 'Booked.' });
  });

  it('maps transcripts and audio to captions and speaking', async () => {
    const s = setup();
    await s.provider.start({ callTool: s.callTool, onEvent: s.onEvent });
    s.channel.onopen?.();
    s.channel.server({ type: 'conversation.item.input_audio_transcription.completed', transcript: 'Hello Maya' });
    s.channel.server({ type: 'output_audio_buffer.started' });
    s.channel.server({ type: 'response.output_audio_transcript.done', transcript: 'Hello Margaret' });
    s.channel.server({ type: 'output_audio_buffer.stopped' });
    const captions = s.events.flatMap((e) => (e.type === 'caption' ? [`${e.line.role}:${e.line.text}`] : []));
    expect(captions).toEqual(['elder:Hello Maya', 'maya:Hello Margaret']);
    expect(s.events.flatMap((e) => (e.type === 'speaking' ? [e.on] : []))).toEqual([true, false]);
  });

  it('asks "Are you still there?" after 10 s of silence, then ends after 10 s more', async () => {
    const s = setup();
    await s.provider.start({ callTool: s.callTool, onEvent: s.onEvent });
    s.channel.onopen?.();
    const before = s.channel.sent.length;
    await vi.advanceTimersByTimeAsync(10_000);
    const nudge = s.channel.sent.slice(before).find((e) => e.type === 'response.create') as
      | { response: { instructions: string } }
      | undefined;
    expect(nudge?.response.instructions).toContain('Are you still there?');
    expect(s.events.some((e) => e.type === 'ended')).toBe(false);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(s.events.at(-1)).toEqual({ type: 'ended' });
  });

  it('elder speech resets the silence timer', async () => {
    const s = setup();
    await s.provider.start({ callTool: s.callTool, onEvent: s.onEvent });
    s.channel.onopen?.();
    await vi.advanceTimersByTimeAsync(8_000);
    s.channel.server({ type: 'input_audio_buffer.speech_started' });
    s.channel.server({ type: 'input_audio_buffer.speech_stopped' });
    await vi.advanceTimersByTimeAsync(8_000);
    expect(JSON.stringify(s.channel.sent)).not.toContain('Are you still there?');
  });
  it('waits for response.done and replies once for two calls in one response', async () => {
    const s = setup();
    await s.provider.start({ callTool: s.callTool, onEvent: s.onEvent });
    s.channel.onopen?.();
    const before = s.channel.sent.length;
    const call = (id: string) =>
      s.channel.server({ type: 'response.function_call_arguments.done', name: 'escalate', call_id: id, arguments: '{"issue":"x"}' });
    call('a');
    call('b');
    await vi.waitFor(() => expect(s.callTool).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(sentTypes(s.channel).filter((t) => t === 'conversation.item.create')).toHaveLength(2));
    expect(sentTypes(s.channel).slice(before)).not.toContain('response.create');
    s.channel.server({ type: 'response.done' });
    await vi.waitFor(() => expect(sentTypes(s.channel).slice(before).filter((t) => t === 'response.create')).toHaveLength(1));
  });

  it('a server error before the session is configured switches to unavailable', async () => {
    const s = setup();
    await s.provider.start({ callTool: s.callTool, onEvent: s.onEvent });
    s.channel.onopen?.();
    s.channel.server({ type: 'error', error: { message: 'bad tools' } });
    expect(s.events).toContainEqual({ type: 'error', reason: 'unavailable' });
  });

  it('a server error after session.updated is not fatal', async () => {
    const s = setup();
    await s.provider.start({ callTool: s.callTool, onEvent: s.onEvent });
    s.channel.onopen?.();
    s.channel.server({ type: 'session.updated' });
    s.channel.server({ type: 'error', error: { message: 'response already active' } });
    expect(s.events).not.toContainEqual({ type: 'error', reason: 'unavailable' });
  });

  it('stop() while the mic prompt is open tears down and never connects', async () => {
    let grant: (m: MediaStream) => void = () => {};
    const track = { stop: vi.fn() };
    const s = setup({ getUserMedia: vi.fn(() => new Promise<MediaStream>((r) => (grant = r))) });
    const started = s.provider.start({ callTool: s.callTool, onEvent: s.onEvent });
    await s.provider.stop();
    expect(s.events).toEqual([{ type: 'ended' }]);
    grant({ getTracks: () => [track] } as unknown as MediaStream);
    await started;
    expect(track.stop).toHaveBeenCalled();
    expect(s.deps.fetch).not.toHaveBeenCalled();
    expect(s.pc.addTrack).not.toHaveBeenCalled();
  });
});
