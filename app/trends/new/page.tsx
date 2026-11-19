import { AddTrendForm } from "@/components/dance/add-trend-form";

export default function NewTrendPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 bg-background p-8 text-foreground">
      <h1 className="text-2xl font-semibold">Add a trend</h1>
      <AddTrendForm />
    </main>
  );
}
