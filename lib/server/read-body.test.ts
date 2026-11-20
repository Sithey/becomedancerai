import { expect, test } from "vitest";
import { readTextBody } from "./read-body";

function post(body: BodyInit, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api", { method: "POST", body, headers, duplex: "half" } as RequestInit);
}

function chunkedBody(chunks: string[]) {
  let pulls = 0;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = chunks[pulls++];
      if (next === undefined) controller.close();
      else controller.enqueue(encoder.encode(next));
    },
  });
  return { stream, pulls: () => pulls };
}

test("returns a body within the limit", async () => {
  await expect(readTextBody(post('{"a":"é"}'), 16)).resolves.toBe('{"a":"é"}');
});

test("refuses a declared Content-Length over the limit without reading the body", async () => {
  const body = chunkedBody(["{}"]);
  await expect(readTextBody(post(body.stream, { "content-length": "17" }), 16)).resolves.toBeNull();
  expect(body.pulls()).toBeLessThanOrEqual(1);
});

test("stops reading an undeclared body as soon as it passes the limit", async () => {
  const body = chunkedBody(Array.from({ length: 100 }, () => "xxxx"));
  await expect(readTextBody(post(body.stream), 16)).resolves.toBeNull();
  expect(body.pulls()).toBeLessThan(10);
});
