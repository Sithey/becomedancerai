import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { endTrendAdminSession, hasTrendAdminSession, startTrendAdminSession, trendAdminConfigured } from "@/lib/server/trend-admin";

async function signIn(formData: FormData) {
  "use server";
  const signedIn = await startTrendAdminSession(formData.get("key"));
  redirect(signedIn ? "/" : "/admin?error=1");
}

async function signOut() {
  "use server";
  await endTrendAdminSession();
  redirect("/admin");
}

async function AdminPanel({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  await connection();
  if (!trendAdminConfigured()) notFound();

  const [signedIn, { error }] = await Promise.all([hasTrendAdminSession(), searchParams]);
  if (signedIn) {
    return (
      <form action={signOut}>
        <p className="mb-4 text-muted-foreground">You’re signed in as a Library admin.</p>
        <Button type="submit" variant="outline" className="h-11">Sign out</Button>
      </form>
    );
  }

  return (
    <form action={signIn} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-key">Admin access key</Label>
        <Input
          id="admin-key"
          name="key"
          type="password"
          autoComplete="current-password"
          maxLength={64}
          required
          className="h-11"
        />
      </div>
      {error === "1" && <p role="alert" className="text-sm text-destructive">That access key is incorrect.</p>}
      <Button type="submit" className="h-11">Sign in</Button>
    </form>
  );
}

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-10">
      <Link href="/" className="self-start text-sm text-muted-foreground hover:text-foreground">← Library</Link>
      <h1 className="font-heading text-3xl font-bold tracking-tight">Library admin</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <AdminPanel searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
