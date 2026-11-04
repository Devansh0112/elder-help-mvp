import { startConversation } from '@/server/conversations';
import { getDb } from '@/server/db';

export async function POST() {
  return Response.json({ id: startConversation(getDb()) });
}
