// OpenAI Realtime over WebRTC. Event names and shapes checked 2026-11-04 against the openai npm
// package 7.50.0 type definitions (resources/realtime/realtime.d.ts, calls.d.ts); the hosted docs
// were not reachable from the build machine. Not yet exercised against the live API.
import { household } from '@/config/household';
import { mayaPrompt, mayaTools } from './mayaPrompt';
import type { StartOptions, VoiceProvider } from './VoiceProvider';

const CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
const SILENCE_MS = 10_000;
export const STILL_THERE = 'Are you still there?';

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
      : { ok: false, message: "I couldn't do that, I've told your family." };
    send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: e.call_id, output: JSON.stringify(result) } });
    send({ type: 'response.create' });
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
        void runFunctionCall(e);
        break;
    }
  }

  const provider: VoiceProvider = {
    async start(o) {
      opts = o;
      try {
        mic = await deps.getUserMedia({ audio: true });
      } catch (err) {
        emit({ type: 'error', reason: (err as Error)?.name === 'NotAllowedError' ? 'mic_denied' : 'unavailable' });
        return;
      }
      try {
        pc = deps.createPeerConnection();
        pc.ontrack = (ev) => deps.playRemote(ev.streams[0]);
        pc.onconnectionstatechange = () => {
          if (pc?.connectionState === 'failed') {
            emit({ type: 'error', reason: 'unavailable' });
            void provider.stop();
          }
        };
        for (const track of mic.getTracks()) pc.addTrack(track, mic);

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

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const res = await deps.fetch(CALLS_URL, {
          method: 'POST',
          body: offer.sdp,
          headers: { authorization: `Bearer ${session.clientSecret}`, 'content-type': 'application/sdp' },
        });
        if (!res.ok) throw new Error(`realtime call failed: ${res.status}`);
        await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });
      } catch {
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
      if (!opts) return;
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
      o.onEvent({ type: 'ended' });
    },
  };
  return provider;
}
