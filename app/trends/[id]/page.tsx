import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LearnView } from "@/components/dance/learn-view";
import { getTrend } from "@/lib/server/trends";

async function LearnLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  const trend = await getTrend(id);
  if (!trend) notFound();
  return (
    <>
      <h1 className="text-2xl font-semibold">{trend.title}</h1>
      <LearnView trend={trend} />
    </>
  );
}

export default function LearnPage({ params }: PageProps<"/trends/[id]">) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 bg-background p-8 text-foreground">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Library
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <LearnLoader params={params} />
      </Suspense>
    </main>
  );
}
