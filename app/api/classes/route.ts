import { createClass, errorResponse, sameOrigin } from "@/lib/live/server";

export const runtime = "nodejs";

/** Teacher creates a Class Fight. Returns the join code and a teacher key (shown once, kept in the browser). */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await request.json().catch(() => ({}));
    const created = await createClass(String(body?.name ?? ""));
    return Response.json(created, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
