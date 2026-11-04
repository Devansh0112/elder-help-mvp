import type { Db } from './db';
import { localDayRange } from './time';

export type DashboardData = {
  summaries: { id: number; startedAt: string; endedAt: string | null; summary: string | null }[];
  appointments: { id: number; type: string; when: string; confirmationCode: string }[];
  medicines: { scheduleId: number; name: string; dose: string; timeOfDay: string; takenToday: boolean }[];
  alerts: { id: number; issue: string; status: 'open' | 'resolved'; createdAt: string }[];
};

export function getDashboard(db: Db, now: Date = new Date()): DashboardData {
  const { start, end } = localDayRange(now);

  const summaries = db
    .prepare(
      `SELECT id, started_at AS startedAt, ended_at AS endedAt, summary
       FROM conversations ORDER BY started_at DESC, id DESC LIMIT 10`,
    )
    .all() as DashboardData['summaries'];

  const appointments = db
    .prepare(
      `SELECT id, type, when_text AS "when", confirmation_code AS confirmationCode
       FROM appointments ORDER BY created_at DESC, id DESC`,
    )
    .all() as DashboardData['appointments'];

  const medicines = (
    db
      .prepare(
        `SELECT s.id AS scheduleId, s.name, s.dose, s.time_of_day AS timeOfDay,
           EXISTS (SELECT 1 FROM medicine_log l
                   WHERE l.schedule_id = s.id AND l.taken = 1 AND l.logged_at >= ? AND l.logged_at < ?) AS takenToday
         FROM medicine_schedule s ORDER BY s.time_of_day, s.id`,
      )
      .all(start, end) as (Omit<DashboardData['medicines'][number], 'takenToday'> & { takenToday: number })[]
  ).map((m) => ({ ...m, takenToday: m.takenToday === 1 }));

  const alerts = db
    .prepare(
      `SELECT id, issue, status, created_at AS createdAt
       FROM alerts ORDER BY (status = 'open') DESC, created_at DESC, id DESC`,
    )
    .all() as DashboardData['alerts'];

  return { summaries, appointments, medicines, alerts };
}
