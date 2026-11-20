import { cn } from "cn";

// Centered in the middle of the panel, where the 16:9 webcam shows through its 9:16 crop.
export function GhostOutline({ visible }: { visible: boolean }) {
  return (
    <svg
      viewBox="0 0 100 200"
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 top-1/2 h-[60%] -translate-x-1/2 -translate-y-1/2 text-primary/40 transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <g fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <circle cx="50" cy="16" r="12" />
        <path d="M34 36 H66 L74 100 H26 Z" />
        <path d="M26 100 H74 L66 196 H54 L50 120 L46 196 H34 Z" />
        <path d="M34 38 L14 100 L22 104 L40 48 Z" />
        <path d="M66 38 L86 100 L78 104 L60 48 Z" />
      </g>
    </svg>
  );
}
