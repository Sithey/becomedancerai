import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PracticeSession } from "@/components/dance/practice-session";
import { StepTabs } from "@/components/dance/step-tabs";
import { getTrend } from "@/lib/server/trends";

async function PracticeLoader({ params }: { params: Promise<{ id: string }> }) {
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
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{trend.title}</h1>
        </div>
        <StepTabs trendId={trend.id} current="practice" />
      </div>
      <PracticeSession trend={trend} mode="moves" />
    </>
  );
}

export default function PracticePage({ params }: PageProps<"/trends/[id]/practice">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-3 pt-5 pb-14 sm:gap-6 sm:px-8 sm:pt-7">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <PracticeLoader params={params} />
      </Suspense>
    </main>
  );
}
