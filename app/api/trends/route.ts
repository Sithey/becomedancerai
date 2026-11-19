import { MAX_TRENDS, MAX_UPLOAD_BYTES } from "@/lib/pose/config";
import { countTrends, createTrend } from "@/lib/server/trends";
import { parseNewTrend } from "@/lib/server/validate-trend";

// Room for the pose JSON and the multipart overhead next to the video.
const MAX_BODY_BYTES = MAX_UPLOAD_BYTES + 10 * 1024 * 1024;

export async function POST(request: Request) {
  // formData() buffers the whole body in memory: refuse oversized uploads before reading it.
  const contentLength = Number(request.headers.get("content-length") ?? NaN);
  if (Number.isNaN(contentLength) || contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Video must be under 50 MB" }, { status: 413 });
  }
  try {
    const parsed = parseNewTrend(await request.formData());
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    if ((await countTrends()) >= MAX_TRENDS) {
      return Response.json({ error: "The library is full." }, { status: 400 });
    }
    const { id } = await createTrend(parsed.value, parsed.video);
    return Response.json({ id }, { status: 201 });
  } catch {
    return Response.json({ error: "Could not save the trend" }, { status: 500 });
  }
}
