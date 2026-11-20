import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PracticeSession } from "@/components/dance/practice-session";
import { StepTabs } from "@/components/dance/step-tabs";
import { getTrend } from "@/lib/server/trends";

async function RunLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  const trend = await getTrend(id);
  if (!trend) notFound();
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href={`/trends/${trend.id}`} className="text-sm text-muted-foreground hover:text-foreground">
            ← Learn
          </Link>
          <h1 className="font-heading text-4xl font-bold tracking-tight">{trend.title}</h1>
        </div>
        <StepTabs trendId={trend.id} current="run" />
      </div>
      <PracticeSession trend={trend} mode="full" />
    </>
  );
}

export default function RunPage({ params }: PageProps<"/trends/[id]/run">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-8 pt-7 pb-14">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <RunLoader params={params} />
      </Suspense>
    </main>
  );
}
