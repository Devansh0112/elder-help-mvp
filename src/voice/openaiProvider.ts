// OpenAI Realtime over WebRTC. Event names and shapes checked 2026-11-04 against the openai npm
// package 7.50.0 type definitions (resources/realtime/realtime.d.ts, calls.d.ts); the hosted docs
// were not reachable from the build machine. Not yet exercised against the live API.
import { COPY } from '@/config/copy';
import { household } from '@/config/household';
import { mayaPrompt, mayaTools } from './mayaPrompt';
import type { StartOptions, VoiceProvider } from './VoiceProvider';

const CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
const SILENCE_MS = 10_000;
export const STILL_THERE = COPY.stillThere;

export type RealtimeDeps = {
  getUserMedia: (c: MediaStreamConstraints) => Promise<MediaStream>;
  createPeerConnection: () => RTCPeerConnection;
  fetch: typeof fetch;
  playRemote: (stream: MediaStream) => void;
};

function browserDeps(): RealtimeDeps {
  return {
    getUserMedia: (c) => navigator.mediaDevices.getUserMedia(c),
    createPeerConnection: () => new RTCPeerConnection(),
    fetch: (...args) => fetch(...args),
    playRemote: (stream) => {
      const audio = new Audio();
      audio.autoplay = true;
      audio.srcObject = stream;
    },
  };
}

type ServerEvent = { type: string; [k: string]: unknown };

