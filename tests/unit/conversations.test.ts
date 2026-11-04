import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openDb, type Db } from '@/server/db';
import {
  appendLine,
  endConversation,
  fakeSummarizer,
  startConversation,
  type Summarizer,
} from '@/server/conversations';

type Row = { ended_at: string | null; summary: string | null; transcript: string };

function row(db: Db, id: number): Row {
  return db.prepare('SELECT ended_at, summary, transcript FROM conversations WHERE id = ?').get(id) as Row;
}

describe('conversations', () => {
  let db: Db;
  beforeEach(() => {
    db = openDb(':memory:');
  });

  it('end stores summary and ended_at', async () => {
    const id = startConversation(db);
    appendLine(db, id, { role: 'elder', text: 'I need to see my doctor', at: new Date().toISOString() });
    appendLine(db, id, { role: 'maya', text: 'Booked.', at: new Date().toISOString() });
    const { summary } = await endConversation(db, id, fakeSummarizer);
    expect(summary).toBe('I need to see my doctor');
    const r = row(db, id);
    expect(r.summary).toBe('I need to see my doctor');
    expect(r.ended_at).not.toBeNull();
    expect(JSON.parse(r.transcript)).toHaveLength(2);
  });

  it('end twice calls summarizer once', async () => {
    const s: Summarizer = { summarize: vi.fn(async () => 'Talked about the doctor.') };
    const id = startConversation(db);
    const first = await endConversation(db, id, s);
    const second = await endConversation(db, id, s);
    expect(s.summarize).toHaveBeenCalledTimes(1);
    expect(second.summary).toBe(first.summary);
  });

  it('summarizer failure stores placeholder', async () => {
    const s: Summarizer = {
      summarize: async () => {
        throw new Error('down');
      },
    };
    const id = startConversation(db);
    const { summary } = await endConversation(db, id, s);
    expect(summary).toBe('Summary unavailable');
    expect(row(db, id).summary).toBe('Summary unavailable');
  });

  it('unended conversation keeps null ended_at', () => {
    const id = startConversation(db);
    appendLine(db, id, { role: 'elder', text: 'hello', at: new Date().toISOString() });
    const r = row(db, id);
    expect(r.ended_at).toBeNull();
    expect(r.summary).toBeNull();
  });
});
