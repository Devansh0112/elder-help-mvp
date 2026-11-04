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

  it('negation logs the due medicine as not taken', () => {
    for (const text of ["I haven't taken it yet", 'I forgot to take it', 'I did not take my pill']) {
      expect(parseIntent(text, { dueMedicine: 'Metformin' })).toEqual({
        tool: 'log_medicine',
        args: { name: 'Metformin', taken: false },
      });
    }
  });

  it('uses a medicine named in the text over the due one', () => {
    expect(parseIntent('I took my lisinopril', { dueMedicine: 'Metformin' })).toEqual({
      tool: 'log_medicine',
      args: { name: 'Lisinopril', taken: true },
    });
  });

  it('"take" without a medicine reference escalates', () => {
    const text = "I can't take the stairs today";
    expect(parseIntent(text, { dueMedicine: 'Metformin' })).toEqual({ tool: 'escalate', args: { issue: text } });
  });

  it('escalates anything else', () => {
    expect(parseIntent('My sink is leaking')).toEqual({ tool: 'escalate', args: { issue: 'My sink is leaking' } });
  });
});
