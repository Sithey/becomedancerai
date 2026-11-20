import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PracticeSession } from "@/components/dance/practice-session";
import { getTrend } from "@/lib/server/trends";

async function PracticeLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  const trend = await getTrend(id);
  if (!trend) notFound();
  return (
    <>
      <Link href={`/trends/${trend.id}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Learn
      </Link>
      <h1 className="text-2xl font-semibold">{`${trend.title} · Practice`}</h1>
      <PracticeSession trend={trend} mode="moves" />
    </>
  );
}

export default function PracticePage({ params }: PageProps<"/trends/[id]/practice">) {
  return (
    <main className="mx-auto w-full flex min-h-screen max-w-5xl flex-col gap-6 bg-background p-8 text-foreground">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <PracticeLoader params={params} />
      </Suspense>
    </main>
  );
}
