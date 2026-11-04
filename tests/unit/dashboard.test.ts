import { beforeEach, describe, expect, it } from 'vitest';
import { startConversation } from '@/server/conversations';
import { getDashboard } from '@/server/dashboard';
import { openDb, type Db } from '@/server/db';
import { logMedicine, runTool } from '@/server/tools';

describe('dashboard', () => {
  let db: Db;
  beforeEach(() => {
    db = openDb(':memory:');
  });

  it('dashboard includes in-progress conversation', () => {
    const id = startConversation(db);
    const d = getDashboard(db);
    expect(d.summaries).toHaveLength(1);
    expect(d.summaries[0]).toMatchObject({ id, endedAt: null, summary: null });
  });

  it("takenToday true only for today's log", () => {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9, 0);
    logMedicine(db, { name: 'Metformin', taken: true }, yesterday);
    const metformin = () => getDashboard(db, now).medicines.find((m) => m.name === 'Metformin');
    expect(metformin()?.takenToday).toBe(false);
    logMedicine(db, { name: 'Metformin', taken: true }, now);
    expect(metformin()?.takenToday).toBe(true);
  });

  it('lists appointments and open alerts first', () => {
    runTool(db, 'book_appointment', { type: 'dentist', when: 'Friday' });
    runTool(db, 'escalate', { issue: 'first' });
    runTool(db, 'escalate', { issue: 'second' });
    db.prepare("UPDATE alerts SET status = 'resolved' WHERE issue = 'second'").run();
    const d = getDashboard(db);
    expect(d.appointments).toHaveLength(1);
    expect(d.appointments[0]).toMatchObject({ type: 'dentist', when: 'Friday' });
    expect(d.alerts.map((a) => a.issue)).toEqual(['first', 'second']);
    expect(d.alerts[0].status).toBe('open');
  });
});
