// Keyword intent parser for the fake voice provider and the text-chat fallback.
import { household } from '@/config/household';

export type Intent =
  | { tool: 'book_appointment'; args: { type: string; when: string } }
  | { tool: 'log_medicine'; args: { name: string; taken: boolean } }
  | { tool: 'escalate'; args: { issue: string } };

const BOOK = /\b(doctor|appointment|dentist)\b/i;
const TOOK = /\b(took|taken|take)\b/i;
// "it"/"pill"/... only count as the medicine when a reminder is due.
const MEDICINE_WORD = /\b(it|pills?|tablets?|medicines?|medication|meds|dose)\b/i;
const NEGATION = /\b(not|never|forgot|yet)\b|n't\b/i;

function whenFrom(text: string): string {
  // "next week" / "tomorrow morning" keep their keyword; "on Friday" drops "on".
  const relative = text.match(/\b((?:next|tomorrow)\b.*)$/i);
  if (relative) return relative[1].replace(/[.?!]+$/, '').trim();
  const on = text.match(/\bon\s+(.+)$/i);
  if (on) return on[1].replace(/[.?!]+$/, '').trim();
  return 'soon';
}

function medicineIn(text: string, dueMedicine?: string): string | null {
  const lower = text.toLowerCase();
  const named = household.medicines.find((m) => lower.includes(m.name.toLowerCase()));
  if (named) return named.name;
  if (dueMedicine && MEDICINE_WORD.test(text)) return dueMedicine;
  return null;
}

export function parseIntent(text: string, ctx: { dueMedicine?: string } = {}): Intent {
  const book = text.match(BOOK);
  if (book) {
    const word = book[1].toLowerCase();
    return { tool: 'book_appointment', args: { type: word === 'appointment' ? 'doctor' : word, when: whenFrom(text) } };
  }
  if (TOOK.test(text)) {
    const name = medicineIn(text, ctx.dueMedicine);
    if (name) return { tool: 'log_medicine', args: { name, taken: !NEGATION.test(text) } };
  }
  return { tool: 'escalate', args: { issue: text } };
}
