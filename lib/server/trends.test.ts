import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const transaction = vi.hoisted(() => vi.fn());
vi.mock("./db", () => ({ db: { $transaction: transaction } }));

const id = "trend1";
const videoFile = "trend1.mp4";
const video = Buffer.from("test video");
const rows = new Map<string, { videoFile: string }>();
let uploads: string;
let commitError: Error | undefined;

type Transaction = {
  trend: { delete: (query: { where: { id: string } }) => Promise<{ videoFile: string }> };
};

beforeEach(async () => {
  vi.resetModules();
  uploads = await mkdtemp(join(tmpdir(), "dance-trend-delete-"));
  vi.stubEnv("UPLOAD_DIR", uploads);
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
  await rm(uploads, { recursive: true, force: true });
});

async function requestDelete(trendId: string) {
  const { DELETE } = await import("@/app/api/trends/[id]/route");
  return DELETE(new Request(`http://localhost/api/trends/${trendId}`, { method: "DELETE" }), {
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

test("returns an error and keeps the row if the local file is missing", async () => {
  const response = await requestDelete(id);

  expect(response.status).toBe(500);
  await expect(response.json()).resolves.toEqual({ error: "Could not delete the trend" });
  expect(rows.has(id)).toBe(true);
});

test("restores the file when the row deletion fails to commit", async () => {
  const path = join(uploads, videoFile);
  await writeFile(path, video);
  commitError = new Error("Commit failed");

  expect((await requestDelete(id)).status).toBe(500);
  expect(rows.has(id)).toBe(true);
  await expect(readFile(path)).resolves.toEqual(video);
});
