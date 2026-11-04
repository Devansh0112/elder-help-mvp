import { endConversation, getSummarizer } from '@/server/conversations';
import { getDb } from '@/server/db';

export async function POST(_req: Request, ctx: RouteContext<'/api/conversations/[id]/end'>) {
  const id = Number((await ctx.params).id);
  try {
    return Response.json(await endConversation(getDb(), id, getSummarizer()));
  } catch {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }
}
