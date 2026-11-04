import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { household } from '@/config/household';

export type Db = import('better-sqlite3').Database;

export function migrate(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      transcript TEXT NOT NULL DEFAULT '[]',
      summary TEXT
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      when_text TEXT NOT NULL,
      confirmation_code TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS medicine_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dose TEXT NOT NULL,
      time_of_day TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS medicine_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL REFERENCES medicine_schedule(id),
      taken INTEGER NOT NULL,
      logged_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
      created_at TEXT NOT NULL
    );
  `);
}

export function seedIfEmpty(db: Db): void {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM medicine_schedule').get() as { n: number };
  if (n > 0) return;
  const insert = db.prepare('INSERT INTO medicine_schedule (name, dose, time_of_day) VALUES (?, ?, ?)');
  for (const m of household.medicines) insert.run(m.name, m.dose, m.timeOfDay);
}

export function resetDb(db: Db): void {
  db.transaction(() => {
    db.exec(`
      DELETE FROM medicine_log;
      DELETE FROM medicine_schedule;
      DELETE FROM appointments;
      DELETE FROM alerts;
      DELETE FROM conversations;
      DELETE FROM sqlite_sequence;
    `);
    seedIfEmpty(db);
  })();
}

export function openDb(file: string = process.env.DB_PATH ?? 'data/elder-help.db'): Db {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  seedIfEmpty(db);
  return db;
}

// One handle per server process; kept on globalThis so Next.js dev reloads reuse it.
const g = globalThis as unknown as { __elderHelpDb?: Db };

export function getDb(): Db {
  g.__elderHelpDb ??= openDb();
  return g.__elderHelpDb;
}
