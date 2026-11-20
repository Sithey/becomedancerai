import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { attemptFileName, debugEnabled } from "./debug-attempts";

const DATE = new Date(2026, 10, 20, 2, 15, 3);

describe("attemptFileName", () => {
  test("joins trend, move and local time", () => {
    expect(attemptFileName("ab56605c0e5790cc4ce2447b", "move1", DATE)).toBe(
      "ab56605c0e5790cc4ce2447b-move1-20261120-021503.json",
    );
  });

  test("can't escape the attempts folder", () => {
    const name = attemptFileName("../../etc", "Full Run", DATE);
    expect(name.startsWith("etc-full-run-")).toBe(true);
    expect(name).not.toContain("/");
    expect(name).not.toContain("..");
  });

  test("keeps each name part to 40 characters", () => {
    expect(attemptFileName("a".repeat(300), "b".repeat(300), DATE)).toBe(
      `${"a".repeat(40)}-${"b".repeat(40)}-20261120-021503.json`,
    );
  });
});

describe("POST /api/debug-attempts", () => {
  let cwd: string;

  beforeEach(async () => {
    vi.resetModules();
    cwd = await mkdtemp(join(tmpdir(), "dance-debug-"));
    vi.spyOn(process, "cwd").mockReturnValue(cwd);
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await rm(cwd, { recursive: true, force: true });
  });

  test("refuses a body over 20 MB without saving it", async () => {
    const { POST } = await import("@/app/api/debug-attempts/route");
    const response = await POST(
      new Request("http://localhost/api/debug-attempts", {
        method: "POST",
        body: JSON.stringify({ trendId: "t", move: "m" }),
        headers: { "content-length": String(20 * 1024 * 1024 + 1) },
      }),
    );
    expect(response.status).toBe(413);
    await expect(readdir(cwd)).resolves.toEqual([]);
  });
});

describe("debugEnabled", () => {
  afterEach(() => vi.unstubAllEnvs());

  test("is off outside dev", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(debugEnabled()).toBe(false);
  });

  test("is on in dev", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(debugEnabled()).toBe(true);
  });
});
