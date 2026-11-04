import { createFakeProvider } from './fakeProvider';
import { createOpenAIProvider } from './openaiProvider';
import type { VoiceProvider } from './VoiceProvider';

export type SessionInfo = { provider: 'fake' } | { provider: 'openai'; clientSecret: string; model: string };

export function getVoiceProvider(session: SessionInfo): VoiceProvider {
  return session.provider === 'openai' ? createOpenAIProvider(session) : createFakeProvider();
}
