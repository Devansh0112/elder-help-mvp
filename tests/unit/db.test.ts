import { describe, expect, it } from 'vitest';
import { openDb, resetDb, seedIfEmpty } from '@/server/db';

const TABLES = ['conversations', 'appointments', 'medicine_schedule', 'medicine_log', 'alerts'];

function count(db: ReturnType<typeof openDb>, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}

describe('db', () => {
  it('creates all five tables', () => {
    const db = openDb(':memory:');
    const names = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(
      (r) => r.name,
    );
    for (const t of TABLES) expect(names).toContain(t);
  });

  it('seeds two medicines once', () => {
    const db = openDb(':memory:');
    expect(count(db, 'medicine_schedule')).toBe(2);
    seedIfEmpty(db);
    expect(count(db, 'medicine_schedule')).toBe(2);
  });

  it('resetDb clears data and re-seeds', () => {
    const db = openDb(':memory:');
    db.prepare("INSERT INTO alerts (issue, status, created_at) VALUES ('x', 'open', ?)").run(new Date().toISOString());
    resetDb(db);
    expect(count(db, 'alerts')).toBe(0);
    expect(count(db, 'medicine_schedule')).toBe(2);
  });
});
