import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DebugSession } from "@/components/dance/debug-session";
import { getTrend, listTrends } from "@/lib/server/trends";

async function DebugLoader({ searchParams }: { searchParams: PageProps<"/debug">["searchParams"] }) {
  const { trend: raw } = await searchParams;
  await connection();
  const id = typeof raw === "string" ? raw : undefined;
  const [trends, trend] = await Promise.all([listTrends(), id ? getTrend(id) : null]);
  return <DebugSession trends={trends} trend={trend} />;
}

// Dev-only tool to tune the scoring with real attempts: it doesn't exist in production builds.
export default function DebugPage({ searchParams }: PageProps<"/debug">) {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 bg-background p-8 text-foreground">
      <h1 className="text-2xl font-semibold">Debug · scoring</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <DebugLoader searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
