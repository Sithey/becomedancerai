import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { parseRange } from "@/lib/server/range";
import { isValidVideoFileName, videoFilePath } from "@/lib/server/videos";

type Context = { params: Promise<{ file: string }> };

async function prepare(request: Request, { params }: Context) {
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

  return { path, start, end, status: range ? 206 : 200, headers };
}

export async function GET(request: Request, context: Context) {
  const video = await prepare(request, context);
  if (video instanceof Response) return video;
  const body = Readable.toWeb(createReadStream(video.path, { start: video.start, end: video.end })) as ReadableStream;
  return new Response(body, { status: video.status, headers: video.headers });
}

// Without this, Next answers HEAD with GET and drops the body unread, leaking the open file.
export async function HEAD(request: Request, context: Context) {
  const video = await prepare(request, context);
  if (video instanceof Response) return video;
  return new Response(null, { status: video.status, headers: video.headers });
}
