import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { POST } from "@/app/api/tiktok/route";

const run = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("node:child_process", async () => {
  const { promisify } = await import("node:util");
  return { execFile: Object.assign(() => {}, { [promisify.custom]: run }) };
});

const directLink = "https://www.tiktok.com/@dancer/video/123456789";
const shortLink = "https://vm.tiktok.com/ZExample/";
const mobileShortLink = "https://vt.tiktok.com/ZExample/";
const mp4 = Buffer.from("000000186674797069736f6d00000000", "hex");

function importVideo(url: string, extra: Record<string, string> = {}) {
  return POST(new Request("http://localhost/api/tiktok", {
    method: "POST",
    body: JSON.stringify({ url, ...extra }),
  }));
}

let logError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  run.mockReset();
});

test.each([
  "https://example.com/@dancer/video/123456789",
  "https://www.tiktok.com.example.com/@dancer/video/123456789",
  "https://vt.tiktok.com.example.com/ZExample/",
  "https://www.tiktok.com@example.com/@dancer/video/123456789",
  "https://user@www.tiktok.com/@dancer/video/123456789",
  "https://www.tiktok.com:8443/@dancer/video/123456789",
  "http://vm.tiktok.com/ZExample/",
  "https://www.tiktok.com/@dancer",
  "https://vm.tiktok.com/ZExample/extra",
])("rejects %s before making any network request", async (url) => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const response = await importVideo(url);
  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: "This doesn't look like a TikTok link" });
  expect(fetch).not.toHaveBeenCalled();
  expect(run).not.toHaveBeenCalled();
});

test("strips share parameters and returns an MP4 from the TikTok extractor", async () => {
  run.mockResolvedValue({ stdout: mp4 });
  const response = await importVideo(`${directLink}?share=1#video`);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("video/mp4");
  expect(Buffer.from(await response.arrayBuffer())).toEqual(mp4);
  const [command, args] = run.mock.calls[0];
  expect(command).toBe("yt-dlp");
  expect(args).toContain("^TikTok$");
  expect(args.slice(-2)).toEqual(["--", directLink]);
});

test.each([shortLink, mobileShortLink])("resolves %s before starting the downloader", async (url) => {
  const redirect = "https://www.tiktok.com/@/video/123456789";
  const fetch = vi.fn().mockResolvedValue(Response.redirect(`${redirect}?_r=1`));
  vi.stubGlobal("fetch", fetch);
  run.mockResolvedValue({ stdout: mp4 });
  const response = await importVideo(url);
  expect(response.status).toBe(200);
  expect(fetch.mock.calls[0][0].href).toBe(url);
  expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
  expect(run.mock.calls[0][1].at(-1)).toBe(redirect);
});

test("rejects an off-site redirect without following it", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.redirect("https://example.com/video.mp4"));
  vi.stubGlobal("fetch", fetch);
  const response = await importVideo(shortLink);
  expect(response.status).toBe(502);
  await expect(response.json()).resolves.toEqual({
    error: "Couldn't download this TikTok. Save the video and upload the mp4 instead.",
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(run).not.toHaveBeenCalled();
});

test("rejects downloader output that lacks an MP4 file type box, and logs why", async () => {
  run.mockResolvedValue({ stdout: Buffer.from("<html>Video unavailable</html>") });
  expect((await importVideo(directLink)).status).toBe(502);
  expect(logError).toHaveBeenCalledWith("[api/tiktok]", expect.any(Error));
});

test("refuses a body over 4 KB before making any network request", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const response = await importVideo(directLink, { padding: "x".repeat(4096) });
  expect(response.status).toBe(413);
  await expect(response.json()).resolves.toEqual({ error: "This doesn't look like a TikTok link" });
  expect(fetch).not.toHaveBeenCalled();
  expect(run).not.toHaveBeenCalled();
});

test("runs at most two downloads at a time", async () => {
  const finish: (() => void)[] = [];
  run.mockImplementation(() => new Promise((resolve) => finish.push(() => resolve({ stdout: mp4 }))));
  const first = importVideo(directLink);
  const second = importVideo(directLink);
  await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(2));

  const third = await importVideo(directLink);
  expect(third.status).toBe(429);
  await expect(third.json()).resolves.toEqual({ error: "Busy importing another video. Try again in a moment." });
  expect(run).toHaveBeenCalledTimes(2);

  finish.forEach((done) => done());
  expect((await first).status).toBe(200);
  expect((await second).status).toBe(200);
  run.mockResolvedValue({ stdout: mp4 });
  expect((await importVideo(directLink)).status).toBe(200);
});

test("a failed download frees its slot", async () => {
  run.mockRejectedValueOnce(new Error("yt-dlp failed")).mockRejectedValueOnce(new Error("yt-dlp failed"));
  expect((await importVideo(directLink)).status).toBe(502);
  expect((await importVideo(directLink)).status).toBe(502);
  run.mockResolvedValue({ stdout: mp4 });
  expect((await importVideo(directLink)).status).toBe(200);
});

test("returns the upload size error if the downloader exceeds 50 MB", async () => {
  run.mockRejectedValue(Object.assign(new Error(), { code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" }));
  const response = await importVideo(directLink);
  expect(response.status).toBe(413);
  await expect(response.json()).resolves.toEqual({ error: "Video must be under 50 MB" });
});
