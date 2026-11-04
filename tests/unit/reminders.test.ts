import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, type Db } from '@/server/db';
import { dueReminders } from '@/server/reminders';
import { logMedicine } from '@/server/tools';

function todayAt(h: number, m = 0): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
}

describe('reminders', () => {
  let db: Db;
  beforeEach(() => {
    db = openDb(':memory:');
  });

  it('due at 09:00 returns Metformin only', () => {
    const due = dueReminders(db, todayAt(9));
    expect(due.map((r) => r.name)).toEqual(['Metformin']);
    expect(due[0].dose).toBe('500 mg');
  });

  it('due after logging Metformin returns []', () => {
    logMedicine(db, { name: 'Metformin', taken: true }, todayAt(8, 30));
    expect(dueReminders(db, todayAt(9))).toEqual([]);
  });
});
