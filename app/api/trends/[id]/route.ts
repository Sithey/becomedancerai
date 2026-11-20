import { canDeleteTrends } from "@/lib/server/trend-admin";
import { deleteTrend } from "@/lib/server/trends";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await canDeleteTrends(request))) return new Response(null, { status: 404 });
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
