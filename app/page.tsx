import { connection } from "next/server";
import { Suspense } from "react";
import { AddTrendCard, TrendCard } from "@/components/dance/trend-card";
import { debugEnabled } from "@/lib/server/debug-attempts";
import { listTrends } from "@/lib/server/trends";

const STEPS = ["Learn", "Practice", "Full run"];

async function TrendsGrid() {
  await connection();
  const trends = await listTrends();
  const canDelete = debugEnabled();
  return (
    <section aria-labelledby="trends-title" className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="trends-title" className="font-heading text-2xl font-semibold tracking-tight">
          Trends
        </h2>
        <span className="text-sm text-muted-foreground">{`${trends.length} ${trends.length === 1 ? "trend" : "trends"}`}</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] sm:gap-5">
        {trends.map((trend) => (
          <TrendCard key={trend.id} trend={trend} canDelete={canDelete} />
        ))}
        <AddTrendCard empty={trends.length === 0} />
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pt-10 pb-16 sm:gap-14 sm:px-8 sm:pt-14 sm:pb-18">
      <section className="flex flex-wrap items-end justify-between gap-8">
        <div className="flex max-w-2xl flex-col gap-4">
          <span className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">Your dance tutor</span>
          <h1 className="font-heading text-4xl leading-[1.02] font-bold tracking-tight sm:text-6xl">
            Learn any TikTok dance, move by move.
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Upload a trend, learn it in short loops, then let your camera check every move before you post.
          </p>
        </div>
        <ol aria-label="How it works" className="flex flex-wrap gap-3">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-2.5 rounded-[0.875rem] border border-border bg-card px-4 py-3 text-sm">
              <span className="font-heading font-bold text-primary">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <TrendsGrid />
      </Suspense>
    </main>
  );
}
