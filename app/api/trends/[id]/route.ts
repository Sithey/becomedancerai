import { debugEnabled } from "@/lib/server/debug-attempts";
import { deleteTrend } from "@/lib/server/trends";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // The site is public with no accounts: anyone could empty the library. Deleting is a dev tool.
  if (!debugEnabled()) return new Response(null, { status: 404 });
  const { id } = await params;
  try {
    if (!(await deleteTrend(id))) {
      return Response.json({ error: "Trend not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[api/trends/[id]]", error);
    return Response.json({ error: "Could not delete the trend" }, { status: 500 });
  }
}