export function createOpenAIProvider(
  session: { clientSecret: string; model: string },
  deps: RealtimeDeps = browserDeps(),
): VoiceProvider {
  let opts: StartOptions | null = null;
  let pc: RTCPeerConnection | null = null;
  let channel: RTCDataChannel | null = null;
  let mic: MediaStream | null = null;
  let open = false;
  let ctx: { dueMedicine?: string } = {};
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let nudged = false;
  // Set by stop(); start() checks it after every await so a stop during connect leaves nothing running.
  let stopped = false;
  // A session.update the server rejected leaves Maya without tools, so an error before this is fatal.
  let configured = false;
  // Tool outputs go back as one response.create, sent only after the calling response is done.
  let pendingCalls = 0;
  let replyDue = false;
  let responseDone = true;

  const emit: StartOptions['onEvent'] = (e) => opts?.onEvent(e);
  const send = (event: Record<string, unknown>) => {
    if (open && channel) channel.send(JSON.stringify(event));
  };
  const now = () => new Date().toISOString();

  const instructions = () =>
    ctx.dueMedicine
      ? `${mayaPrompt}\n\nA medicine reminder is due now: ${ctx.dueMedicine}. Gently remind ${household.elderName} and log it with log_medicine when they answer.`
      : mayaPrompt;

  const clearSilence = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = null;
  };
  const armSilence = () => {
    clearSilence();
    silenceTimer = setTimeout(() => {
      if (!nudged) {
        nudged = true;
        send({ type: 'response.create', response: { instructions: `Say exactly: "${STILL_THERE}"` } });
        armSilence();
      } else {
        void provider.stop();
      }
    }, SILENCE_MS);
  };

  async function runFunctionCall(e: ServerEvent) {
    const name = String(e.name ?? '');
    let args: unknown = null;
    try {
      args = JSON.parse(String(e.arguments ?? 'null'));
    } catch {
      // Bad JSON goes to the handler as null, which fails validation and alerts the family.
    }
    const result = opts
      ? await opts.callTool(name, args)
      : { ok: false, message: COPY.toolFailed };
    send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: e.call_id, output: JSON.stringify(result) } });
    pendingCalls--;
    maybeReply();
  }

  function maybeReply() {
    if (replyDue && pendingCalls === 0 && responseDone) {
      replyDue = false;
      send({ type: 'response.create' });
    }
  }

  function onServerEvent(e: ServerEvent) {
    switch (e.type) {
      case 'input_audio_buffer.speech_started':
        nudged = false;
        clearSilence();
        break;
      case 'input_audio_buffer.speech_stopped':
        armSilence();
        break;
      case 'conversation.item.input_audio_transcription.completed':
        if (typeof e.transcript === 'string' && e.transcript.trim())
          emit({ type: 'caption', line: { role: 'elder', text: e.transcript.trim(), at: now() } });
        break;
      case 'response.output_audio_transcript.done':
        if (typeof e.transcript === 'string' && e.transcript.trim())
          emit({ type: 'caption', line: { role: 'maya', text: e.transcript.trim(), at: now() } });
        break;
      case 'output_audio_buffer.started':
        clearSilence();
        emit({ type: 'speaking', on: true });
        break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        emit({ type: 'speaking', on: false });
        armSilence();
        break;
      case 'response.function_call_arguments.done':
        responseDone = false;
        replyDue = true;
        pendingCalls++;
        void runFunctionCall(e);
        break;
      case 'response.done':
        responseDone = true;
        maybeReply();
        break;
      case 'session.updated':
        configured = true;
        break;
      case 'error':
        console.error('Realtime error', e.error);
        if (!configured) {
          emit({ type: 'error', reason: 'unavailable' });
          void provider.stop();
        }
        break;
    }
  }

  const provider: VoiceProvider = {
    async start(o) {
      opts = o;
      stopped = false;
      let stream: MediaStream;
      try {
        stream = await deps.getUserMedia({ audio: true });
      } catch (err) {
        emit({ type: 'error', reason: (err as Error)?.name === 'NotAllowedError' ? 'mic_denied' : 'unavailable' });
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      mic = stream;
      try {
        pc = deps.createPeerConnection();
        pc.ontrack = (ev) => deps.playRemote(ev.streams[0]);
        pc.onconnectionstatechange = () => {
          if (pc?.connectionState === 'failed') {
            emit({ type: 'error', reason: 'unavailable' });
            void provider.stop();
          }
        };
        for (const track of stream.getTracks()) pc.addTrack(track, stream);

        channel = pc.createDataChannel('oai-events');
        channel.onmessage = (m) => {
          try {
            onServerEvent(JSON.parse(String(m.data)) as ServerEvent);
          } catch {
            // ignore malformed frames
          }
        };
        channel.onopen = () => {
          open = true;
          send({
            type: 'session.update',
            session: {
              type: 'realtime',
              instructions: instructions(),
              tools: mayaTools,
              tool_choice: 'auto',
              audio: { input: { turn_detection: { type: 'server_vad' } } },
            },
          });
          send({
            type: 'response.create',
            response: {
              instructions: o.initialPrompt
                ? `Say this to ${household.elderName}, warmly: ${o.initialPrompt}`
                : `Greet ${household.elderName} warmly in one short sentence and ask how you can help.`,
            },
          });
          armSilence();
        };

        const conn = pc;
        const offer = await conn.createOffer();
        if (stopped) return;
        await conn.setLocalDescription(offer);
        if (stopped) return;
        const res = await deps.fetch(CALLS_URL, {
          method: 'POST',
          body: offer.sdp,
          headers: { authorization: `Bearer ${session.clientSecret}`, 'content-type': 'application/sdp' },
        });
        if (stopped) return;
        if (!res.ok) throw new Error(`realtime call failed: ${res.status}`);
        const answer = await res.text();
        if (stopped) return;
        await conn.setRemoteDescription({ type: 'answer', sdp: answer });
      } catch {
        if (stopped) return;
        emit({ type: 'error', reason: 'unavailable' });
        await provider.stop();
      }
    },

    async sendText(text) {
      if (!text.trim()) return;
      emit({ type: 'caption', line: { role: 'elder', text, at: now() } });
      send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
      send({ type: 'response.create' });
    },

    setContext(c) {
      ctx = c;
      send({ type: 'session.update', session: { type: 'realtime', instructions: instructions() } });
    },

    async stop() {
      // Always tear down: start() may still be connecting even after opts was cleared.
      stopped = true;
      const o = opts;
      opts = null;
      clearSilence();
      open = false;
      channel?.close();
      pc?.close();
      mic?.getTracks().forEach((t) => t.stop());
      channel = null;
      pc = null;
      mic = null;
      o?.onEvent({ type: 'ended' });
    },
  };
  return provider;
}
