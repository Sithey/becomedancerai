"use client";

import { useEffect, useState } from "react";

type Props = {
  onDone: () => void;
};

function playBeep(freq: number, duration = 0.08) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    ctx.resume().then(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    });
  } catch {
    // Ignore audio errors if audio context is blocked
  }
}

const STEP_MS = 750;

export function CountIn({ onDone }: Props) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    // Step 3
    playBeep(520);

    const t2 = setTimeout(() => {
      setCount(2);
      playBeep(520);
    }, STEP_MS);

    const t1 = setTimeout(() => {
      setCount(1);
      playBeep(880);
    }, STEP_MS * 2);

    const tDone = setTimeout(() => {
      onDone();
    }, STEP_MS * 3);

    return () => {
      clearTimeout(t2);
      clearTimeout(t1);
      clearTimeout(tDone);
    };
  }, [onDone]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-[2px]">
      <span
        key={count}
        className="animate-in zoom-in-75 text-8xl font-black text-primary drop-shadow-lg select-none duration-200 sm:text-9xl"
      >
        {count}
      </span>
    </div>
  );
}
