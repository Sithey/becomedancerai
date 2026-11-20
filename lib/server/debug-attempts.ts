import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// turbopackIgnore: otherwise the build traces the whole project for this dynamic path.
export const ATTEMPTS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "debug-attempts");

export function debugEnabled() {
  return process.env.NODE_ENV === "development";
}

// Names come from the request body: keep only [a-z0-9-] so a file can't land outside ATTEMPTS_DIR,
// and cap the length so the file name stays under the filesystem limit.
function safe(part: string) {
  return (
    part
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40)
      .replace(/^-+|-+$/g, "") || "x"
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

export function attemptFileName(trendId: string, move: string, date: Date) {
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${safe(trendId)}-${safe(move)}-${day}-${time}.json`;
}

export async function saveAttempt(name: string, json: string) {
  await mkdir(ATTEMPTS_DIR, { recursive: true });
  await writeFile(path.join(ATTEMPTS_DIR, name), json);
}
