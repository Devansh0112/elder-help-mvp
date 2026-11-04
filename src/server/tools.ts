import { randomInt } from 'node:crypto';
import type { Db } from './db';
import { emitChange } from './events';
import { localDayRange } from './time';

export type ToolResult = { ok: boolean; message: string; data?: Record<string, unknown> };

export const TOOL_FAILED_MESSAGE = "I couldn't do that, I've told your family.";
export const ESCALATED_MESSAGE = "I've let your family know.";

// Thrown by a handler when it cannot do what was asked; runTool turns it into an alert.
class ToolError extends Error {}

function requireText(args: unknown, key: string): string {
  const value = (args as Record<string, unknown> | null)?.[key];
  if (typeof value !== 'string' || value.trim() === '') throw new ToolError(`missing ${key}`);
  return value.trim();
}

function confirmationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'APT-';
  for (let i = 0; i < 6; i++) code += chars[randomInt(chars.length)];
  return code;
}

export function bookAppointment(db: Db, args: { type: string; when: string }): ToolResult {
  const type = requireText(args, 'type');
  const when = requireText(args, 'when');
  const code = confirmationCode();
  db.prepare('INSERT INTO appointments (type, when_text, confirmation_code, created_at) VALUES (?, ?, ?, ?)').run(
    type,
    when,
    code,
    new Date().toISOString(),
  );
  emitChange('appointments');
  return { ok: true, message: `Your ${type} appointment is booked for ${when}.`, data: { confirmationCode: code } };
}

export function logMedicine(db: Db, args: { name: string; taken: boolean }, now: Date = new Date()): ToolResult {
  const name = requireText(args, 'name').toLowerCase();
  if (typeof args?.taken !== 'boolean') throw new ToolError('missing taken');

  const schedule = db.prepare('SELECT id, name FROM medicine_schedule ORDER BY id').all() as { id: number; name: string }[];
  const match = schedule.find((m) => {
    const scheduled = m.name.toLowerCase();
    return name.includes(scheduled) || scheduled.includes(name);
  });
  if (!match) throw new ToolError(`no scheduled medicine matches "${name}"`);

  const { start, end } = localDayRange(now);
  const already = db
    .prepare('SELECT 1 FROM medicine_log WHERE schedule_id = ? AND taken = 1 AND logged_at >= ? AND logged_at < ?')
    .get(match.id, start, end);
  if (already) return { ok: true, message: `You've already logged your ${match.name} today.` };

  db.prepare('INSERT INTO medicine_log (schedule_id, taken, logged_at) VALUES (?, ?, ?)').run(
    match.id,
    args.taken ? 1 : 0,
    now.toISOString(),
  );
  emitChange('medicine');
  return args.taken
    ? { ok: true, message: `Thank you. I've noted that you took your ${match.name}.` }
    : { ok: true, message: `Okay. I've noted that you haven't taken your ${match.name} yet.` };
}

export function escalate(db: Db, args: { issue: string }): ToolResult {
  const issue = requireText(args, 'issue');
  createAlert(db, issue);
  return { ok: true, message: ESCALATED_MESSAGE };
}

function createAlert(db: Db, issue: string): void {
  db.prepare("INSERT INTO alerts (issue, status, created_at) VALUES (?, 'open', ?)").run(issue, new Date().toISOString());
  emitChange('alerts');
}

const handlers: Record<string, (db: Db, args: never) => ToolResult> = {
  book_appointment: bookAppointment,
  log_medicine: logMedicine,
  escalate,
};

export function runTool(db: Db, name: string, args: unknown): ToolResult {
  try {
    const handler = handlers[name];
    if (!handler) throw new ToolError(`unknown tool ${name}`);
    return handler(db, args as never);
  } catch {
    // Nothing fails silently: the family hears about every failed request.
    createAlert(db, `Maya could not complete: ${name}`);
    return { ok: false, message: TOOL_FAILED_MESSAGE };
  }
}
