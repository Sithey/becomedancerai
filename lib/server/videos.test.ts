import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { isValidVideoFileName } from "./videos";

const createReadStream = vi.hoisted(() => vi.fn());
vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  createReadStream.mockImplementation(fs.createReadStream);
  return { ...fs, createReadStream };
});

afterEach(() => vi.unstubAllEnvs());

test.each([
  ["abc123.mp4", true],
  ["../.env", false],
  ["a/b.mp4", false],
  ["ABC.mp4", false],
  ["abc.mov", false],
])("%s → %s", (n, ok) => expect(isValidVideoFileName(n)).toBe(ok));

test("an empty UPLOAD_DIR falls back to ./uploads", async () => {
  vi.resetModules();
  vi.stubEnv("UPLOAD_DIR", "");
  const { UPLOAD_DIR } = await import("./videos");
  expect(UPLOAD_DIR).toBe(join(process.cwd(), "uploads"));
});

describe("/api/videos/[file]", () => {
  let uploads: string;

  beforeEach(async () => {
    vi.resetModules();
    uploads = await mkdtemp(join(tmpdir(), "dance-videos-"));
    vi.stubEnv("UPLOAD_DIR", uploads);
    await writeFile(join(uploads, "abc123.mp4"), Buffer.alloc(1000, 1));
    createReadStream.mockClear();
  });

  afterEach(() => rm(uploads, { recursive: true, force: true }));

  async function request(method: "GET" | "HEAD", headers: Record<string, string> = {}) {
    const route = await import("@/app/api/videos/[file]/route");
    return route[method](new Request("http://localhost/api/videos/abc123.mp4", { method, headers }), {
      params: Promise.resolve({ file: "abc123.mp4" }),
    });
  }

  test("answers HEAD with the GET headers and no body, without opening the file", async () => {
    const get = await request("GET");
    await get.body?.cancel();
    expect(createReadStream).toHaveBeenCalledTimes(1);
    createReadStream.mockClear();

    const head = await request("HEAD");
    expect(head.status).toBe(200);
    expect(Object.fromEntries(head.headers)).toEqual(Object.fromEntries(get.headers));
    expect(head.headers.get("content-length")).toBe("1000");
    expect(head.body).toBeNull();
    expect(createReadStream).not.toHaveBeenCalled();
  });

  test("answers a ranged HEAD like a ranged GET", async () => {
    const head = await request("HEAD", { range: "bytes=0-99" });
    expect(head.status).toBe(206);
    expect(head.headers.get("content-range")).toBe("bytes 0-99/1000");
    expect(head.headers.get("content-length")).toBe("100");
    expect(head.body).toBeNull();
    expect(createReadStream).not.toHaveBeenCalled();
  });
});
