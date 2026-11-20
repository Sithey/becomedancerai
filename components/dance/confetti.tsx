"use client";

import { useEffect, useRef } from "react";

// Colors sampled from the app theme variables at runtime.
function themeConfettiColors(): string[] {
  const style = getComputedStyle(document.documentElement);
  const get = (v: string) => style.getPropertyValue(v).trim();
  // Pick a vivid palette from the theme: primary, destructive, ring, and two charts.
  return [
    get("--primary") || "oklch(0.205 0 0)",
    get("--destructive") || "oklch(0.577 0.245 27.325)",
    get("--ring") || "oklch(0.708 0 0)",
    get("--chart-1") || "oklch(0.87 0 0)",
    get("--chart-2") || "oklch(0.556 0 0)",
  ];
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  w: number;
  h: number;
  color: string;
  opacity: number;
};

const PARTICLE_COUNT = 140;
const DURATION_MS = 3500;
const FADE_MS = 800;

function makeParticle(colors: string[], canvasW: number): Particle {
  return {
    x: Math.random() * canvasW,
    y: -10 - Math.random() * 60,
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 3,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.2,
    w: 8 + Math.random() * 8,
    h: 4 + Math.random() * 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    opacity: 1,
  };
}

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = themeConfettiColors();
    const startTime = performance.now();
    let raf = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () =>
      makeParticle(colors, canvas.width),
    );

    const draw = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed > DURATION_MS) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Global fade-out in the last FADE_MS
      const globalAlpha =
        elapsed > DURATION_MS - FADE_MS
          ? 1 - (elapsed - (DURATION_MS - FADE_MS)) / FADE_MS
          : 1;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.07; // gravity
        p.angle += p.spin;

        // Wrap at bottom back to top
        if (p.y > canvas.height + 20) {
          Object.assign(p, makeParticle(colors, canvas.width));
        }

        ctx.save();
        ctx.globalAlpha = globalAlpha * p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      aria-hidden
    />
  );
}
