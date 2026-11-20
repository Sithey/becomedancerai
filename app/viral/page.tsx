import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const TIPS = [
  {
    number: "01",
    title: "Hook in the first second",
    description:
      "Don't waste time getting into position or walking toward the camera. Start right on the first beat so viewers don't scroll away.",
  },
  {
    number: "02",
    title: "Use the official trending sound",
    description:
      "Always attach the exact trending audio track in the app, even if you keep your original recording audio. Algorithms prioritize videos using the active sound.",
  },
  {
    number: "03",
    title: "Film vertical with great lighting",
    description:
      "Shoot in 9:16 vertical mode. Position light in front of you (like a window or ring light) rather than behind you to keep your silhouette sharp.",
  },
  {
    number: "04",
    title: "Show your entire body",
    description:
      "Step back so your feet, hands, and head stay inside the frame throughout every move. Viewers want to see the full footwork and body angles.",
  },
  {
    number: "05",
    title: "Post when audiences are active",
    description:
      "Peak engagement for dance trends is usually during evening hours (18:00–21:00) and weekends. Check your analytics to see when your viewers are online.",
  },
  {
    number: "06",
    title: "Use specific trend hashtags",
    description:
      "Combine 3–5 tags: the specific dance challenge name, the artist or song tag, and broad tags like #dance and #fyp.",
  },
  {
    number: "07",
    title: "Ask a question in your caption",
    description:
      "Drive comment section activity with an engaging hook: 'Which move was hardest?' or 'Rate this 1–10'. High comment ratios boost video distribution.",
  },
  {
    number: "08",
    title: "Reply quickly to early comments",
    description:
      "Respond to comments within the first 30 to 60 minutes of posting. This doubles your engagement signals and encourages more discussion.",
  },
  {
    number: "09",
    title: "Duet or Stitch the original creator",
    description:
      "Duet side-by-side with the creator who started the trend. Fans of the original dancer are much more likely to watch and share your cover.",
  },
];

export default function ViralPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 bg-background px-4 pt-10 pb-16 text-foreground sm:px-8 sm:pt-14">
      <div className="flex items-center justify-between">
        <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
          ← Library
        </Link>
        <Link href="/trends/new" className={buttonVariants({ size: "sm" })}>
          Add a trend
        </Link>
      </div>

      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-4xl font-bold tracking-tight">How to Go Viral</h1>
        <p className="text-muted-foreground text-base">
          You learned the moves. Here is how to film, package, and post your dance video so it
          reaches the FYP.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TIPS.map((tip) => (
          <Card key={tip.number} className="flex flex-col justify-between">
            <CardHeader>
              <span className="text-muted-foreground font-mono text-xs font-semibold tracking-wider">
                TIP {tip.number}
              </span>
              <CardTitle className="text-lg font-semibold">{tip.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">
                {tip.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
