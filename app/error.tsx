"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start gap-4 px-4 pt-10 pb-16 sm:px-8 sm:pt-14">
      <span className="text-xs font-semibold tracking-[0.12em] text-destructive uppercase">Something broke</span>
      <h1 className="font-heading text-4xl font-bold tracking-tight">That didn&apos;t work</h1>
      <p className="text-muted-foreground">Something went wrong on our side. Try again, or head back to the library.</p>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to the library
        </Link>
      </div>
    </main>
  );
}
