import { AddTrendForm } from "@/components/dance/add-trend-form";

export default function NewTrendPage() {
  return (
    <main className="mx-auto w-full flex min-h-screen max-w-xl flex-col gap-6 bg-background p-8 text-foreground">
      <h1 className="font-heading text-4xl font-bold tracking-tight">Add a trend</h1>
      <AddTrendForm />
    </main>
  );
}
