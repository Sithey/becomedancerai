import { deleteTrend } from "@/lib/server/trends";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    if (!(await deleteTrend(id))) {
      return Response.json({ error: "Trend not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Could not delete the trend" }, { status: 500 });
  }
}
