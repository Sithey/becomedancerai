import { attemptFileName, debugEnabled, saveAttempt } from "@/lib/server/debug-attempts";
import { readTextBody } from "@/lib/server/read-body";

// About 2.4 KB per recorded frame: 20 MB is several minutes of recording. next dev also listens on the LAN.
const MAX_BODY_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  if (!debugEnabled()) return Response.json({}, { status: 404 });
  const text = await readTextBody(request, MAX_BODY_BYTES);
  if (text === null) return Response.json({ error: "Attempt is too large" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
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
