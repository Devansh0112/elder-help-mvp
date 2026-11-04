import { getDb } from '@/server/db';
import { runTool } from '@/server/tools';

export async function POST(req: Request, ctx: RouteContext<'/api/tools/[name]'>) {
  const { name } = await ctx.params;
  const args = await req.json().catch(() => null);
  return Response.json(runTool(getDb(), name, args));
}
