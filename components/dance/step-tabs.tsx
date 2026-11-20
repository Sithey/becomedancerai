import Link from "next/link";
import { cn } from "cn";

type Step = "learn" | "practice" | "run";

const STEPS: { step: Step; label: string; path: string }[] = [
  { step: "learn", label: "1 · Learn", path: "" },
  { step: "practice", label: "2 · Practice", path: "/practice" },
  { step: "run", label: "3 · Full run", path: "/run" },
];

export function StepTabs({ trendId, current }: { trendId: string; current: Step }) {
  return (
    <nav aria-label="Steps" className="flex gap-1.5 rounded-full border border-border bg-card p-1.5">
      {STEPS.map(({ step, label, path }) => (
        <Link
          key={step}
          href={`/trends/${trendId}${path}`}
          aria-current={step === current ? "step" : undefined}
          className={cn(
            "rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
            step === current ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
