import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDb, type Db } from '@/server/db';
import { onChange, type ChangeKind } from '@/server/events';
import { runTool } from '@/server/tools';

const TOOL_FAILED = "I couldn't do that, I've told your family.";

function count(db: Db, table: string): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
}

describe('tools', () => {
  let db: Db;
  let changes: ChangeKind[];
  let unsubscribe: () => void;

  beforeEach(() => {
    db = openDb(':memory:');
    changes = [];
    unsubscribe = onChange((k) => changes.push(k));
  });
  afterEach(() => unsubscribe());

  it('book_appointment saves row and returns APT code', () => {
    const r = runTool(db, 'book_appointment', { type: 'doctor', when: 'next week' });
    expect(r.ok).toBe(true);
    expect(r.message).toBe('Your doctor appointment is booked for next week.');
    expect(r.data?.confirmationCode).toMatch(/^APT-[A-Z0-9]{6}$/);
    expect(count(db, 'appointments')).toBe(1);
    expect(changes).toContain('appointments');
  });

  it('book_appointment rejects blank args', () => {
    const r = runTool(db, 'book_appointment', { type: '  ', when: '' });
    expect(r.ok).toBe(false);
    expect(r.message).toBe(TOOL_FAILED);
    expect(count(db, 'alerts')).toBe(1);
    expect(count(db, 'appointments')).toBe(0);
  });

  it('log_medicine matches loosely', () => {
    const metforminId = (db.prepare("SELECT id FROM medicine_schedule WHERE name = 'Metformin'").get() as { id: number })
      .id;
    const r = runTool(db, 'log_medicine', { name: 'my METFORMIN pill', taken: true });
    expect(r.ok).toBe(true);
    const row = db.prepare('SELECT schedule_id FROM medicine_log').get() as { schedule_id: number };
    expect(row.schedule_id).toBe(metforminId);
    expect(changes).toContain('medicine');
  });

  it('log_medicine unknown name fails with alert', () => {
    const r = runTool(db, 'log_medicine', { name: 'aspirin', taken: true });
    expect(r.ok).toBe(false);
    expect(r.message).toBe(TOOL_FAILED);
    expect(count(db, 'alerts')).toBe(1);
  });

  it('log_medicine twice same day is idempotent', () => {
    runTool(db, 'log_medicine', { name: 'Metformin', taken: true });
    const r = runTool(db, 'log_medicine', { name: 'metformin', taken: true });
    expect(r.ok).toBe(true);
    expect(r.message).toContain('already');
    expect(count(db, 'medicine_log')).toBe(1);
  });

  it('escalate creates open alert', () => {
    const r = runTool(db, 'escalate', { issue: 'My sink is leaking' });
    expect(r.ok).toBe(true);
    expect(r.message).toBe("I've let your family know.");
    const row = db.prepare('SELECT issue, status FROM alerts').get() as { issue: string; status: string };
    expect(row).toEqual({ issue: 'My sink is leaking', status: 'open' });
    expect(changes).toContain('alerts');
  });

  it('unknown tool creates alert', () => {
    const r = runTool(db, 'order_pizza', {});
    expect(r.ok).toBe(false);
    expect(r.message).toBe(TOOL_FAILED);
    const row = db.prepare('SELECT issue FROM alerts').get() as { issue: string };
    expect(row.issue).toBe('Maya could not complete: order_pizza');
  });
});
