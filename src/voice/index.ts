import { createFakeProvider } from './fakeProvider';
import { createOpenAIProvider } from './openaiProvider';
import type { VoiceProvider } from './VoiceProvider';

export type SessionInfo = { provider: 'fake' } | { provider: 'openai'; clientSecret: string; model: string };

const FAKE_SPEAK_MS = 1200;

export function getVoiceProvider(session: SessionInfo): VoiceProvider {
  return session.provider === 'openai' ? createOpenAIProvider(session) : createFakeProvider({ speakMs: FAKE_SPEAK_MS });
}
