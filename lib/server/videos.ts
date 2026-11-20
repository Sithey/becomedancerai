import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// turbopackIgnore: otherwise the build traces the whole project for this dynamic path.
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads");

// The only gate between a URL segment and the filesystem: keep it strict.
export function isValidVideoFileName(name: string) {
  return /^[a-z0-9]+\.mp4$/.test(name);
}

export function videoFilePath(fileName: string) {
  return path.join(UPLOAD_DIR, fileName);
}

export async function saveVideo(fileName: string, file: File) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(videoFilePath(fileName), Buffer.from(await file.arrayBuffer()));
}

export async function deleteVideo(fileName: string) {
  if (!isValidVideoFileName(fileName)) throw new Error("Invalid video filename");
  await unlink(videoFilePath(fileName));
}
