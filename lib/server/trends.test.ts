import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const transaction = vi.hoisted(() => vi.fn());
const count = vi.hoisted(() => vi.fn());
const cookieStore = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("./db", () => ({ db: { $transaction: transaction, trend: { count } } }));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const id = "trend1";
const videoFile = "trend1.mp4";
const video = Buffer.from("test video");
const testAdminKey = "5a".repeat(32);
const rows = new Map<string, { videoFile: string }>();
let uploads: string;
let commitError: Error | undefined;
let logError: ReturnType<typeof vi.spyOn>;

type Transaction = {
  trend: { delete: (query: { where: { id: string } }) => Promise<{ videoFile: string }> };
};

beforeEach(async () => {
  vi.resetModules();
  uploads = await mkdtemp(join(tmpdir(), "dance-trend-delete-"));
  vi.stubEnv("UPLOAD_DIR", uploads);
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("TREND_ADMIN_KEY", undefined);
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
  logError = vi.spyOn(console, "error").mockImplementation(() => {});
  rows.clear();
  rows.set(id, { videoFile });
  commitError = undefined;

  transaction.mockImplementation(async (run: (tx: Transaction) => Promise<void>) => {
    const pending = new Map(rows);
    await run({
      trend: {
        delete: async ({ where }) => {
          const row = pending.get(where.id);
          if (!row) {
            throw new Prisma.PrismaClientKnownRequestError("Trend not found", {
              code: "P2025",
              clientVersion: Prisma.prismaVersion.client,
            });
          }
          pending.delete(where.id);
          return row;
        },
      },
    });
    if (commitError) throw commitError;
    rows.clear();
    for (const [key, row] of pending) rows.set(key, row);
  });
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  count.mockReset();
  await rm(uploads, { recursive: true, force: true });
});

async function requestDelete(trendId: string, site?: string) {
  const { DELETE } = await import("@/app/api/trends/[id]/route");
  return DELETE(new Request(`http://localhost/api/trends/${trendId}`, {
    method: "DELETE",
    headers: site ? { "sec-fetch-site": site } : {},
  }), {
    params: Promise.resolve({ id: trendId }),
  });
}

test("deletes the row and its video, then returns 204", async () => {
  const path = join(uploads, videoFile);
  await writeFile(path, video);

  expect((await requestDelete(id)).status).toBe(204);
  expect(rows.has(id)).toBe(false);
  await expect(readFile(path)).rejects.toMatchObject({ code: "ENOENT" });
});

test("returns false for an unknown trend and maps it to 404", async () => {
  const { deleteTrend } = await import("./trends");
  await expect(deleteTrend("unknown")).resolves.toBe(false);
  expect((await requestDelete("unknown")).status).toBe(404);
  expect(rows.has(id)).toBe(true);
});

test("deletes the row even if its video file is already gone", async () => {
  expect((await requestDelete(id)).status).toBe(204);
  expect(rows.has(id)).toBe(false);
});

test("production deletion requires a signed-in admin even when a key is configured", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("TREND_ADMIN_KEY", testAdminKey);
  await writeFile(join(uploads, videoFile), video);

  expect((await requestDelete(id, "same-origin")).status).toBe(404);
  expect(transaction).not.toHaveBeenCalled();
  expect(rows.has(id)).toBe(true);
});

test("a production admin can delete from the app after signing in", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("TREND_ADMIN_KEY", testAdminKey);
  const { startTrendAdminSession } = await import("./trend-admin");
  expect(await startTrendAdminSession("ab".repeat(32))).toBe(false);
  expect(cookieStore.set).not.toHaveBeenCalled();

  expect(await startTrendAdminSession(testAdminKey)).toBe(true);
  const [name, value, options] = cookieStore.set.mock.calls[0];
  expect(name).toBe("__Host-trend-admin");
  expect(options).toMatchObject({ secure: true, httpOnly: true, sameSite: "strict", path: "/", maxAge: 3600 });
  cookieStore.get.mockReturnValue({ value });

  expect((await requestDelete(id, "same-site")).status).toBe(404);
  expect((await requestDelete(id)).status).toBe(404);
  expect(transaction).not.toHaveBeenCalled();
  expect((await requestDelete(id, "same-origin")).status).toBe(204);
});

test("invalid, expired and rotated admin sessions cannot authorize deletion", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("TREND_ADMIN_KEY", testAdminKey);
  const { startTrendAdminSession } = await import("./trend-admin");
  const now = Date.now();
  const clock = vi.spyOn(Date, "now").mockReturnValue(now);
  await startTrendAdminSession(testAdminKey);
  const [, value] = cookieStore.set.mock.calls[0];
  cookieStore.get.mockReturnValue({ value: `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}` });
  expect((await requestDelete(id, "same-origin")).status).toBe(404);

  cookieStore.get.mockReturnValue({ value });
  clock.mockReturnValue(now + 3600_000);
  expect((await requestDelete(id, "same-origin")).status).toBe(404);

  clock.mockReturnValue(now);
  vi.stubEnv("TREND_ADMIN_KEY", "7b".repeat(32));
  expect((await requestDelete(id, "same-origin")).status).toBe(404);
  expect(transaction).not.toHaveBeenCalled();
});

test("restores the file when the row deletion fails to commit, and logs why", async () => {
  const path = join(uploads, videoFile);
  await writeFile(path, video);
  commitError = new Error("Commit failed");

  const response = await requestDelete(id);
  expect(response.status).toBe(500);
  await expect(response.json()).resolves.toEqual({ error: "Could not delete the trend" });
  expect(rows.has(id)).toBe(true);
  await expect(readFile(path)).resolves.toEqual(video);
  expect(logError).toHaveBeenCalledWith("[api/trends/[id]]", commitError);
});

function upload(body: BodyInit) {
  return new Request("http://localhost/api/trends", {
    method: "POST",
    body,
    headers: { "content-length": "4096" },
  });
}

function trendForm() {
  const pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, v: 1 }));
  const fields: Record<string, string | File> = {
    video: new File([Buffer.from("000000186674797069736f6d00000000", "hex")], "a.mp4", { type: "video/mp4" }),
    title: "Renegade",
    width: "320",
    height: "568",
    durationMs: "1000",
    sampleMs: "50",
    poses: JSON.stringify(Array.from({ length: 20 }, (_, i) => ({ t: i * 50, pose }))),
    moves: JSON.stringify([{ startMs: 0, endMs: 1000 }]),
  };
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return form;
}

test("POST answers 400 to a body that isn't a form", async () => {
  const { POST } = await import("@/app/api/trends/route");
  const response = await POST(upload("not a form"));
  expect(response.status).toBe(400);
  expect(logError).not.toHaveBeenCalled();
});

test("POST logs an unexpected error and returns a generic message", async () => {
  const dbError = new Error("Database unreachable");
  count.mockRejectedValue(dbError);
  const { POST } = await import("@/app/api/trends/route");
  const response = await POST(upload(trendForm()));
  expect(response.status).toBe(500);
  await expect(response.json()).resolves.toEqual({ error: "Could not save the trend" });
  expect(logError).toHaveBeenCalledWith("[api/trends]", dbError);
});
