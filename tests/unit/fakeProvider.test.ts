import { describe, expect, it, vi } from 'vitest';
import type { VoiceEvent } from '@/voice/VoiceProvider';
import { createFakeProvider } from '@/voice/fakeProvider';

describe('fake provider', () => {
  it('emits elder caption, calls tool once, emits maya caption with tool message', async () => {
    const events: VoiceEvent[] = [];
    const callTool = vi.fn(async () => ({ ok: true, message: 'Your doctor appointment is booked for next week.' }));
    const p = createFakeProvider();
    await p.start({ callTool, onEvent: (e) => events.push(e) });
    await p.sendText('I need to see my doctor next week');

    expect(callTool).toHaveBeenCalledTimes(1);
    expect(callTool).toHaveBeenCalledWith('book_appointment', { type: 'doctor', when: 'next week' });
    const captions = events.filter((e) => e.type === 'caption').map((e) => (e.type === 'caption' ? e.line : null));
    expect(captions.map((l) => l?.role)).toEqual(['elder', 'maya']);
    expect(captions[1]?.text).toBe('Your doctor appointment is booked for next week.');
    expect(events.filter((e) => e.type === 'speaking').map((e) => (e.type === 'speaking' ? e.on : null))).toEqual([
      true,
      false,
    ]);
  });

  it('uses the due medicine from setContext', async () => {
    const callTool = vi.fn(async () => ({ ok: true, message: 'noted' }));
    const p = createFakeProvider();
    await p.start({ callTool, onEvent: () => {} });
    p.setContext({ dueMedicine: 'Metformin' });
    await p.sendText('I took it');
    expect(callTool).toHaveBeenCalledWith('log_medicine', { name: 'Metformin', taken: true });
  });

  it('speaks the initial prompt and emits ended on stop', async () => {
    const events: VoiceEvent[] = [];
    const p = createFakeProvider();
    await p.start({ callTool: vi.fn(), onEvent: (e) => events.push(e), initialPrompt: 'Time for your Metformin.' });
    await p.stop();
    expect(events.some((e) => e.type === 'caption' && e.line.role === 'maya' && e.line.text === 'Time for your Metformin.')).toBe(
      true,
    );
    expect(events.at(-1)).toEqual({ type: 'ended' });
  });
});
