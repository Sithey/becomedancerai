import { createTrend } from "@/lib/server/trends";
import { parseNewTrend } from "@/lib/server/validate-trend";

export async function POST(request: Request) {
  try {
    const parsed = parseNewTrend(await request.formData());
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const { id } = await createTrend(parsed.value, parsed.video);
    return Response.json({ id }, { status: 201 });
  } catch {
    return Response.json({ error: "Could not save the trend" }, { status: 500 });
  }
}
