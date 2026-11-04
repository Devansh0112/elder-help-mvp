import { describe, expect, it } from 'vitest';
import { parseIntent } from '@/server/intent';

describe('parseIntent', () => {
  it('books a doctor appointment', () => {
    expect(parseIntent('I need to see my doctor next week')).toEqual({
      tool: 'book_appointment',
      args: { type: 'doctor', when: 'next week' },
    });
  });

  it('maps "appointment" to doctor and defaults when to soon', () => {
    expect(parseIntent('Can you make me an appointment')).toEqual({
      tool: 'book_appointment',
      args: { type: 'doctor', when: 'soon' },
    });
  });

  it('logs the due medicine for "I took it"', () => {
    expect(parseIntent('I took it', { dueMedicine: 'Metformin' })).toEqual({
      tool: 'log_medicine',
      args: { name: 'Metformin', taken: true },
    });
  });

  it('escalates anything else', () => {
    expect(parseIntent('My sink is leaking')).toEqual({ tool: 'escalate', args: { issue: 'My sink is leaking' } });
  });
});
