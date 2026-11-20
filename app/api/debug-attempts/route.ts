import { attemptFileName, debugEnabled, saveAttempt } from "@/lib/server/debug-attempts";

export async function POST(request: Request) {
  if (!debugEnabled()) return Response.json({}, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const { trendId, move } = (body ?? {}) as { trendId?: unknown; move?: unknown };
  if (typeof trendId !== "string" || typeof move !== "string") {
    return Response.json({ error: "trendId and move are required" }, { status: 400 });
  }
  const name = attemptFileName(trendId, move, new Date());
  await saveAttempt(name, JSON.stringify(body));
  return Response.json({ file: `debug-attempts/${name}` });
}
