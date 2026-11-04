import { connection } from 'next/server';
import { getDashboard } from '@/server/dashboard';
import { getDb } from '@/server/db';

export async function GET() {
  // Synchronous SQLite reads would otherwise be prerendered at build time.
  await connection();
  return Response.json(getDashboard(getDb()));
}
