import { afterEach, describe, expect, test, vi } from "vitest";
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
