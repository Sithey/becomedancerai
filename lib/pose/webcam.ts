import { useEffect, useRef, useState, type RefObject } from "react";

export type WebcamStatus = "starting" | "ready" | "denied" | "busy" | "unavailable";

export function webcamErrorStatus(err: unknown): "denied" | "busy" | "unavailable" {
  const name = (err as { name?: unknown } | null)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  // Another app or tab holds the camera, or the OS blocked it.
  return name === "NotReadableError" || name === "AbortError" ? "busy" : "unavailable";
}

export function useWebcam(): { videoRef: RefObject<HTMLVideoElement | null>; status: WebcamStatus } {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<WebcamStatus>("starting");

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    async function start() {
      // mediaDevices is undefined outside a secure context (plain http on a LAN address).
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia is not available");
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" },
        audio: false,
      });
      if (cancelled) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = media;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = media;
      await video.play();
      if (!cancelled) setStatus("ready");
    }

    start().catch((err: unknown) => {
      if (!cancelled) setStatus(webcamErrorStatus(err));
    });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      // Also runs when Next hides the page (Activity): the camera starts again when it's shown again.
      setStatus("starting");
    };
  }, []);

  return { videoRef, status };
}
