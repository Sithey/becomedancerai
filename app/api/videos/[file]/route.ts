import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { parseRange } from "@/lib/server/range";
import { isValidVideoFileName, videoFilePath } from "@/lib/server/videos";

export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!isValidVideoFileName(file)) return new Response(null, { status: 404 });

  const path = videoFilePath(file);
  const size = await stat(path).then(
    (s) => s.size,
    () => null,
  );
  // An empty file can't be streamed (its last byte would be -1) and is no playable video anyway.
  if (!size) return new Response(null, { status: 404 });

  const headers: Record<string, string> = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes" };
  const range = parseRange(request.headers.get("range"), size);

  if (range === "unsatisfiable") {
    return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
  }

  const start = range?.start ?? 0;
  const end = range?.end ?? size - 1;
  headers["Content-Length"] = String(end - start + 1);
  if (range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  headers["X-Content-Type-Options"] = "nosniff";
  // File names are random ids that are never reused, so a cached copy never goes stale.
  headers["Cache-Control"] = "public, max-age=31536000, immutable";

  const body = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream;
  return new Response(body, { status: range ? 206 : 200, headers });
}
