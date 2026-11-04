import { COPY } from '@/config/copy';
import type { Db } from './db';
import { emitChange } from './events';

export type TranscriptLine = { role: 'elder' | 'maya'; text: string; at: string };

export interface Summarizer {
  summarize(lines: TranscriptLine[]): Promise<string>;
}

export const SUMMARY_UNAVAILABLE = COPY.summaryUnavailable;
const EMPTY_SUMMARY = 'Short conversation, nothing to report.';

export const fakeSummarizer: Summarizer = {
  async summarize(lines) {
    const elder = lines.filter((l) => l.role === 'elder').slice(0, 3);
    return elder.length ? elder.map((l) => l.text).join('\n') : EMPTY_SUMMARY;
  },
};

export function openaiSummarizer(apiKey: string): Summarizer {
  return {
    async summarize(lines) {
      if (!lines.length) return EMPTY_SUMMARY;
      const transcript = lines.map((l) => `${l.role === 'elder' ? 'Elder' : 'Maya'}: ${l.text}`).join('\n');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OPENAI_SUMMARY_MODEL || 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content:
                'Summarize this conversation between an elderly person and their AI helper Maya for a family member. ' +
                'Write 2 to 3 short plain lines. Mention anything booked, medicine taken, or problems raised. No headings.',
            },
            { role: 'user', content: transcript },
          ],
        }),
      });
      if (!res.ok) throw new Error(`summary request failed: ${res.status}`);
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error('empty summary');
      return text;
    },
  };
}

export function getSummarizer(): Summarizer {
  const key = process.env.OPENAI_API_KEY;
  if (process.env.VOICE_PROVIDER === 'fake' || !key) return fakeSummarizer;
  return openaiSummarizer(key);
}

export function startConversation(db: Db): number {
  const r = db.prepare("INSERT INTO conversations (started_at, transcript) VALUES (?, '[]')").run(new Date().toISOString());
  emitChange('conversations');
  return Number(r.lastInsertRowid);
}

function readTranscript(db: Db, id: number): TranscriptLine[] {
  const row = db.prepare('SELECT transcript FROM conversations WHERE id = ?').get(id) as { transcript: string } | undefined;
  if (!row) throw new Error(`no conversation ${id}`);
  return JSON.parse(row.transcript) as TranscriptLine[];
}

export function appendLine(db: Db, id: number, line: TranscriptLine): void {
  db.transaction(() => {
    const lines = readTranscript(db, id);
    lines.push(line);
    db.prepare('UPDATE conversations SET transcript = ? WHERE id = ?').run(JSON.stringify(lines), id);
  })();
}

// Ends in flight, so a double "end" (button + tab close) summarizes once.
const ending = new Map<number, Promise<{ summary: string }>>();

export function endConversation(db: Db, id: number, s: Summarizer): Promise<{ summary: string }> {
  const pending = ending.get(id);
  if (pending) return pending;
  const p = finish(db, id, s).finally(() => ending.delete(id));
  ending.set(id, p);
  return p;
}

async function finish(db: Db, id: number, s: Summarizer): Promise<{ summary: string }> {
  const row = db.prepare('SELECT ended_at, summary FROM conversations WHERE id = ?').get(id) as
    | { ended_at: string | null; summary: string | null }
    | undefined;
  if (!row) throw new Error(`no conversation ${id}`);
  if (row.ended_at) return { summary: row.summary ?? SUMMARY_UNAVAILABLE };

  let summary: string;
  try {
    summary = await s.summarize(readTranscript(db, id));
  } catch {
    summary = SUMMARY_UNAVAILABLE;
  }
  db.prepare('UPDATE conversations SET ended_at = ?, summary = ? WHERE id = ?').run(new Date().toISOString(), summary, id);
  emitChange('conversations');
  return { summary };
}
