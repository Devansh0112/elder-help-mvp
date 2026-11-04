// Keyword intent parser for the fake voice provider and the text-chat fallback.
export type Intent =
  | { tool: 'book_appointment'; args: { type: string; when: string } }
  | { tool: 'log_medicine'; args: { name: string; taken: boolean } }
  | { tool: 'escalate'; args: { issue: string } };

const BOOK = /\b(doctor|appointment|dentist)\b/i;
const TOOK = /\b(took|taken|take)\b/i;

function whenFrom(text: string): string {
  // "next week" / "tomorrow morning" keep their keyword; "on Friday" drops "on".
  const relative = text.match(/\b((?:next|tomorrow)\b.*)$/i);
  if (relative) return relative[1].replace(/[.?!]+$/, '').trim();
  const on = text.match(/\bon\s+(.+)$/i);
  if (on) return on[1].replace(/[.?!]+$/, '').trim();
  return 'soon';
}

export function parseIntent(text: string, ctx: { dueMedicine?: string } = {}): Intent {
  const book = text.match(BOOK);
  if (book) {
    const word = book[1].toLowerCase();
    return { tool: 'book_appointment', args: { type: word === 'appointment' ? 'doctor' : word, when: whenFrom(text) } };
  }
  if (TOOK.test(text)) return { tool: 'log_medicine', args: { name: ctx.dueMedicine ?? text, taken: true } };
  return { tool: 'escalate', args: { issue: text } };
}
