"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/dance/logo-mark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

const NAV = [
  { href: "/", label: "Library" },
  { href: "/viral", label: "Go viral" },
];

function isActive(href: string, pathname: string | null) {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" || (pathname.startsWith("/trends/") && pathname !== "/trends/new") : pathname.startsWith(href);
}

// Rendered as-is while prerendering (no active tab), then SiteHeader fills in the active tab.
export function HeaderBar({ pathname }: { pathname: string | null }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-8 sm:py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark className="size-7 text-primary" />
          <span className="font-heading text-xl font-bold tracking-tight">BecomeDancerAI</span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href, pathname) ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive(item.href, pathname) ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/trends/new" className={cn(buttonVariants(), "ml-2 h-11 rounded-full px-5")}>
            Add a trend
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteHeader() {
  return <HeaderBar pathname={usePathname()} />;
}
