import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { debugEnabled } from "./debug-attempts";

const COOKIE_NAME = "__Host-trend-admin";
const SESSION_SECONDS = 60 * 60;
const HEX_KEY = /^[0-9a-f]{64}$/;
const cookieOptions = { secure: true, httpOnly: true, sameSite: "strict", path: "/" } as const;

function adminKey() {
  const key = process.env.TREND_ADMIN_KEY;
  return key && HEX_KEY.test(key) ? key : undefined;
}

export function trendAdminConfigured() {
  return adminKey() !== undefined;
}

function sessionSignature(key: string, expiresAt: string) {
  return createHmac("sha256", Buffer.from(key, "hex"))
    .update(`trend-admin:${expiresAt}`)
    .digest();
}

export async function startTrendAdminSession(candidate: unknown) {
  const key = adminKey();
  if (!key || typeof candidate !== "string" || !HEX_KEY.test(candidate)) return false;
  if (!timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(key, "hex"))) return false;

  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const signature = sessionSignature(key, expiresAt).toString("hex");
  (await cookies()).set(COOKIE_NAME, `${expiresAt}.${signature}`, { ...cookieOptions, maxAge: SESSION_SECONDS });
  return true;
}

export async function endTrendAdminSession() {
  (await cookies()).set(COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });
}

export async function hasTrendAdminSession() {
  const key = adminKey();
  if (!key) return false;

  const value = (await cookies()).get(COOKIE_NAME)?.value ?? "";
  const session = /^([0-9]{1,12})\.([0-9a-f]{64})$/.exec(value);
  if (!session) return false;

  const [, expiresAt, signature] = session;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  return timingSafeEqual(Buffer.from(signature, "hex"), sessionSignature(key, expiresAt));
}

export async function canDeleteTrends(request?: Request) {
  if (debugEnabled()) return true;
  if (request && request.headers.get("sec-fetch-site") !== "same-origin") return false;
  return hasTrendAdminSession();
}
