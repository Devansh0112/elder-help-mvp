import type { Db } from './db';
import { localDayRange } from './time';

// The spec's "backend timer" is the elder page polling this every 60 seconds.
export function dueReminders(db: Db, now: Date = new Date()): { scheduleId: number; name: string; dose: string }[] {
  const { start, end } = localDayRange(now);
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return db
    .prepare(
      `SELECT s.id AS scheduleId, s.name, s.dose
       FROM medicine_schedule s
       WHERE s.time_of_day <= ?
         AND NOT EXISTS (SELECT 1 FROM medicine_log l
                         WHERE l.schedule_id = s.id AND l.taken = 1 AND l.logged_at >= ? AND l.logged_at < ?)
       ORDER BY s.time_of_day, s.id`,
    )
    .all(hhmm, start, end) as { scheduleId: number; name: string; dose: string }[];
}
