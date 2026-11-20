import { describe, expect, it } from "vitest";
import { seekTo } from "./extract";

class FakeVideo extends EventTarget {
  currentTime = 0;
  error: { code: number } | null = null;
}

const asVideo = (fake: FakeVideo) => fake as unknown as HTMLVideoElement;

describe("seekTo", () => {
  it("resolves once the seek lands", async () => {
    const video = new FakeVideo();
    const seek = seekTo(asVideo(video), 1.5);
    expect(video.currentTime).toBe(1.5);
    video.dispatchEvent(new Event("seeked"));
    await expect(seek).resolves.toBeUndefined();
  });

  it("rejects when the video fails to decode during the seek", async () => {
    const video = new FakeVideo();
    const seek = seekTo(asVideo(video), 2);
    video.dispatchEvent(new Event("error"));
    await expect(seek).rejects.toThrow("Could not read this video");
  });

  it("rejects right away on a video already in error", async () => {
    const video = new FakeVideo();
    video.error = { code: 3 };
    await expect(seekTo(asVideo(video), 2)).rejects.toThrow("Could not read this video");
  });

  it("rejects with an AbortError when aborted during a pending seek", async () => {
    const video = new FakeVideo();
    const controller = new AbortController();
    const seek = seekTo(asVideo(video), 2, controller.signal);
    controller.abort();
    await expect(seek).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects without seeking when already aborted", async () => {
    const video = new FakeVideo();
    const controller = new AbortController();
    controller.abort();
    await expect(seekTo(asVideo(video), 2, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(video.currentTime).toBe(0);
  });
});
