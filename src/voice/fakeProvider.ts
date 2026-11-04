import { parseIntent } from '@/server/intent';
import type { StartOptions, VoiceProvider } from './VoiceProvider';

// Runs the tools from typed text with no network: used in fake mode, tests, and as the text fallback.
// speakMs holds the "speaking" state for a moment so the glow ring is visible on screen.
export function createFakeProvider({ speakMs = 0 }: { speakMs?: number } = {}): VoiceProvider {
  let opts: StartOptions | null = null;
  let ctx: { dueMedicine?: string } = {};

  const say = async (text: string) => {
    const o = opts;
    if (!o) return;
    o.onEvent({ type: 'speaking', on: true });
    o.onEvent({ type: 'caption', line: { role: 'maya', text, at: new Date().toISOString() } });
    if (speakMs > 0) await new Promise((r) => setTimeout(r, speakMs));
    o.onEvent({ type: 'speaking', on: false });
  };

  return {
    async start(o) {
      opts = o;
      if (o.initialPrompt) void say(o.initialPrompt);
    },
    async sendText(text) {
      if (!opts || !text.trim()) return;
      opts.onEvent({ type: 'caption', line: { role: 'elder', text, at: new Date().toISOString() } });
      const intent = parseIntent(text, ctx);
      const result = await opts.callTool(intent.tool, intent.args);
      await say(result.message);
    },
    setContext(c) {
      ctx = c;
    },
    async stop() {
      const o = opts;
      opts = null;
      o?.onEvent({ type: 'ended' });
    },
  };
}

export const fakeProvider: VoiceProvider = createFakeProvider();
