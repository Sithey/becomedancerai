import { downloadTikTok, parseTikTokUrl, TikTokVideoTooLargeError } from "@/lib/server/tiktok";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const url = parseTikTokUrl(body?.url);
  if (!url) {
    return Response.json({ error: "This doesn't look like a TikTok link" }, { status: 400 });
  }

  try {
    const video = await downloadTikTok(url, request.signal);
    return new Response(new Uint8Array(video), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(video.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof TikTokVideoTooLargeError) {
      return Response.json({ error: "Video must be under 50 MB" }, { status: 413 });
    }
    return Response.json({
      error: "Couldn't download this TikTok. Save the video and upload the mp4 instead.",
    }, { status: 502 });
  }
}
