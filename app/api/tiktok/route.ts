import { readTextBody } from "@/lib/server/read-body";
import { downloadTikTok, parseTikTokUrl, TikTokBusyError, TikTokVideoTooLargeError } from "@/lib/server/tiktok";

// The body only carries a URL of at most 2048 characters.
const MAX_BODY_BYTES = 4096;
const NOT_A_TIKTOK_LINK = "This doesn't look like a TikTok link";

function urlFrom(text: string): unknown {
  try {
    return JSON.parse(text)?.url;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const text = await readTextBody(request, MAX_BODY_BYTES).catch(() => "");
  if (text === null) return Response.json({ error: NOT_A_TIKTOK_LINK }, { status: 413 });
  const url = parseTikTokUrl(urlFrom(text));
  if (!url) {
    return Response.json({ error: NOT_A_TIKTOK_LINK }, { status: 400 });
  }

  try {
    const video = await downloadTikTok(url, request.signal);
    // A byte array body would be copied again; a stream hands over the downloaded buffer as is.
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(video);
        controller.close();
      },
    });
    return new Response(body, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(video.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof TikTokBusyError) {
      return Response.json({ error: "Busy importing another video. Try again in a moment." }, { status: 429 });
    }
    if (error instanceof TikTokVideoTooLargeError) {
      return Response.json({ error: "Video must be under 50 MB" }, { status: 413 });
    }
    console.error("[api/tiktok]", error);
    return Response.json({
      error: "Couldn't download this TikTok. Save the video and upload the mp4 instead.",
    }, { status: 502 });
  }
}
