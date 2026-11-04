import type { TranscriptLine } from '@/server/conversations';
import type { ToolResult } from '@/server/tools';

export type VoiceEvent =
  | { type: 'speaking'; on: boolean }
  | { type: 'caption'; line: TranscriptLine }
  | { type: 'error'; reason: 'mic_denied' | 'unavailable' }
  | { type: 'ended' };

export type StartOptions = {
  callTool: (name: string, args: unknown) => Promise<ToolResult>;
  onEvent: (e: VoiceEvent) => void;
  initialPrompt?: string;
};

export interface VoiceProvider {
  start(opts: StartOptions): Promise<void>;
  sendText(text: string): Promise<void>;
  setContext(ctx: { dueMedicine?: string }): void;
  stop(): Promise<void>;
}
