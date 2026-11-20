import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listTrends } from "@/lib/server/trends";

function formatDuration(ms: number) {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

async function TrendsGrid() {
  await connection();
  const trends = await listTrends();
  if (trends.length === 0) {
    return <p className="text-muted-foreground">No trends yet. Add your first one.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {trends.map((trend) => (
        <Link key={trend.id} href={`/trends/${trend.id}`}>
          <Card className="transition-colors hover:bg-muted">
            <CardHeader>
              <CardTitle>{trend.title}</CardTitle>
              <CardDescription>
                {`${formatDuration(trend.durationMs)} · ${trend.moveCount} ${trend.moveCount === 1 ? "move" : "moves"}`}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full flex min-h-screen max-w-4xl flex-col gap-6 bg-background p-8 text-foreground">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Dance Tutor</h1>
        <Link href="/trends/new" className={buttonVariants()}>
          Add a trend
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <TrendsGrid />
      </Suspense>
    </main>
  );
}
