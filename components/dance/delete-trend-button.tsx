"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function DeleteTrendButton({
  id,
  title,
  inLibrary = false,
}: {
  id: string;
  title: string;
  inLibrary?: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const busy = deleting || refreshing;

  async function handleDelete() {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/trends/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete request failed");
      if (inLibrary) startTransition(() => router.refresh());
      else window.location.replace("/");
    } catch {
      setError("Could not delete the trend. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="destructive"
        size={inLibrary ? "icon-sm" : "default"}
        disabled={busy}
        aria-label={inLibrary ? `${busy ? "Deleting" : "Delete trend"} ${title}` : undefined}
        title={inLibrary ? "Delete trend" : undefined}
        onClick={handleDelete}
      >
        {inLibrary ? <Trash2 aria-hidden="true" /> : busy ? "Deleting…" : "Delete trend"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
