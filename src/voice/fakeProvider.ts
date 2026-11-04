import { parseIntent } from '@/server/intent';
import type { StartOptions, VoiceProvider } from './VoiceProvider';

// Runs the tools from typed text with no network: used in fake mode, tests, and as the text fallback.
export function createFakeProvider(): VoiceProvider {
  let opts: StartOptions | null = null;
  let ctx: { dueMedicine?: string } = {};

  const say = (text: string) => {
    if (!opts) return;
    opts.onEvent({ type: 'speaking', on: true });
    opts.onEvent({ type: 'caption', line: { role: 'maya', text, at: new Date().toISOString() } });
    opts.onEvent({ type: 'speaking', on: false });
  };

  return {
    async start(o) {
      opts = o;
      if (o.initialPrompt) say(o.initialPrompt);
    },
    async sendText(text) {
      if (!opts || !text.trim()) return;
      opts.onEvent({ type: 'caption', line: { role: 'elder', text, at: new Date().toISOString() } });
      const intent = parseIntent(text, ctx);
      const result = await opts.callTool(intent.tool, intent.args);
      say(result.message);
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
