import { connection } from 'next/server';
import { getDb } from '@/server/db';
import { dueReminders } from '@/server/reminders';

export async function GET() {
  await connection();
  return Response.json(dueReminders(getDb()));
}
