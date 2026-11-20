import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LearnView } from "@/components/dance/learn-view";
import { StepTabs } from "@/components/dance/step-tabs";
import { formatDuration } from "@/components/dance/trend-card";
import { getTrend } from "@/lib/server/trends";

async function LearnLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  const trend = await getTrend(id);
  if (!trend) notFound();
  const moves = `${trend.moves.length} ${trend.moves.length === 1 ? "move" : "moves"}`;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Library
          </Link>
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">{trend.title}</h1>
          <span className="text-muted-foreground">{`${formatDuration(trend.durationMs)} · ${moves} · Learn one move at a time`}</span>
        </div>
        <StepTabs trendId={trend.id} current="learn" />
      </div>
      <LearnView trend={trend} />
    </>
  );
}

export default function LearnPage({ params }: PageProps<"/trends/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 pt-6 pb-16 sm:px-8 sm:pt-8">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <LearnLoader params={params} />
      </Suspense>
    </main>
  );
}
