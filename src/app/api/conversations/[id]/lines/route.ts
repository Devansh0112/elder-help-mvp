import { appendLine, type TranscriptLine } from '@/server/conversations';
import { getDb } from '@/server/db';

export async function POST(req: Request, ctx: RouteContext<'/api/conversations/[id]/lines'>) {
  const id = Number((await ctx.params).id);
  const line = (await req.json().catch(() => null)) as Partial<TranscriptLine> | null;
  if (!line || (line.role !== 'elder' && line.role !== 'maya') || typeof line.text !== 'string') {
    return Response.json({ error: 'bad_line' }, { status: 400 });
  }
  try {
    appendLine(getDb(), id, { role: line.role, text: line.text, at: line.at ?? new Date().toISOString() });
  } catch {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
