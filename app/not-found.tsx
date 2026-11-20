import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start gap-4 px-4 pt-10 pb-16 sm:px-8 sm:pt-14">
      <span className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">404</span>
      <h1 className="font-heading text-4xl font-bold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">This page doesn&apos;t exist, or the trend was removed.</p>
      <Link href="/" className={buttonVariants()}>
        Back to the library
      </Link>
    </main>
  );
}
