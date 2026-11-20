import Link from "next/link";
import { cn } from "cn";

type Step = "learn" | "practice" | "run";

const STEPS: { step: Step; label: string; path: string }[] = [
  { step: "learn", label: "1 · Learn", path: "" },
  { step: "practice", label: "2 · Practice", path: "/practice" },
  { step: "run", label: "3 · Full run", path: "/run" },
];

const TAB = "rounded-full px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors sm:px-4";

export function StepTabs({ trendId, current }: { trendId: string; current: Step }) {
  return (
    <nav aria-label="Steps" className="flex gap-1.5 rounded-full border border-border bg-card p-1.5">
      {STEPS.map(({ step, label, path }) =>
        // Text, not a link: a same-URL navigation would refetch the page for nothing.
        step === current ? (
          <span key={step} aria-current="step" className={cn(TAB, "bg-primary font-semibold text-primary-foreground")}>
            {label}
          </span>
        ) : (
          <Link
            key={step}
            href={`/trends/${trendId}${path}`}
            className={cn(TAB, "text-muted-foreground hover:text-foreground")}
          >
            {label}
          </Link>
        ),
      )}
    </nav>
  );
}
