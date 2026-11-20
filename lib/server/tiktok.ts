import "server-only";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { MAX_UPLOAD_BYTES } from "@/lib/pose/config";
import { hasMp4FileType } from "./videos";

const run = promisify(execFile);
const VIDEO_HOST = "www.tiktok.com";
const SHORT_HOSTS = new Set(["vm.tiktok.com", "vt.tiktok.com"]);
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

export function parseTikTokUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 2048 || !URL.canParse(value)) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.port || url.username || url.password) return null;

  if (
    (url.hostname === VIDEO_HOST || url.hostname === "tiktok.com") &&
    /^\/@[a-z0-9_.-]*\/video\/\d+\/?$/i.test(url.pathname)
  ) {
    return new URL(url.pathname, `https://${VIDEO_HOST}`);
  }
  if (SHORT_HOSTS.has(url.hostname) && /^\/[a-z0-9_]+\/?$/i.test(url.pathname)) {
    return new URL(url.pathname, url.origin);
  }
  return null;
}

async function resolveShortLink(url: URL, signal: AbortSignal): Promise<URL> {
  for (let hop = 0; hop < 4 && SHORT_HOSTS.has(url.hostname); hop++) {
    // Follow only redirects to URLs we would accept directly.
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      headers: { "User-Agent": "facebookexternalhit/1.1" },
      signal,
    });
    const location = response.headers.get("location");
    const next = location && REDIRECT_STATUSES.includes(response.status)
      ? parseTikTokUrl(new URL(location, url).href)
      : null;
    if (!next) throw new Error("TikTok short link did not redirect to a video");
    url = next;
  }
  if (url.hostname !== VIDEO_HOST) throw new Error("Too many TikTok redirects");
  return url;
}

export class TikTokVideoTooLargeError extends Error {}
export class TikTokBusyError extends Error {}

// Each download runs a yt-dlp process and holds up to MAX_UPLOAD_BYTES in memory.
const MAX_CONCURRENT_DOWNLOADS = 2;
let activeDownloads = 0;

export async function downloadTikTok(url: URL, requestSignal: AbortSignal) {
  if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) throw new TikTokBusyError();
  activeDownloads++;
  try {
    return await download(url, requestSignal);
  } finally {
    activeDownloads--;
  }
}

async function download(url: URL, requestSignal: AbortSignal) {
  const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(30_000)]);
  const videoUrl = await resolveShortLink(url, signal);
  try {
    const { stdout } = await run("yt-dlp", [
      "--ignore-config", "--no-plugin-dirs", "--no-cache-dir",
      "--use-extractors", "^TikTok$", "--no-playlist",
      "--socket-timeout", "10", "--retries", "1",
      "--format", "bv*[ext=mp4][protocol=https]", "--format-sort", "vcodec:h264",
      "--fixup", "never", "--quiet", "--output", "-", "--", videoUrl.href,
    ], { encoding: "buffer", maxBuffer: MAX_UPLOAD_BYTES, killSignal: "SIGKILL", signal });

    // yt-dlp's format filter relies on upstream metadata. Check the MP4 file type box too.
    if (!hasMp4FileType(stdout)) {
      throw new Error("TikTok did not return an MP4");
    }
    return stdout;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
      throw new TikTokVideoTooLargeError();
    }
    throw error;
  }
}
